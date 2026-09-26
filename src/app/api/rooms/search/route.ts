import { etsDili } from "@/lib/royal-api/client";
import { aramaHatasi } from "@/lib/dogrulama";
import { getLocale, getTranslations } from "next-intl/server";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { roomSearchSchema } from "@/lib/validators";
import { searchRooms } from "@/lib/royal-api";
import { calculatePrice, fiyatBaglami, otelKonumAdlari } from "@/lib/pricing";
import type { RoomResult } from "@/lib/royal-api/types";
import { feedBul } from "@/lib/feed";
import { politikalariOranla } from "@/lib/rezervasyon-yanit";

// POST /api/rooms/search
// Bir otelin odaları (Etscore) ve her odanın satış fiyatı (fiyat motoru).
// Net fiyat ve fiyat kodunun koşulları sunucuda kalır (lib/royal-api/booking
// fiyat kaydı); rezervasyon ve kupon oradan hesaplar.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);

    const parsed = roomSearchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(await aramaHatasi(parsed.error), { status: 400 });
    }

    const input = parsed.data;

    // Feed: müşteri B2C, onaylı acente kendi feed'i (rezervasyon aynısını ister).
    const session = await getServerSession(authOptions);
    const agencyId = session?.user.role === "AGENCY" ? session.user.agencyId ?? undefined : undefined;
    const feedId = await feedBul(session?.user.role, agencyId);

    // Oda ve pansiyon adları sitenin dilinde (Etscore Accept-Language).
    const apiResponse = await searchRooms(
      {
        feedId,
        currency: input.currency,
        nationality: input.nationality,
        checkIn: input.checkIn,
        checkOut: input.checkOut,
        hotelCode: input.hotelCode,
        rooms: input.rooms,
      },
      etsDili(await getLocale())
    );

    // Fiyat motoru her odaya; kurallar, indirimler ve komisyonlar bir kez.
    const userType = (session?.user.role as "CUSTOMER" | "AGENCY" | "ADMIN") ?? "CUSTOMER";
    const yonetici = userType === "ADMIN";
    const baglam = await fiyatBaglami(userType, agencyId);
    const konumAdlari = (await otelKonumAdlari(baglam, [input.hotelCode])).get(input.hotelCode);
    const gece = Math.max(1, Math.round((Date.parse(input.checkOut) - Date.parse(input.checkIn)) / 864e5));
    const roomsWithPricing = await Promise.all(
      (apiResponse.rooms ?? []).map(async (room: RoomResult) => {
        const f = await calculatePrice({
          basePrice: room.totalPrice,
          userType,
          agencyId,
          hotelCode: input.hotelCode,
          boardType: room.boardType,
          checkIn: input.checkIn,
          checkOut: input.checkOut,
          baglam,
          konumAdlari,
        });
        const pricing = {
          oncekiFiyat: f.oncekiFiyat,
          finalPrice: f.finalPrice,
          totalDiscount: f.totalDiscount,
          kampanya: f.kampanya,
          ...(userType === "AGENCY" ? { commissionAmount: f.commissionAmount } : {}),
          // Net fiyat ve kural dökümü (kâr payı) yalnız yönetime.
          ...(yonetici ? { originalPrice: f.originalPrice, appliedRules: f.appliedRules, commissionAmount: f.commissionAmount } : {}),
        };
        if (yonetici) return { ...room, pricing };
        // Müşteri/acente: tutarlar satış fiyatından, iptal ücretleri ona oranlı.
        return {
          ...room,
          totalPrice: f.finalPrice,
          nightlyPrice: Math.round((f.finalPrice / gece) * 100) / 100,
          cancellationPolicies: politikalariOranla(room.cancellationPolicies, room.totalPrice, f.finalPrice),
          pricing,
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
    return NextResponse.json({ error: (await getTranslations("api.arama"))("odaHatasi") }, { status: 500 });
  }
}
