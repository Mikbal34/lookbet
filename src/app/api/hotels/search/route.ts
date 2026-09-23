import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/prisma";
import { hotelSearchSchema } from "@/lib/validators";
import { searchHotels } from "@/lib/royal-api";
import { boardTypeAdlari } from "@/lib/board-types";
import { hedefOtelKodlari } from "@/lib/otel-arama";

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

    // Yazılanı otel kodlarına çevir — konum adında, bulunamazsa otel adında.
    // Etscore şehre göre arama sunmuyor, eşleşme bizim veritabanımızda
    // (bkz. lib/otel-arama.ts).
    const hedef = await hedefOtelKodlari(input.destination);
    if (hedef.kodlar.length === 0) {
      return NextResponse.json({ searchId: "", hotels: [], eslesme: hedef.eslesme });
    }
    const hotelCodes = hedef.kodlar;

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

    // Translate board type codes to display names using the synced content
    // table; unknown codes fall through as-is.
    const boardTypeNames = await boardTypeAdlari();

    // Etscore aramada yıldız, adres ve görsel vermiyor; bunlar bizim
    // veritabanımızda. API'nin boş bıraktığı alanlar oradan dolduruluyor,
    // API'nin verdiği (fiyat, koordinat) ezilmiyor.
    const icerik = new Map(
      (
        await prisma.hotel.findMany({
          where: { hotelCode: { in: (results.hotels ?? []).map((h) => h.hotelCode) } },
          select: {
            hotelCode: true,
            stars: true,
            address: true,
            thumbnailImage: true,
            images: true,
            latitude: true,
            longitude: true,
            location: { select: { name: true } },
          },
        })
      ).map((h) => [h.hotelCode, h])
    );

    const hotelsWithBoardNames = (results.hotels ?? []).map((h) => {
      const db = icerik.get(h.hotelCode);
      const ilkGorsel = Array.isArray(db?.images) ? (db.images as unknown[]).find((x) => typeof x === "string") : undefined;
      return {
        ...h,
        stars: h.stars || db?.stars || 0,
        address: h.address || db?.address || db?.location?.name || "",
        thumbnailImage: h.thumbnailImage || db?.thumbnailImage || (ilkGorsel as string | undefined) || "",
        latitude: h.latitude || db?.latitude || 0,
        longitude: h.longitude || db?.longitude || 0,
        boardTypes: (h.boardTypes ?? []).map((code) => boardTypeNames.get(code) ?? code),
      };
    });

    // Arama geçmişi — analitik ve ileride kişiselleştirme için. Ekrandaki
    // "son aramaların" listesi cihazdan besleniyor (girişsiz kullanıcıda da
    // çalışsın diye), burası ondan bağımsız.
    //
    // Yazma bilerek await edilmiyor ve hatası yutuluyor: geçmiş kaydı
    // tutmakta yaşanan bir sorun arama sonucunu geciktirmemeli ya da
    // düşürmemeli.
    void prisma.searchHistory
      .create({
        data: {
          userId: session?.user?.id ?? null,
          params: input as object,
          resultCount: hotelsWithBoardNames.length,
        },
      })
      .catch((e) => console.error("[SEARCH_HISTORY_WRITE]", e));

    return NextResponse.json({ ...results, hotels: hotelsWithBoardNames });
  } catch (error) {
    console.error("[POST /api/hotels/search]", error);
    return NextResponse.json(
      { error: "Otel arama sırasında bir hata oluştu" },
      { status: 500 }
    );
  }
}
