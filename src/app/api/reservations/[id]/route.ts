import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/reservations/:id
// Returns a single reservation.
// Access rules:
//   ADMIN   – can view any reservation
//   AGENCY  – can view reservations belonging to their agency
//   CUSTOMER – can view only their own reservations
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Bu işlem için giriş yapmanız gerekiyor" },
        { status: 401 }
      );
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Rezervasyon ID gerekli" }, { status: 400 });
    }

    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        agency: { select: { id: true, companyName: true } },
      },
    });

    if (!reservation) {
      return NextResponse.json({ error: "Rezervasyon bulunamadı" }, { status: 404 });
    }

    const role = session.user.role;
    const userId = session.user.id;
    const agencyId = session.user.agencyId;

    // Ownership check
    if (role === "CUSTOMER" && reservation.userId !== userId) {
      return NextResponse.json({ error: "Bu rezervasyona erişim izniniz yok" }, { status: 403 });
    }

    if (role === "AGENCY") {
      if (!agencyId || reservation.agencyId !== agencyId) {
        return NextResponse.json(
          { error: "Bu rezervasyona erişim izniniz yok" },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(reservation);
  } catch (error) {
    console.error("[GET /api/reservations/[id]]", error);
    return NextResponse.json(
      { error: "Rezervasyon alınırken bir hata oluştu" },
      { status: 500 }
    );
  }
}
