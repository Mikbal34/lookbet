import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/prisma";
import { cancelReservation } from "@/lib/royal-api";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/reservations/:id/cancel
// Requires authentication and ownership of the reservation.
// Cancels the booking in the Royal API and then marks the local record as
// CANCELLED.  The cancellation fee returned by the API is stored on the record
// as a note for audit purposes.
export async function POST(_request: NextRequest, { params }: RouteParams) {
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

    const reservation = await prisma.reservation.findUnique({ where: { id } });

    if (!reservation) {
      return NextResponse.json({ error: "Rezervasyon bulunamadı" }, { status: 404 });
    }

    // Ownership check
    const role = session.user.role;
    const userId = session.user.id;
    const agencyId = session.user.agencyId;

    if (role === "CUSTOMER" && reservation.userId !== userId) {
      return NextResponse.json(
        { error: "Bu rezervasyonu iptal etme izniniz yok" },
        { status: 403 }
      );
    }

    if (role === "AGENCY") {
      if (!agencyId || reservation.agencyId !== agencyId) {
        return NextResponse.json(
          { error: "Bu rezervasyonu iptal etme izniniz yok" },
          { status: 403 }
        );
      }
    }

    if (reservation.status === "CANCELLED") {
      return NextResponse.json(
        { error: "Rezervasyon zaten iptal edilmiş" },
        { status: 409 }
      );
    }

    if (!reservation.bookingNumber) {
      return NextResponse.json(
        { error: "Bu rezervasyonun harici rezervasyon numarası bulunamadı" },
        { status: 422 }
      );
    }

    // Cancel at Royal API
    const cancelResult = await cancelReservation({
      bookingNumber: reservation.bookingNumber,
    });

    // Update DB record
    const updated = await prisma.reservation.update({
      where: { id },
      data: {
        status: "CANCELLED",
        notes: reservation.notes
          ? `${reservation.notes}\nİptal ücreti: ${cancelResult.cancellationFee} ${cancelResult.currency}`
          : `İptal ücreti: ${cancelResult.cancellationFee} ${cancelResult.currency}`,
      },
    });

    return NextResponse.json({
      reservation: updated,
      cancellation: cancelResult,
    });
  } catch (error) {
    console.error("[POST /api/reservations/[id]/cancel]", error);
    return NextResponse.json(
      { error: "Rezervasyon iptal edilirken bir hata oluştu" },
      { status: 500 }
    );
  }
}
