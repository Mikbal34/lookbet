import { getTranslations } from "next-intl/server";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/prisma";

// Hesaba bağlı favoriler (kalp). Girişsiz kullanıcının favorileri cihazda
// (localStorage) durur; girişte buraya eklenir (bkz. components/lb/favoriler).
//
// GET    /api/favoriler          — { kodlar }: otel kodları, en yeni başta
// POST   /api/favoriler          — { kodlar: string[] } ekler; zaten olan atlanır
// DELETE /api/favoriler?kod=XXX  — bir oteli çıkarır
// Yazan istekler de güncel { kodlar } döner: istemci önbelleğini bununla
// günceller, ayrıca liste istemez.

// Oturuma bağlı liste: hiçbir katmanda önbelleğe alınmasın.
export const dynamic = "force-dynamic";

/** Hesap başına üst sınır (kötüye kullanıma karşı; normal kullanım çok altında). */
const EN_FAZLA = 500;

const kodSemasi = z
  .string({ error: "Otel kodu geçersiz" })
  .trim()
  .min(1, "Otel kodu gerekli")
  .max(50, "Otel kodu geçersiz");

const ekleSemasi = z.object(
  {
    kodlar: z
      .array(kodSemasi, { error: "Otel kodları gerekli" })
      .min(1, "Otel kodları gerekli")
      .max(200, "Tek seferde en fazla 200 otel eklenebilir"),
  },
  { error: "Geçersiz istek" }
);

const girisGerekli = (t: (k: "genel.girisGerekli") => string) => NextResponse.json({ error: t("genel.girisGerekli") }, { status: 401 });

async function oturumdakiKullanici() {
  const session = await getServerSession(authOptions);
  // id boş gelirse Prisma koşulu yok sayar (bütün kullanıcıların favorileri):
  // oturum yokmuş gibi davran.
  return session?.user?.id || null;
}

/** Kullanıcının favori otel kodları, en yeni başta. */
async function liste(userId: string) {
  const satirlar = await prisma.favorite.findMany({
    where: { userId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { hotelCode: true },
  });
  return satirlar.map((f) => f.hotelCode);
}

export async function GET() {
  const t = await getTranslations("api");
  const userId = await oturumdakiKullanici();
  if (!userId) return girisGerekli(t);
  try {
    return NextResponse.json({ kodlar: await liste(userId) });
  } catch (error) {
    console.error("[GET /api/favoriler]", error);
    return NextResponse.json({ error: t("favori.alinamadi") }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const t = await getTranslations("api");
  const userId = await oturumdakiKullanici();
  if (!userId) return girisGerekli(t);
  const parsed = ekleSemasi.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: t("genel.gecersizIstek") }, { status: 400 });
  }
  const istenen = [...new Set(parsed.data.kodlar)];
  try {
    // Yalnız katalogdaki oteller: istemciden gelen rastgele dizeler saklanmasın.
    const [katalog, zatenVar, toplam] = await Promise.all([
      prisma.hotel.findMany({ where: { hotelCode: { in: istenen } }, select: { hotelCode: true } }),
      prisma.favorite.findMany({ where: { userId, hotelCode: { in: istenen } }, select: { hotelCode: true } }),
      prisma.favorite.count({ where: { userId } }),
    ]);
    const katalogda = new Set(katalog.map((o) => o.hotelCode));
    const eklenmis = new Set(zatenVar.map((f) => f.hotelCode));
    const yeni = istenen.filter((k) => katalogda.has(k) && !eklenmis.has(k));
    if (toplam + yeni.length > EN_FAZLA) {
      return NextResponse.json({ error: `Favorilerine en fazla ${EN_FAZLA} otel ekleyebilirsin` }, { status: 422 });
    }
    if (yeni.length) {
      // Sıra korunsun: dizideki son kod en yeni sayılır (cihazdaki liste
      // eskiden yeniye). Varsayılan now() tek sorguda hepsine aynı anı verirdi.
      const simdi = Date.now();
      await prisma.favorite.createMany({
        data: yeni.map((hotelCode, i) => ({ userId, hotelCode, createdAt: new Date(simdi - (yeni.length - 1 - i)) })),
        // Aynı anda gelen iki istek (iki sekmede birleştirme) çakışmasın.
        skipDuplicates: true,
      });
    }
    return NextResponse.json({ kodlar: await liste(userId) });
  } catch (error) {
    console.error("[POST /api/favoriler]", error);
    return NextResponse.json({ error: t("favori.kaydedilemedi") }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const t = await getTranslations("api");
  const userId = await oturumdakiKullanici();
  if (!userId) return girisGerekli(t);
  const parsed = kodSemasi.safeParse(req.nextUrl.searchParams.get("kod") ?? "");
  if (!parsed.success) {
    return NextResponse.json({ error: t("genel.gecersizIstek") }, { status: 400 });
  }
  try {
    // Zaten yoksa da başarı: çift tıklama ya da iki sekme hata göstermesin.
    await prisma.favorite.deleteMany({ where: { userId, hotelCode: parsed.data } });
    return NextResponse.json({ kodlar: await liste(userId) });
  } catch (error) {
    console.error("[DELETE /api/favoriler]", error);
    return NextResponse.json({ error: t("favori.silinemedi") }, { status: 500 });
  }
}
