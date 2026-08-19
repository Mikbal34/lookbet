// GET /api/agency/dashboard (sadece AGENCY)
// Acente panelinin özet verisi: şirket/anlaşma bilgileri, sunucuda hesaplanan
// rezervasyon istatistikleri ve son rezervasyonlar.

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
      revenueResult,
      monthRevenueResult,
      recentReservations,
    ] = await Promise.all([
      prisma.agency.findUnique({
        where: { id: agencyId },
        select: {
          companyName: true,
          taxId: true,
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
      prisma.reservation.aggregate({
        _sum: { totalPrice: true },
        where: { agencyId, status: "CONFIRMED" },
      }),
      prisma.reservation.aggregate({
        _sum: { totalPrice: true },
        where: {
          agencyId,
          status: "CONFIRMED",
          createdAt: { gte: monthStart },
        },
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
          currency: true,
          contactName: true,
        },
      }),
    ]);

    if (!agency) {
      return NextResponse.json({ error: "Acente bulunamadı" }, { status: 404 });
    }

    const totalRevenue = revenueResult._sum.totalPrice ?? 0;
    const monthRevenue = monthRevenueResult._sum.totalPrice ?? 0;

    return NextResponse.json({
      agency,
      stats: {
        totalReservations,
        confirmedCount,
        pendingCount,
        cancelledCount,
        totalRevenue,
        monthRevenue,
        // Anlaşmadaki komisyon oranından tahmini kazanç.
        estimatedCommission: totalRevenue * (agency.commission / 100),
      },
      recentReservations,
    });
  } catch (error) {
    console.error("[AGENCY_DASHBOARD_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
