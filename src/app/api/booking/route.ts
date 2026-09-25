import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/prisma";
import { createBookingSchema } from "@/lib/validators";
import { createBooking } from "@/lib/royal-api";
import { EtscoreError } from "@/lib/royal-api/client";
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
    // agencyId yalnız onaylı acentede dolu; onaysız acente rezervasyon yapamaz.
    if (userRole === "AGENCY" && !agencyId) {
      return NextResponse.json(
        { error: "Acente hesabın onaylanınca rezervasyon yapabilirsin" },
        { status: 403 }
      );
    }

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

    const clientReferenceId = generateClientReferenceId();

    // Forward to Royal API
    const apiBooking = await createBooking({
      feedId,
      roomSearchId: input.roomSearchId,
      priceCode: input.priceCode,
      clientReferenceId,
      hotelCode: input.hotelCode,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      currency: input.currency,
      contact: input.contact,
      rooms: input.rooms,
      additionalInfo: input.additionalInfo,
    });

    // The supplier-confirmed price is authoritative; the client-supplied
    // totalPrice comes from the URL and must not be trusted for billing.
    const supplierPrice =
      apiBooking.totalPrice && apiBooking.totalPrice > 0
        ? apiBooking.totalPrice
        : input.totalPrice;

    // Apply pricing engine on the supplier price
    const priceResult = await calculatePrice({
      basePrice: supplierPrice,
      userType: userRole,
      agencyId,
      hotelCode: input.hotelCode,
      boardType: input.boardType,
      currency: input.currency,
    });

    // Resolve hotel name from the local cache when the client didn't send one
    let hotelName = input.hotelName ?? null;
    if (!hotelName) {
      const localHotel = await prisma.hotel.findUnique({
        where: { hotelCode: input.hotelCode },
        select: { name: true },
      });
      hotelName = localHotel?.name ?? null;
    }

    // Flatten all guests from all rooms for the DB record
    const allGuests = input.rooms.flatMap((r) => r.guests);

    // Persist Reservation
    const reservation = await prisma.reservation.create({
      data: {
        bookingNumber: apiBooking.bookingNumber ?? null,
        clientReferenceId,
        hotelCode: input.hotelCode,
        hotelName,
        hotelConfirmationNumber: apiBooking.hotelConfirmationNumber ?? null,
        userId,
        agencyId: agencyId ?? null,
        checkIn: new Date(input.checkIn),
        checkOut: new Date(input.checkOut),
        status: apiBooking.status === "CONFIRMED" ? "CONFIRMED" : "PENDING",
        totalPrice: supplierPrice,
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
        commissionAmount: agencyId ? priceResult.commissionAmount : null,
        source: agencyId ? "AGENCY" : "CUSTOMER",
        // Ödeme sayfasındaki özel istek; rezervasyon detayında görünür.
        notes: input.additionalInfo ?? null,
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
    // Tedarikçinin reddi (fiyat süresi doldu, fiyat değişti, oda kalmadı…)
    // kullanıcının düzeltebileceği bir durum: mesajı olduğu gibi göster.
    // Etscore mesajları Accept-Language: tr-TR ile Türkçe geliyor.
    if (error instanceof EtscoreError && error.status >= 400 && error.status < 500) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status === 409 ? 409 : 422 }
      );
    }
    return NextResponse.json(
      { error: "Rezervasyon oluşturulurken bir hata oluştu" },
      { status: 500 }
    );
  }
}
