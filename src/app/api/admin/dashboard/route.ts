import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const [
      totalReservations,
      totalRevenueResult,
      activeAgencies,
      pendingAgencies,
      totalUsers,
      reservationsToday,
      revenueThisMonthResult,
      recentReservations,
    ] = await Promise.all([
      prisma.reservation.count(),

      prisma.reservation.aggregate({
        _sum: { totalPrice: true },
        where: { status: "CONFIRMED" },
      }),

      prisma.agency.count({ where: { isApproved: true } }),

      prisma.agency.count({ where: { isApproved: false } }),

      prisma.user.count(),

      prisma.reservation.count({
        where: {
          createdAt: { gte: todayStart, lt: todayEnd },
        },
      }),

      prisma.reservation.aggregate({
        _sum: { totalPrice: true },
        where: {
          status: "CONFIRMED",
          createdAt: { gte: monthStart, lte: monthEnd },
        },
      }),

      prisma.reservation.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, name: true, email: true } },
          agency: { select: { id: true, companyName: true } },
        },
      }),
    ]);

    // Monthly revenue for the last 6 months
    const monthlyRevenueData: { month: string; revenue: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
      const end = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59, 999);

      const result = await prisma.reservation.aggregate({
        _sum: { totalPrice: true },
        where: {
          status: "CONFIRMED",
          createdAt: { gte: start, lte: end },
        },
      });

      monthlyRevenueData.push({
        month: `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, "0")}`,
        revenue: result._sum.totalPrice ?? 0,
      });
    }

    return NextResponse.json({
      stats: {
        totalReservations,
        totalRevenue: totalRevenueResult._sum.totalPrice ?? 0,
        activeAgencies,
        pendingAgencies,
        totalUsers,
        reservationsToday,
        revenueThisMonth: revenueThisMonthResult._sum.totalPrice ?? 0,
      },
      recentReservations,
      monthlyRevenue: monthlyRevenueData,
    });
  } catch (error) {
    console.error("[ADMIN_DASHBOARD_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
