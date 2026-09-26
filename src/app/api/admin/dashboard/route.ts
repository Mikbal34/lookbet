import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/prisma";
import { otelBilgisiEkle } from "@/lib/rezervasyon-otel";
import { calisanIs, sonCalismalar } from "@/lib/icerik-isleri";

// GET /api/admin/dashboard — Yönetim › Bugün.
// Bekleyen işler (başvuru, otel onayı, başarısız rezervasyon, içerik işi),
// bu ay / geçen ay özetleri, son 6 ayın satışı (müşteri ve acente ayrı) ve
// son rezervasyonlar. Satış = onaylı rezervasyonun müşteriye/acenteye
// satış fiyatı (discountedPrice, yoksa totalPrice), oluşturulma ayına göre.

export const dynamic = "force-dynamic";

const satis = (r: { totalPrice: number; discountedPrice: number | null }) => r.discountedPrice ?? r.totalPrice;
const ayAnahtari = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const simdi = new Date();
    const buAy = new Date(simdi.getFullYear(), simdi.getMonth(), 1);
    const gecenAy = new Date(simdi.getFullYear(), simdi.getMonth() - 1, 1);
    const altiAy = new Date(simdi.getFullYear(), simdi.getMonth() - 5, 1);
    const bugun = new Date(simdi.getFullYear(), simdi.getMonth(), simdi.getDate());
    // Başarısız rezervasyonlar: son 14 gün. Kart aynı başlangıçla listeye
    // bağlanır (?dateFrom), sayı ile liste aynı pencereyi gösterir.
    const basarisizDen = new Date(simdi.getTime() - 14 * 864e5);

    const [
      basvuruSay, enEskiBasvuru, otelOnayi, basarisiz, aktifAcente, musteri, yeniMusteri,
      buAyAdet, gecenAyAdet, bugunAdet, onaylilar, son, sonIsler,
    ] = await Promise.all([
      prisma.agencyApplication.count({ where: { status: "PENDING" } }),
      prisma.agencyApplication.findFirst({ where: { status: "PENDING" }, orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
      prisma.reservation.count({ where: { status: "PENDING" } }),
      prisma.reservation.count({ where: { status: "FAILED", createdAt: { gte: basarisizDen } } }),
      prisma.agency.count({ where: { isApproved: true, user: { isActive: true } } }),
      prisma.user.count({ where: { role: "CUSTOMER" } }),
      prisma.user.count({ where: { role: "CUSTOMER", createdAt: { gte: buAy } } }),
      prisma.reservation.count({ where: { createdAt: { gte: buAy }, status: { in: ["CONFIRMED", "PENDING"] } } }),
      prisma.reservation.count({ where: { createdAt: { gte: gecenAy, lt: buAy }, status: { in: ["CONFIRMED", "PENDING"] } } }),
      prisma.reservation.count({ where: { createdAt: { gte: bugun } } }),
      prisma.reservation.findMany({
        where: { status: "CONFIRMED", createdAt: { gte: altiAy } },
        select: { createdAt: true, totalPrice: true, discountedPrice: true, source: true },
      }),
      // Rezervasyon ayrıntısı (rez-ayrinti) buradan da açılır: liste
      // route'uyla aynı biçim (hesap sahibi ve acentenin anlaşma oranı).
      prisma.reservation.findMany({
        orderBy: { createdAt: "desc" },
        take: 6,
        include: {
          user: { select: { id: true, name: true, email: true } },
          agency: { select: { id: true, companyName: true, commission: true } },
        },
      }),
      sonCalismalar(),
    ]);

    const aylar = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(simdi.getFullYear(), simdi.getMonth() - 5 + i, 1);
      return { ay: ayAnahtari(d), musteri: 0, acente: 0 };
    });
    const ayBul = new Map(aylar.map((a) => [a.ay, a]));
    for (const r of onaylilar) {
      const a = ayBul.get(ayAnahtari(r.createdAt));
      if (!a) continue;
      if (r.source === "AGENCY") a.acente += satis(r);
      else a.musteri += satis(r);
    }
    const toplam = (a?: { musteri: number; acente: number }) => (a ? a.musteri + a.acente : 0);

    // İçerik işlerinden en son çalışanı "sağlıklı mı" kartına.
    const enSonIs = Object.entries(sonIsler).sort((a, b) => (b[1]!.zaman > a[1]!.zaman ? 1 : -1))[0] ?? null;

    return NextResponse.json({
      bekleyen: {
        basvuru: basvuruSay,
        enEskiBasvuru: enEskiBasvuru?.createdAt ?? null,
        otelOnayi,
        basarisiz,
        basarisizDen: basarisizDen.toISOString(),
        icerik: enSonIs ? { adim: enSonIs[0], ...enSonIs[1] } : null,
        calisan: calisanIs(),
      },
      ozet: {
        buAySatis: toplam(aylar[5]),
        gecenAySatis: toplam(aylar[4]),
        buAyAdet,
        gecenAyAdet,
        bugunAdet,
        aktifAcente,
        musteri,
        yeniMusteri,
      },
      aylar,
      son: await otelBilgisiEkle(son),
    });
  } catch (error) {
    console.error("[ADMIN_DASHBOARD_GET]", error);
    return NextResponse.json({ error: "Özet alınamadı" }, { status: 500 });
  }
}
