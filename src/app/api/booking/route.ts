import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/prisma";
import { createBookingSchema } from "@/lib/validators";
import { createBooking } from "@/lib/royal-api";
import { calculatePrice } from "@/lib/pricing";
import { generateClientReferenceId } from "@/lib/utils";

// POST /api/booking
// Requires an authenticated session.
// Validates the payload, applies the pricing engine to determine the final
// billable price, forwards the booking to the Royal API and then persists a
// Reservation record that captures all pricing, discount and guest details.
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Bu işlem için giriş yapmanız gerekiyor" },
        { status: 401 }
      );
    }

    const body = await request.json();

    const parsed = createBookingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Geçersiz istek verisi", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const input = parsed.data;

    const userId = session.user.id;
    const userRole = session.user.role as "CUSTOMER" | "AGENCY" | "ADMIN";
    const agencyId = session.user.agencyId ?? undefined;

    // Resolve feedId
    let feedId = process.env.ROYAL_API_FEED_ID_B2C ?? "";

    if (userRole === "AGENCY" && agencyId) {
      const agency = await prisma.agency.findUnique({
        where: { id: agencyId },
        select: { feedId: true },
      });
      feedId =
        agency?.feedId ??
        process.env.ROYAL_API_FEED_ID_B2B ??
        process.env.ROYAL_API_FEED_ID_B2C ??
        "";
    }

    // Apply pricing engine
    const priceResult = await calculatePrice({
      basePrice: input.totalPrice,
      userType: userRole,
      agencyId,
      hotelCode: input.hotelCode,
      boardType: input.boardType,
      currency: input.currency,
    });

    const clientReferenceId = generateClientReferenceId();

    // Forward to Royal API
    const apiBooking = await createBooking({
      feedId,
      roomSearchId: input.roomSearchId,
      priceCode: input.priceCode,
      clientReferenceId,
      contact: input.contact,
      rooms: input.rooms,
    });

    // Flatten all guests from all rooms for the DB record
    const allGuests = input.rooms.flatMap((r) => r.guests);

    // Persist Reservation
    const reservation = await prisma.reservation.create({
      data: {
        bookingNumber: apiBooking.bookingNumber ?? null,
        clientReferenceId,
        hotelCode: input.hotelCode,
        hotelName: input.hotelName ?? null,
        userId,
        agencyId: agencyId ?? null,
        checkIn: new Date(input.checkIn),
        checkOut: new Date(input.checkOut),
        status: apiBooking.status === "CONFIRMED" ? "CONFIRMED" : "PENDING",
        totalPrice: input.totalPrice,
        discountedPrice: priceResult.finalPrice,
        discountAmount: priceResult.totalDiscount,
        currency: apiBooking.currency ?? input.currency,
        boardType: input.boardType ?? null,
        roomType: input.roomType ?? null,
        contactName: `${input.contact.name} ${input.contact.surname}`,
        contactEmail: input.contact.email,
        contactPhone: input.contact.phone,
        guests: allGuests as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        cancellationPolicy: input.cancellationPolicy ?? null,
        roomConfirmationCodes: (apiBooking.roomConfirmationCodes ?? []) as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        appliedPriceRules: priceResult.appliedRules as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        source: agencyId ? "AGENCY" : "CUSTOMER",
      },
    });

    return NextResponse.json(
      {
        reservation,
        bookingConfirmation: apiBooking,
        pricing: {
          originalPrice: priceResult.originalPrice,
          finalPrice: priceResult.finalPrice,
          totalDiscount: priceResult.totalDiscount,
          commissionAmount: priceResult.commissionAmount,
          appliedRules: priceResult.appliedRules,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/booking]", error);
    return NextResponse.json(
      { error: "Rezervasyon oluşturulurken bir hata oluştu" },
      { status: 500 }
    );
  }
}
