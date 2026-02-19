import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHotelDetail } from "@/lib/royal-api";

interface RouteParams {
  params: Promise<{ hotelCode: string }>;
}

// GET /api/hotels/:hotelCode
// Returns a merged view of the locally cached hotel record and live detail data
// fetched from the Royal API. Local data provides the persistent base; the API
// layer supplies up-to-date descriptions, images and facilities.
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { hotelCode } = await params;

    if (!hotelCode) {
      return NextResponse.json({ error: "Otel kodu gerekli" }, { status: 400 });
    }

    // Fetch local record and live API detail in parallel.
    const [localHotel, apiDetail] = await Promise.allSettled([
      prisma.hotel.findUnique({
        where: { hotelCode },
        include: { location: true },
      }),
      getHotelDetail(hotelCode),
    ]);

    const local = localHotel.status === "fulfilled" ? localHotel.value : null;
    const api = apiDetail.status === "fulfilled" ? apiDetail.value : null;

    if (!local && !api) {
      return NextResponse.json({ error: "Otel bulunamadı" }, { status: 404 });
    }

    // Merge: API data takes precedence for mutable fields; local record provides
    // relational context (location) and internal identifiers.
    const combined = {
      ...(local ?? {}),
      ...(api ?? {}),
      // Always preserve the local id so clients can reference the DB record.
      id: local?.id,
      location: local?.location ?? null,
    };

    return NextResponse.json(combined);
  } catch (error) {
    console.error("[GET /api/hotels/[hotelCode]]", error);
    return NextResponse.json(
      { error: "Otel detayı alınırken bir hata oluştu" },
      { status: 500 }
    );
  }
}
