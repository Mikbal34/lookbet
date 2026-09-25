// GET /api/agency/kazanc (yalnız AGENCY)
// Son 12 ayın satış ve komisyonu: girişi o ayda olan onaylı rezervasyonlar.
// Komisyon, rezervasyon anında kaydedilen tutar (özel komisyon ya da
// anlaşma oranı; bkz. lib/pricing/engine). Bu alandan önceki eski
// rezervasyonlarda anlaşmadaki oranla hesaplanır. İptal ve başarısız
// rezervasyonlar sayılmaz; ödeme kaydı henüz yok.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "AGENCY" || !session.user.agencyId) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
    }
    const agencyId = session.user.agencyId;
    const simdi = new Date();
    const bas = new Date(simdi.getFullYear(), simdi.getMonth() - 11, 1);
    const son = new Date(simdi.getFullYear(), simdi.getMonth() + 1, 1);

    const [agency, rezervasyonlar] = await Promise.all([
      prisma.agency.findUnique({ where: { id: agencyId }, select: { commission: true, discountRate: true } }),
      prisma.reservation.findMany({
        where: { agencyId, status: "CONFIRMED", checkIn: { gte: bas, lt: son } },
        select: { checkIn: true, totalPrice: true, discountedPrice: true, commissionAmount: true, currency: true },
      }),
    ]);
    if (!agency) return NextResponse.json({ error: "Acente bulunamadı" }, { status: 404 });

    const oran = agency.commission / 100;
    const aylar = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(bas.getFullYear(), bas.getMonth() + i, 1);
      return { ay: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, satis: 0, komisyon: 0, adet: 0 };
    });
    for (const r of rezervasyonlar) {
      const d = new Date(r.checkIn);
      const k = aylar.find((a) => a.ay === `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
      if (!k) continue;
      const tutar = r.discountedPrice ?? r.totalPrice;
      k.satis += tutar;
      k.komisyon += r.commissionAmount ?? tutar * oran;
      k.adet += 1;
    }
    for (const a of aylar) {
      a.satis = Math.round(a.satis * 100) / 100;
      a.komisyon = Math.round(a.komisyon * 100) / 100;
    }

    return NextResponse.json({
      komisyonOrani: agency.commission,
      indirimOrani: agency.discountRate,
      paraBirimi: rezervasyonlar[0]?.currency ?? "EUR",
      aylar,
    });
  } catch (error) {
    console.error("[GET /api/agency/kazanc]", error);
    return NextResponse.json({ error: "Kazançlar alınamadı" }, { status: 500 });
  }
}
