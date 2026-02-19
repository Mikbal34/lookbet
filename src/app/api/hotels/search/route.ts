import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/prisma";
import { hotelSearchSchema } from "@/lib/validators";
import { searchHotels } from "@/lib/royal-api";

// POST /api/hotels/search
// Searches hotels by destination via Royal API.
// B2B users (AGENCY role with agencyId) use their agency-specific feedId or the
// B2B env fallback; everyone else uses the B2C feedId.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const parsed = hotelSearchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Geçersiz istek verisi", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const input = parsed.data;

    // Resolve feedId: authenticated agency users may have their own B2B feed.
    const session = await getServerSession(authOptions);

    let feedId = process.env.ROYAL_API_FEED_ID_B2C ?? "";

    if (session?.user.role === "AGENCY" && session.user.agencyId) {
      const agency = await prisma.agency.findUnique({
        where: { id: session.user.agencyId },
        select: { feedId: true },
      });
      feedId =
        agency?.feedId ??
        process.env.ROYAL_API_FEED_ID_B2B ??
        process.env.ROYAL_API_FEED_ID_B2C ??
        "";
    }

    // Resolve hotel codes for the requested destination from the local DB.
    // Match locations whose name contains the destination string (case-insensitive),
    // then collect all hotels belonging to those locations.
    const locations = await prisma.location.findMany({
      where: { name: { contains: input.destination, mode: "insensitive" } },
      select: { id: true },
    });

    const locationIds = locations.map((l: { id: string }) => l.id);

    const hotels = await prisma.hotel.findMany({
      where: locationIds.length > 0 ? { locationId: { in: locationIds } } : {},
      select: { hotelCode: true },
    });

    const hotelCodes = hotels.map((h: { hotelCode: string }) => h.hotelCode);

    // Call Royal API
    const results = await searchHotels({
      feedId,
      currency: input.currency,
      nationality: input.nationality,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      hotelCodes,
      rooms: input.rooms,
    });

    // Persist search history (fire-and-forget; errors are swallowed intentionally)
    prisma.searchHistory
      .create({
        data: {
          userId: session?.user.id ?? null,
          params: input as any, // eslint-disable-line @typescript-eslint/no-explicit-any
          resultCount: results.hotels?.length ?? 0,
        },
      })
      .catch(() => {
        // Non-critical – do not surface history write failures to the caller.
      });

    return NextResponse.json(results);
  } catch (error) {
    console.error("[POST /api/hotels/search]", error);
    return NextResponse.json(
      { error: "Otel arama sırasında bir hata oluştu" },
      { status: 500 }
    );
  }
}
