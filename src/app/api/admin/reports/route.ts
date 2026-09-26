import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/prisma";
import { otelBilgisiEkle } from "@/lib/rezervasyon-otel";

// GET /api/admin/reports — Yönetim › Raporlar, son 12 ay (bu ay dahil).
// Satış = onaylı rezervasyonun satış fiyatı (discountedPrice, yoksa
// totalPrice; totalPrice tedarikçinin net fiyatı), oluşturulma ayına göre.
// Tutarlar rezervasyonun para biriminde toplanır (şimdilik hep EUR).

export const dynamic = "force-dynamic";

const ayAnahtari = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const yuvarla = (n: number) => Math.round(n * 100) / 100;

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Bu işlem için yönetici yetkisi gerekiyor" }, { status: 403 });
    }

    const simdi = new Date();
    const bas = new Date(simdi.getFullYear(), simdi.getMonth() - 11, 1);
    const hepsi = await prisma.reservation.findMany({
      where: { createdAt: { gte: bas }, status: { in: ["CONFIRMED", "CANCELLED"] } },
      select: {
        createdAt: true, status: true, source: true, totalPrice: true, discountedPrice: true,
        hotelCode: true, hotelName: true, boardType: true,
        agency: { select: { id: true, companyName: true } },
      },
    });
    const onayli = hepsi.filter((r) => r.status === "CONFIRMED");
    const satis = (r: (typeof hepsi)[number]) => r.discountedPrice ?? r.totalPrice;

    const aylar = Array.from({ length: 12 }, (_, i) => ({ ay: ayAnahtari(new Date(simdi.getFullYear(), simdi.getMonth() - 11 + i, 1)), satis: 0, adet: 0 }));
    const ayBul = new Map(aylar.map((a) => [a.ay, a]));
    let toplam = 0;
    let musteri = 0;
    const acente = new Map<string, { id: string; ad: string; satis: number; adet: number }>();
    const otel = new Map<string, { hotelCode: string; hotelName: string | null; boardType: string | null; satis: number; adet: number }>();
    for (const r of onayli) {
      const s = satis(r);
      toplam += s;
      const a = ayBul.get(ayAnahtari(r.createdAt));
      if (a) { a.satis += s; a.adet += 1; }
      if (r.source === "AGENCY" && r.agency) {
        const x = acente.get(r.agency.id) ?? { id: r.agency.id, ad: r.agency.companyName, satis: 0, adet: 0 };
        x.satis += s; x.adet += 1; acente.set(r.agency.id, x);
      } else musteri += s;
      const o = otel.get(r.hotelCode) ?? { hotelCode: r.hotelCode, hotelName: r.hotelName, boardType: null, satis: 0, adet: 0 };
      o.satis += s; o.adet += 1; otel.set(r.hotelCode, o);
    }
    const iptal = hepsi.length - onayli.length;

    const enCokOtel = [...otel.values()].sort((a, b) => b.satis - a.satis).slice(0, 8);
    const otelBilgili = await otelBilgisiEkle(enCokOtel);

    return NextResponse.json({
      ozet: {
        satis: yuvarla(toplam),
        adet: onayli.length,
        ortSepet: onayli.length ? yuvarla(toplam / onayli.length) : 0,
        iptalOrani: hepsi.length ? Math.round((iptal / hepsi.length) * 1000) / 10 : 0,
        musteriPayi: toplam ? Math.round((musteri / toplam) * 100) : 0,
      },
      aylar: aylar.map((a) => ({ ...a, satis: yuvarla(a.satis) })),
      acenteler: [...acente.values()].sort((a, b) => b.satis - a.satis).slice(0, 10).map((a) => ({ ...a, satis: yuvarla(a.satis) })),
      oteller: otelBilgili.map((o) => ({ hotelCode: o.hotelCode, hotelName: o.hotelName, satis: yuvarla(o.satis), adet: o.adet, image: o.hotel?.image ?? null })),
    });
  } catch (error) {
    console.error("[ADMIN_REPORTS_GET]", error);
    return NextResponse.json({ error: "Rapor alınamadı" }, { status: 500 });
  }
}
