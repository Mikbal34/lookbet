import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/prisma";

type ReservationStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "FAILED";

// Where clause type – kept loose to avoid a hard dependency on the generated
// Prisma client types, which require `prisma generate` to be run first.
type ReservationWhereInput = Record<string, unknown>;

const VALID_STATUSES: ReservationStatus[] = [
  "PENDING",
  "CONFIRMED",
  "CANCELLED",
  "FAILED",
];

// GET /api/reservations
// Requires authentication.
// Role-scoped listing:
//   ADMIN   – all reservations
//   AGENCY  – reservations belonging to their agency
//   CUSTOMER – only their own reservations
//
// Query params:
//   status  – filter by ReservationStatus
//   page    – 1-based page number (default: 1)
//   limit   – page size (default: 20, max: 100)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Bu işlem için giriş yapmanız gerekiyor" },
        { status: 401 }
      );
    }

    const { searchParams } = request.nextUrl;

    const statusParam = searchParams.get("status");
    const pageParam = parseInt(searchParams.get("page") ?? "1", 10);
    const limitParam = Math.min(
      parseInt(searchParams.get("limit") ?? "20", 10),
      100
    );

    const page = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
    const limit = isNaN(limitParam) || limitParam < 1 ? 20 : limitParam;
    const skip = (page - 1) * limit;

    // Build the where clause based on role
    const where: ReservationWhereInput = {};

    const role = session.user.role;
    const userId = session.user.id;
    const agencyId = session.user.agencyId;

    if (role === "AGENCY") {
      if (!agencyId) {
        return NextResponse.json(
          { error: "Acente bilgisi bulunamadı" },
          { status: 403 }
        );
      }
      where.agencyId = agencyId;
    } else if (role === "CUSTOMER") {
      where.userId = userId;
    }
    // ADMIN: no additional constraint – sees everything

    if (statusParam && VALID_STATUSES.includes(statusParam as ReservationStatus)) {
      where.status = statusParam as ReservationStatus;
    }

    const [reservations, total] = await Promise.all([
      prisma.reservation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, name: true, email: true } },
          agency: { select: { id: true, companyName: true } },
        },
      }),
      prisma.reservation.count({ where }),
    ]);

    return NextResponse.json({
      data: reservations,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[GET /api/reservations]", error);
    return NextResponse.json(
      { error: "Rezervasyonlar alınırken bir hata oluştu" },
      { status: 500 }
    );
  }
}
