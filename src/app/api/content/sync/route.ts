import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/prisma";
import { ADIMLAR, MesgulHatasi, calisanIs, isCalistir, sonCalismalar, type Adim, ORNEK_VERI_MESAJI, ornekVerideEngelli } from "@/lib/icerik-isleri";

// Yönetim › İçerik senkronu.
//   GET  — otel/konum sayıları, fiyat veren ve içeriği eksik oteller, her
//          içerik işinin son çalışması ve şu an çalışan iş.
//   POST — { adim } tek bir içerik işini arka planda başlatır (cron'la aynı
//          iş) ve hemen 202 döner; panel GET'teki "calisan"ı yoklar. Uzun
//          işler (dakikalar) nginx zaman aşımına takılmasın diye beklenmez.

export const dynamic = "force-dynamic";

async function yonetici() {
  const session = await getServerSession(authOptions);
  return session?.user?.role === "ADMIN" ? session : null;
}

export async function GET() {
  try {
    if (!(await yonetici())) return NextResponse.json({ error: "Bu işlem için yönetici yetkisi gerekiyor" }, { status: 403 });

    const gun = new Date(Date.now() - 24 * 3600 * 1000);
    const [aktif, pasif, konum, fiyatVeren, fotografsiz, son] = await Promise.all([
      prisma.hotel.count({ where: { isActive: true } }),
      prisma.hotel.count({ where: { isActive: false } }),
      prisma.location.count(),
      prisma.hotel.count({ where: { isActive: true, lastPricedAt: { gte: gun } } }),
      prisma.hotel.count({ where: { isActive: true, thumbnailImage: null } }),
      sonCalismalar(),
    ]);

    return NextResponse.json({
      sayilar: { aktif, pasif, konum, fiyatVeren, fotografsiz },
      son,
      calisan: calisanIs(),
    });
  } catch (error) {
    console.error("[CONTENT_SYNC_GET]", error);
    return NextResponse.json({ error: "İçerik bilgisi alınamadı" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await yonetici();
  if (!session) return NextResponse.json({ error: "Bu işlem için yönetici yetkisi gerekiyor" }, { status: 403 });

  const { adim } = (await request.json().catch(() => ({}))) as { adim?: string };
  if (!adim || !ADIMLAR.includes(adim as Adim)) {
    return NextResponse.json({ error: `adim: ${ADIMLAR.join(" | ")}` }, { status: 400 });
  }
  if (calisanIs()) {
    return NextResponse.json({ error: `Şu an "${calisanIs()}" çalışıyor` }, { status: 409 });
  }
  if (ornekVerideEngelli(adim as Adim)) return NextResponse.json({ error: ORNEK_VERI_MESAJI }, { status: 409 });
  await prisma.auditLog.create({
    data: { userId: session.user.id, action: "RUN_CONTENT_SYNC", entity: "Hotel", entityId: adim, newData: { adim } },
  });
  isCalistir(adim as Adim, (satir) => console.log(`[content/sync ${adim}] ${satir}`)).catch((e) => {
    if (!(e instanceof MesgulHatasi)) console.error("[CONTENT_SYNC_POST]", e);
  });
  return NextResponse.json({ adim, basladi: true }, { status: 202 });
}
