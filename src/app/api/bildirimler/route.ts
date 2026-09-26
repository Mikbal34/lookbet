import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/prisma";

// Oturumdaki kullanıcının bildirim kutusu (acente panelindeki zil). Her rol
// kullanabilir; sorgular her zaman session.user.id ile sınırlı. Başkasının
// bildirimi okunamaz, işaretlenemez; varlığı da sızmaz (404).
//
// GET   ?limit=1..50 (varsayılan 20) &page=1..
//       → { bildirimler, okunmamis, pagination: { page, totalPages } }
// PATCH { id } tek bildirimi, { hepsi: true } tümünü okundu yapar.

const ALANLAR = { id: true, type: true, title: true, message: true, isRead: true, createdAt: true } as const;

/** Sayı değilse varsayılan; sınır dışındaysa sınıra çekilir. */
function tamSayi(v: string | null, varsayilan: number, en: number, enFazla: number) {
  const n = Number.parseInt(v ?? "", 10);
  return Math.min(enFazla, Math.max(en, Number.isFinite(n) ? n : varsayilan));
}

// İkisi birden gelirse belirsiz: katı nesneler reddeder.
const okunduSemasi = z.union([
  z.strictObject({ id: z.string().trim().min(1).max(64) }),
  z.strictObject({ hepsi: z.literal(true) }),
]);

export async function GET(req: NextRequest) {
  try {
    const oturum = await getServerSession(authOptions);
    if (!oturum?.user?.id) {
      return NextResponse.json({ error: "Bu işlem için giriş yapmanız gerekiyor" }, { status: 401 });
    }
    const userId = oturum.user.id;
    const sp = req.nextUrl.searchParams;
    const limit = tamSayi(sp.get("limit"), 20, 1, 50);
    const page = tamSayi(sp.get("page"), 1, 1, 100_000);

    const [bildirimler, toplam, okunmamis] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        // Aynı anda yazılanlarda sayfalar kaymasın: id ikinci anahtar.
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
        select: ALANLAR,
      }),
      prisma.notification.count({ where: { userId } }),
      prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return NextResponse.json({ bildirimler, okunmamis, pagination: { page, totalPages: Math.ceil(toplam / limit) } });
  } catch (error) {
    console.error("[BILDIRIMLER_GET]", error);
    return NextResponse.json({ error: "Bildirimler alınamadı" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const oturum = await getServerSession(authOptions);
    if (!oturum?.user?.id) {
      return NextResponse.json({ error: "Bu işlem için giriş yapmanız gerekiyor" }, { status: 401 });
    }
    const userId = oturum.user.id;

    const parsed = okunduSemasi.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "{ id } ya da { hepsi: true } gönder", details: z.flattenError(parsed.error) }, { status: 400 });
    }

    if ("hepsi" in parsed.data) {
      const { count } = await prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
      return NextResponse.json({ guncellenen: count });
    }

    // Kullanıcıya ait değilse eşleşme olmaz: 404 (okunmuşsa yine 200).
    const { count } = await prisma.notification.updateMany({ where: { id: parsed.data.id, userId }, data: { isRead: true } });
    if (!count) return NextResponse.json({ error: "Bildirim bulunamadı" }, { status: 404 });
    return NextResponse.json({ guncellenen: count });
  } catch (error) {
    console.error("[BILDIRIMLER_PATCH]", error);
    return NextResponse.json({ error: "Bildirim güncellenemedi" }, { status: 500 });
  }
}
