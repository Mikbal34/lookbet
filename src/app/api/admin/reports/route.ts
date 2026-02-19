import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/prisma";

async function getRevenueReport() {
  const now = new Date();
  const monthlyData: { month: string; revenue: number; reservationCount: number }[] = [];

  for (let i = 11; i >= 0; i--) {
    const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
    const end = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59, 999);

    const [revenueResult, countResult] = await Promise.all([
      prisma.reservation.aggregate({
        _sum: { totalPrice: true },
        where: {
          status: "CONFIRMED",
          createdAt: { gte: start, lte: end },
        },
      }),
      prisma.reservation.count({
        where: {
          status: "CONFIRMED",
          createdAt: { gte: start, lte: end },
        },
      }),
    ]);

    monthlyData.push({
      month: `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, "0")}`,
      revenue: revenueResult._sum.totalPrice ?? 0,
      reservationCount: countResult,
    });
  }

  return { type: "revenue", data: monthlyData };
}

type AgencyWithReservations = {
  id: string;
  companyName: string;
  reservations: { id: string; totalPrice: number; status: string }[];
};

type AgencyStat = {
  agencyId: string;
  companyName: string;
  totalReservations: number;
  confirmedReservations: number;
  totalRevenue: number;
};

async function getAgencyPerformanceReport() {
  const agencies = await prisma.agency.findMany({
    where: { isApproved: true },
    select: {
      id: true,
      companyName: true,
      reservations: {
        select: {
          id: true,
          totalPrice: true,
          status: true,
        },
      },
    },
  });

  const agencyStats: AgencyStat[] = (agencies as AgencyWithReservations[])
    .map((agency) => {
      const confirmedReservations = agency.reservations.filter(
        (r: { status: string }) => r.status === "CONFIRMED"
      );
      const totalRevenue = confirmedReservations.reduce(
        (sum: number, r: { totalPrice: number }) => sum + r.totalPrice,
        0
      );

      return {
        agencyId: agency.id,
        companyName: agency.companyName,
        totalReservations: agency.reservations.length,
        confirmedReservations: confirmedReservations.length,
        totalRevenue,
      };
    })
    .sort((a: AgencyStat, b: AgencyStat) => b.totalRevenue - a.totalRevenue)
    .slice(0, 20);

  return { type: "agency-performance", data: agencyStats };
}

async function getHotelReport() {
  const reservations = await prisma.reservation.findMany({
    select: {
      hotelCode: true,
      hotelName: true,
      totalPrice: true,
      status: true,
    },
  });

  const hotelMap = new Map<
    string,
    { hotelCode: string; hotelName: string | null; totalBookings: number; confirmedBookings: number; totalRevenue: number }
  >();

  for (const r of reservations) {
    const existing = hotelMap.get(r.hotelCode);
    if (existing) {
      existing.totalBookings += 1;
      if (r.status === "CONFIRMED") {
        existing.confirmedBookings += 1;
        existing.totalRevenue += r.totalPrice;
      }
    } else {
      hotelMap.set(r.hotelCode, {
        hotelCode: r.hotelCode,
        hotelName: r.hotelName,
        totalBookings: 1,
        confirmedBookings: r.status === "CONFIRMED" ? 1 : 0,
        totalRevenue: r.status === "CONFIRMED" ? r.totalPrice : 0,
      });
    }
  }

  const hotelStats = Array.from(hotelMap.values())
    .sort((a, b) => b.totalBookings - a.totalBookings)
    .slice(0, 20);

  return { type: "hotel", data: hotelStats };
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    if (!type) {
      return NextResponse.json(
        { error: "type query param is required. Valid types: revenue, agency-performance, hotel" },
        { status: 400 }
      );
    }

    switch (type) {
      case "revenue":
        return NextResponse.json(await getRevenueReport());

      case "agency-performance":
        return NextResponse.json(await getAgencyPerformanceReport());

      case "hotel":
        return NextResponse.json(await getHotelReport());

      default:
        return NextResponse.json(
          { error: "Invalid type. Valid types: revenue, agency-performance, hotel" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("[ADMIN_REPORTS_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
