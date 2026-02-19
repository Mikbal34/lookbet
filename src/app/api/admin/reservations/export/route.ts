import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/prisma";

function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatDate(date: Date | null | undefined): string {
  if (!date) return "";
  return date.toISOString().replace("T", " ").substring(0, 19);
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const agencyId = searchParams.get("agencyId");
    const hotelCode = searchParams.get("hotelCode");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const search = searchParams.get("search") ?? "";

    const where: Record<string, unknown> = {};

    const validStatuses = ["PENDING", "CONFIRMED", "CANCELLED", "FAILED"];
    if (status && validStatuses.includes(status)) {
      where.status = status;
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
      ];
    }

    const reservations = await prisma.reservation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true } },
        agency: { select: { id: true, companyName: true } },
      },
    });

    const headers = [
      "ID",
      "Booking Number",
      "Status",
      "Hotel Code",
      "Hotel Name",
      "Check In",
      "Check Out",
      "Total Price",
      "Discounted Price",
      "Currency",
      "Board Type",
      "Room Type",
      "Contact Name",
      "Contact Email",
      "Contact Phone",
      "User Name",
      "User Email",
      "Agency",
      "Source",
      "Created At",
    ];

    type ReservationWithRelations = (typeof reservations)[number];

    const rows = reservations.map((r: ReservationWithRelations) => [
      escapeCsvField(r.id),
      escapeCsvField(r.bookingNumber),
      escapeCsvField(r.status),
      escapeCsvField(r.hotelCode),
      escapeCsvField(r.hotelName),
      escapeCsvField(formatDate(r.checkIn)),
      escapeCsvField(formatDate(r.checkOut)),
      escapeCsvField(r.totalPrice),
      escapeCsvField(r.discountedPrice),
      escapeCsvField(r.currency),
      escapeCsvField(r.boardType),
      escapeCsvField(r.roomType),
      escapeCsvField(r.contactName),
      escapeCsvField(r.contactEmail),
      escapeCsvField(r.contactPhone),
      escapeCsvField(r.user?.name),
      escapeCsvField(r.user?.email),
      escapeCsvField(r.agency?.companyName),
      escapeCsvField(r.source),
      escapeCsvField(formatDate(r.createdAt)),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row: string[]) => row.join(",")),
    ].join("\n");

    const filename = `reservations-export-${new Date().toISOString().substring(0, 10)}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("[ADMIN_RESERVATIONS_EXPORT_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
