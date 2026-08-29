import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/prisma";
import { getReservationDetail } from "@/lib/royal-api";
import type { ReservationStatus } from "@/generated/prisma/client";
import { boardTypeAdi, boardTypeAdlari } from "@/lib/board-types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function mapApiStatus(apiStatus: string | undefined): ReservationStatus | null {
  if (!apiStatus) return null;
  if (/cancel/i.test(apiStatus)) return "CANCELLED";
  if (/confirm/i.test(apiStatus)) return "CONFIRMED";
  if (/fail|reject|error/i.test(apiStatus)) return "FAILED";
  if (/pend|wait|request/i.test(apiStatus)) return "PENDING";
  return null;
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

    let reservation = await prisma.reservation.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        agency: { select: { id: true, companyName: true } },
      },
    });

    if (!reservation) {
      return NextResponse.json({ error: "Rezervasyon bulunamadı" }, { status: 404 });
    }

    // Refresh non-final reservations from the supplier so hotel-side changes
    // (cancellation, confirmation) are reflected locally. Failures are
    // non-fatal — the local record is served as-is.
    if (
      reservation.bookingNumber &&
      (reservation.status === "PENDING" || reservation.status === "CONFIRMED")
    ) {
      try {
        const apiDetail = await getReservationDetail(reservation.bookingNumber);
        const mappedStatus = mapApiStatus(apiDetail.status);

        const statusChanged = mappedStatus && mappedStatus !== reservation.status;
        const policyMissing =
          !reservation.cancellationPolicy &&
          (apiDetail.cancellationPolicies?.length ?? 0) > 0;

        if (statusChanged || policyMissing) {
          reservation = await prisma.reservation.update({
            where: { id },
            data: {
              ...(statusChanged ? { status: mappedStatus } : {}),
              ...(policyMissing
                ? { cancellationPolicy: apiDetail.cancellationPolicies as any } // eslint-disable-line @typescript-eslint/no-explicit-any
                : {}),
            },
            include: {
              user: { select: { id: true, name: true, email: true } },
              agency: { select: { id: true, companyName: true } },
            },
          });
        }
      } catch (refreshError) {
        console.warn("[GET /api/reservations/[id]] supplier refresh failed", refreshError);
      }
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

    // Liste ucundaki gibi pansiyon kodunu görünen ada çevir; ayrıca otelin
    // yerel kaydından fotoğraf/yıldız/konum ekle. Detay sayfası tepede otel
    // fotoğrafı gösteriyor ve bu bilgiler rezervasyon satırında tutulmuyor.
    // İkinci bir istemci isteği yerine burada birleştiriliyor — tedarikçiye
    // değil yerel tabloya bakıldığı için ek gecikme getirmiyor.
    const [pansiyonAdlari, otel] = await Promise.all([
      boardTypeAdlari(),
      prisma.hotel.findUnique({
        where: { hotelCode: reservation.hotelCode },
        select: {
          thumbnailImage: true,
          images: true,
          stars: true,
          address: true,
          location: { select: { name: true } },
        },
      }),
    ]);

    // images alanı Json?; yerel kayıtta düz URL dizisi olarak tutuluyor.
    const gorseller = Array.isArray(otel?.images)
      ? (otel.images as unknown[]).filter((u): u is string => typeof u === "string")
      : [];

    return NextResponse.json({
      ...reservation,
      boardTypeName: boardTypeAdi(reservation.boardType, pansiyonAdlari),
      hotel: otel
        ? {
            image: otel.thumbnailImage ?? gorseller[0] ?? null,
            stars: otel.stars,
            address: otel.address,
            city: otel.location?.name ?? null,
          }
        : null,
    });
  } catch (error) {
    console.error("[GET /api/reservations/[id]]", error);
    return NextResponse.json(
      { error: "Rezervasyon alınırken bir hata oluştu" },
      { status: 500 }
    );
  }
}
