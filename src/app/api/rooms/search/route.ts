import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/prisma";
import { roomSearchSchema } from "@/lib/validators";
import { searchRooms } from "@/lib/royal-api";
import { calculatePrice } from "@/lib/pricing";
import type { RoomResult } from "@/lib/royal-api/types";

// POST /api/rooms/search
// Searches available rooms for a specific hotel from the Royal API and enriches
// each result with a calculated price (applying any active price rules and
// agency-specific discounts/commissions).
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const parsed = roomSearchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Geçersiz istek verisi", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const input = parsed.data;

    // Resolve feedId (same B2B / B2C logic as hotel search).
    const session = await getServerSession(authOptions);

    let feedId = process.env.ROYAL_API_FEED_ID_B2C ?? "";
    let agencyId: string | undefined;

    if (session?.user.role === "AGENCY" && session.user.agencyId) {
      agencyId = session.user.agencyId;
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

    const apiResponse = await searchRooms({
      feedId,
      currency: input.currency,
      nationality: input.nationality,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      hotelCode: input.hotelCode,
      rooms: input.rooms,
    });

    // Apply the pricing engine to every room result so callers receive both
    // the raw API price and the final calculated price in a single response.
    const userType =
      (session?.user.role as "CUSTOMER" | "AGENCY" | "ADMIN") ?? "CUSTOMER";

    const roomsWithPricing = await Promise.all(
      (apiResponse.rooms ?? []).map(async (room: RoomResult) => {
        const priceResult = await calculatePrice({
          basePrice: room.totalPrice,
          userType,
          agencyId,
          hotelCode: input.hotelCode,
          boardType: room.boardType,
          currency: input.currency,
        });

        return {
          ...room,
          pricing: {
            originalPrice: priceResult.originalPrice,
            finalPrice: priceResult.finalPrice,
            totalDiscount: priceResult.totalDiscount,
            commissionAmount: priceResult.commissionAmount,
            appliedRules: priceResult.appliedRules,
          },
        };
      })
    );

    return NextResponse.json({
      roomSearchId: apiResponse.roomSearchId,
      expiresAt: apiResponse.expiresAt,
      rooms: roomsWithPricing,
    });
  } catch (error) {
    console.error("[POST /api/rooms/search]", error);
    return NextResponse.json(
      { error: "Oda arama sırasında bir hata oluştu" },
      { status: 500 }
    );
  }
}
