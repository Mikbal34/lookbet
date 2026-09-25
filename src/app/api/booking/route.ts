import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/prisma";
import { createBookingSchema } from "@/lib/validators";
import { createBooking } from "@/lib/royal-api";
import { EtscoreError } from "@/lib/royal-api/client";
import { calculatePrice, fiyatBaglami, komisyonHesapla } from "@/lib/pricing";
import { kuponDegerlendir } from "@/lib/pricing/kupon";
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

    // Kupon ön kontrolü: geçersiz kodla tedarikçide rezervasyon açılmasın.
    const fiyatGirdisi = {
      hotelCode: input.hotelCode,
      boardType: input.boardType,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
    };
    if (input.couponCode) {
      const on = await kuponDegerlendir({
        kod: input.couponCode,
        userId,
        userType: userRole,
        agencyId,
        girdi: { ...fiyatGirdisi, basePrice: input.netPrice ?? input.totalPrice },
      });
      if (on.durum === "gecersiz") {
        return NextResponse.json({ error: on.mesaj, alan: "kupon" }, { status: 422 });
      }
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

    // Fiyat motoru tedarikçi fiyatı üzerinden: kural → kampanya → acente
    // indirimi; kupon varsa aynı kuralla yeniden (birleşmiyorsa avantajlı olan).
    let priceResult = await calculatePrice({ ...fiyatGirdisi, basePrice: supplierPrice, userType: userRole, agencyId, currency: input.currency });
    let kupon: { id: string; kod: string; tutar: number } | null = null;
    let sonFiyat = priceResult.finalPrice;
    let komisyon = priceResult.commissionAmount;
    if (input.couponCode) {
      const k = await kuponDegerlendir({
        kod: input.couponCode,
        userId,
        userType: userRole,
        agencyId,
        girdi: { ...fiyatGirdisi, basePrice: supplierPrice },
      });
      if (k.durum !== "gecersiz") priceResult = k.fiyat;
      if (k.durum === "uygulandi") {
        kupon = { ...k.kupon, tutar: k.tutar };
        sonFiyat = k.sonFiyat;
        komisyon = await komisyonHesapla(await fiyatBaglami(userRole, agencyId), sonFiyat, input.hotelCode, input.boardType);
      } else {
        sonFiyat = priceResult.finalPrice;
        komisyon = priceResult.commissionAmount;
      }
    }
    const uygulananlar = kupon
      ? [...priceResult.appliedRules, { ruleId: `kupon-${kupon.id}`, name: `Kupon ${kupon.kod}`, type: "PERCENTAGE_DISCOUNT", value: 0, discountAmount: kupon.tutar }]
      : priceResult.appliedRules;

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
        discountedPrice: sonFiyat,
        discountAmount: priceResult.totalDiscount + (kupon?.tutar ?? 0),
        currency: apiBooking.currency ?? input.currency,
        boardType: input.boardType ?? null,
        roomType: input.roomType ?? null,
        contactName: `${input.contact.name} ${input.contact.surname}`,
        contactEmail: input.contact.email,
        contactPhone: input.contact.phone,
        guests: allGuests as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        cancellationPolicy: input.cancellationPolicy ?? null,
        roomConfirmationCodes: (apiBooking.roomConfirmationCodes ?? []) as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        appliedPriceRules: uygulananlar as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        commissionAmount: agencyId ? komisyon : null,
        discountId: priceResult.kampanya?.id ?? null,
        campaignDiscount: priceResult.kampanya?.tutar ?? null,
        couponId: kupon?.id ?? null,
        couponDiscount: kupon?.tutar ?? null,
        source: agencyId ? "AGENCY" : "CUSTOMER",
        // Ödeme sayfasındaki özel istek; rezervasyon detayında görünür.
        notes: input.additionalInfo ?? null,
      },
    });

    if (kupon) {
      await prisma.$transaction([
        prisma.coupon.update({ where: { id: kupon.id }, data: { usedCount: { increment: 1 } } }),
        prisma.couponUse.create({ data: { couponId: kupon.id, userId, reservationId: reservation.id, amount: kupon.tutar } }),
      ]).catch((e) => console.error("[BOOKING_KUPON_KAYIT]", e));
    }

    return NextResponse.json(
      {
        reservation,
        bookingConfirmation: apiBooking,
        pricing: {
          originalPrice: priceResult.originalPrice,
          finalPrice: sonFiyat,
          totalDiscount: priceResult.totalDiscount + (kupon?.tutar ?? 0),
          commissionAmount: komisyon,
          appliedRules: uygulananlar,
          kampanya: priceResult.kampanya,
          kupon,
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
