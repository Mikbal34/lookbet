// GET /api/agency/dashboard (sadece AGENCY)
// Acente panelinin özet verisi: şirket/anlaşma bilgileri, sunucuda hesaplanan
// rezervasyon istatistikleri ve son rezervasyonlar.
// Tutarlar /api/agency/kazanc ve yönetim raporlarıyla aynı: satış =
// discountedPrice ?? totalPrice (totalPrice tedarikçinin net fiyatı),
// komisyon = rezervasyonda saklanan commissionAmount, eski kayıtlarda satış ×
// anlaşma oranı. Zaman tabanı: totalRevenue/estimatedCommission tüm onaylı
// rezervasyonlar; monthRevenue/monthCommission bu ay OLUŞTURULANLAR
// (createdAt). Kazançlar ekranı ise girişi o ayda olanları (checkIn) sayar.

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
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      agency,
      totalReservations,
      confirmedCount,
      pendingCount,
      cancelledCount,
      onaylilar,
      recentReservations,
    ] = await Promise.all([
      prisma.agency.findUnique({
        where: { id: agencyId },
        select: {
          companyName: true,
          taxId: true,
          taxOffice: true,
          tursabNo: true,
          website: true,
          address: true,
          phone: true,
          discountRate: true,
          commission: true,
          isApproved: true,
          createdAt: true,
        },
      }),
      prisma.reservation.count({ where: { agencyId } }),
      prisma.reservation.count({ where: { agencyId, status: "CONFIRMED" } }),
      prisma.reservation.count({ where: { agencyId, status: "PENDING" } }),
      prisma.reservation.count({ where: { agencyId, status: "CANCELLED" } }),
      // Satış ve komisyon satır satır: satış = discountedPrice ?? totalPrice,
      // komisyon saklanan tutar (toplama yapılamaz; kazanc ile aynı hesap).
      prisma.reservation.findMany({
        where: { agencyId, status: "CONFIRMED" },
        select: { totalPrice: true, discountedPrice: true, commissionAmount: true, createdAt: true },
      }),
      prisma.reservation.findMany({
        where: { agencyId },
        take: 10,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          bookingNumber: true,
          hotelName: true,
          checkIn: true,
          checkOut: true,
          status: true,
          totalPrice: true,
          discountedPrice: true,
          commissionAmount: true,
          currency: true,
          contactName: true,
        },
      }),
    ]);

    if (!agency) {
      return NextResponse.json({ error: "Acente bulunamadı" }, { status: 404 });
    }

    const oran = agency.commission / 100;
    const yuvarla = (n: number) => Math.round(n * 100) / 100;
    let totalRevenue = 0, monthRevenue = 0, totalCommission = 0, monthCommission = 0;
    for (const r of onaylilar) {
      const satis = r.discountedPrice ?? r.totalPrice;
      const komisyon = r.commissionAmount ?? satis * oran;
      totalRevenue += satis;
      totalCommission += komisyon;
      if (r.createdAt >= monthStart) {
        monthRevenue += satis;
        monthCommission += komisyon;
      }
    }

    return NextResponse.json({
      agency,
      stats: {
        totalReservations,
        confirmedCount,
        pendingCount,
        cancelledCount,
        // Satış fiyatı (acenteye); tüm onaylı rezervasyonlar.
        totalRevenue: yuvarla(totalRevenue),
        // Bu ay oluşturulan (createdAt) onaylı rezervasyonların satışı.
        monthRevenue: yuvarla(monthRevenue),
        // Saklanan komisyonların toplamı (eski kayıtlarda anlaşma oranıyla);
        // alan adı geriye uyum için korunur.
        estimatedCommission: yuvarla(totalCommission),
        monthCommission: yuvarla(monthCommission),
        // Yukarıdaki "month" alanlarının zaman tabanı (Kazançlar: checkIn).
        monthBasis: "createdAt",
      },
      // Tedarikçi net fiyatı acenteye gitmez: tutar satış fiyatıdır.
      recentReservations: recentReservations.map(({ totalPrice, discountedPrice, ...r }) => ({
        ...r,
        totalPrice: discountedPrice ?? totalPrice,
        discountedPrice: discountedPrice ?? totalPrice,
      })),
    });
  } catch (error) {
    console.error("[AGENCY_DASHBOARD_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
