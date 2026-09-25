import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/prisma";
import { otelBilgisiEkle } from "@/lib/rezervasyon-otel";

// GET /api/admin/reservations — Yönetim › Rezervasyonlar.
//   ?status ?source=CUSTOMER|AGENCY ?search ?agencyId ?hotelCode ?dateFrom ?dateTo ?page ?limit
// Yanıtta durum çipleri için sayilar (durum filtresi hariç, diğer filtrelerle).

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
    const status = searchParams.get("status");
    const agencyId = searchParams.get("agencyId");
    const hotelCode = searchParams.get("hotelCode");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const search = (searchParams.get("search") ?? "").trim();
    const source = searchParams.get("source");

    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    const validStatuses = ["PENDING", "CONFIRMED", "CANCELLED", "FAILED"] as const;
    if (source === "CUSTOMER" || source === "AGENCY") {
      where.source = source;
    }

    if (agencyId) {
      where.agencyId = agencyId;
    }

    if (hotelCode) {
      where.hotelCode = hotelCode;
    }

    if (dateFrom || dateTo) {
      const dateFilter: Record<string, Date> = {};
      if (dateFrom) dateFilter.gte = new Date(dateFrom);
      if (dateTo) dateFilter.lte = new Date(dateTo);
      where.createdAt = dateFilter;
    }

    if (search) {
      where.OR = [
        { bookingNumber: { contains: search, mode: "insensitive" } },
        { contactName: { contains: search, mode: "insensitive" } },
        { contactEmail: { contains: search, mode: "insensitive" } },
        { hotelName: { contains: search, mode: "insensitive" } },
        { agency: { companyName: { contains: search, mode: "insensitive" } } },
      ];
    }
    const temel = { ...where };
    if (status && (validStatuses as readonly string[]).includes(status)) {
      where.status = status;
    }

    const [reservations, total] = await Promise.all([
      prisma.reservation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, name: true, email: true } },
          agency: { select: { id: true, companyName: true, commission: true } },
        },
      }),
      prisma.reservation.count({ where }),
    ]);
    const durumlar = await prisma.reservation.groupBy({ by: ["status"], where: temel, _count: { _all: true } });
    const sayilar = Object.fromEntries(validStatuses.map((d) => [d, durumlar.find((x) => x.status === d)?._count._all ?? 0]));

    return NextResponse.json({
      reservations: await otelBilgisiEkle(reservations),
      sayilar,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[ADMIN_RESERVATIONS_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
