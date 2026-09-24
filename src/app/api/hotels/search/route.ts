import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/prisma";
import { hotelSearchSchema } from "@/lib/validators";
import { searchHotels } from "@/lib/royal-api";
import type { HotelSearchResult } from "@/lib/royal-api/types";
import { boardTypeAdlari } from "@/lib/board-types";
import { hedefOtelKodlari } from "@/lib/otel-arama";
import { aramaAnahtari, onbellegeYaz, onbellektenAl, type AramaKaydi } from "@/lib/arama-onbellegi";

// POST /api/hotels/search
//
// İki yanıt biçimi:
//   • Accept: application/x-ndjson → AKIŞ. Etscore'a 50'lik paketler paralel
//     gidiyor; her paketin otelleri geldiği anda bir satır olarak yazılıyor.
//     İlk oteller ~0,3 sn'de ekranda, liste ~2,5 sn'de tamam (İstanbul).
//       {"tip":"bas","searchId":…,"eslesme":…,"onbellek":false}
//       {"tip":"oteller","hotels":[…]}          ← her paket için
//       {"tip":"son","toplam":295}   ya da   {"tip":"hata","error":"…"}
//   • Aksi halde tek JSON: { searchId, hotels, eslesme } (eski istemciler).
//
// Aynı arama 10 dakika içinde tekrar gelirse Etscore'a gidilmez
// (lib/arama-onbellegi.ts).
//
// B2B kullanıcılar (AGENCY + agencyId) kendi feedId'sini ya da B2B'yi,
// diğerleri B2C feedId'sini kullanır.

type Girdi = ReturnType<typeof hotelSearchSchema.parse>;

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

    const anahtar = aramaAnahtari({ ...input, feedId });
    const kayit = onbellektenAl(anahtar);
    const userId = session?.user?.id ?? null;
    const akis = request.headers.get("accept")?.includes("application/x-ndjson");

    if (!akis) {
      const sonuc = kayit ?? (await aramayiYurut(input, feedId, userId, anahtar));
      return NextResponse.json(sonuc);
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let acik = true;
        const yaz = (satir: object) => {
          if (!acik) return;
          try {
            controller.enqueue(encoder.encode(JSON.stringify(satir) + "\n"));
          } catch {
            acik = false; // istemci ayrıldı; arama sürüp önbelleği doldursun
          }
        };
        try {
          if (kayit) {
            yaz({ tip: "bas", searchId: kayit.searchId, eslesme: kayit.eslesme, onbellek: true });
            if (kayit.hotels.length) yaz({ tip: "oteller", hotels: kayit.hotels });
            yaz({ tip: "son", toplam: kayit.hotels.length });
          } else {
            const sonuc = await aramayiYurut(input, feedId, userId, anahtar, {
              onBas: (searchId, eslesme) => yaz({ tip: "bas", searchId, eslesme, onbellek: false }),
              onParca: (hotels) => yaz({ tip: "oteller", hotels }),
            });
            yaz({ tip: "son", toplam: sonuc.hotels.length });
          }
        } catch (error) {
          console.error("[POST /api/hotels/search akış]", error);
          yaz({ tip: "hata", error: "Otel arama sırasında bir hata oluştu" });
        } finally {
          if (acik) controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-store",
        // nginx yanıtı tamponlarsa akış kullanıcıya tek parça ulaşır.
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    console.error("[POST /api/hotels/search]", error);
    return NextResponse.json(
      { error: "Otel arama sırasında bir hata oluştu" },
      { status: 500 }
    );
  }
}

/**
 * Aramayı yürütür, sonucu önbelleğe yazar. `onParca` her paketin
 * zenginleştirilmiş otelleriyle çağrılır.
 */
async function aramayiYurut(
  input: Girdi,
  feedId: string,
  userId: string | null,
  anahtar: string,
  dinle: {
    onBas?: (searchId: string, eslesme: string) => void;
    onParca?: (hotels: HotelSearchResult[]) => void;
  } = {}
): Promise<AramaKaydi> {
  // Yazılanı otel kodlarına çevir — konum adında, bulunamazsa otel adında.
  // Etscore şehre göre arama sunmuyor, eşleşme bizim veritabanımızda
  // (bkz. lib/otel-arama.ts).
  const hedef = await hedefOtelKodlari(input.destination);
  if (hedef.kodlar.length === 0) {
    dinle.onBas?.("", hedef.eslesme);
    return { searchId: "", hotels: [], eslesme: hedef.eslesme };
  }

  const searchId = crypto.randomUUID();
  dinle.onBas?.(searchId, hedef.eslesme);
  const boardTypeNames = await boardTypeAdlari();
  const tumu: HotelSearchResult[] = [];

  await searchHotels(
    {
      feedId,
      currency: input.currency,
      nationality: input.nationality,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      hotelCodes: hedef.kodlar,
      rooms: input.rooms,
    },
    async (parca) => {
      const zengin = await zenginlestir(parca, boardTypeNames);
      tumu.push(...zengin);
      dinle.onParca?.(zengin);
    }
  );

  // Fiyatla dönen otelleri işaretle: sonraki geniş aramalarda önce onlar
  // seçilir (bkz. otel-arama.ts). Sonucu bekletmesin.
  if (tumu.length) {
    void prisma.hotel
      .updateMany({
        where: { hotelCode: { in: tumu.map((h) => h.hotelCode) } },
        data: { lastPricedAt: new Date() },
      })
      .catch((e) => console.error("[FIYAT_GORULDU]", e));
  }

  // Arama geçmişi — analitik ve ileride kişiselleştirme için. Ekrandaki
  // "son aramaların" listesi cihazdan besleniyor (girişsiz kullanıcıda da
  // çalışsın diye), burası ondan bağımsız. Bilerek await edilmiyor.
  void prisma.searchHistory
    .create({ data: { userId, params: input as object, resultCount: tumu.length } })
    .catch((e) => console.error("[SEARCH_HISTORY_WRITE]", e));

  const sonuc = { searchId, hotels: tumu, eslesme: hedef.eslesme };
  onbellegeYaz(anahtar, sonuc);
  return sonuc;
}

/**
 * Etscore aramada yıldız, adres ve görsel vermiyor; bunlar bizim
 * veritabanımızda. API'nin boş bıraktığı alanlar oradan dolduruluyor,
 * API'nin verdiği (fiyat, koordinat) ezilmiyor. Pansiyon kodları Türkçe
 * adlarına çevriliyor.
 */
async function zenginlestir(
  oteller: HotelSearchResult[],
  boardTypeNames: Map<string, string>
): Promise<HotelSearchResult[]> {
  const icerik = new Map(
    (
      await prisma.hotel.findMany({
        where: { hotelCode: { in: oteller.map((h) => h.hotelCode) } },
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

  return oteller.map((h) => {
    const db = icerik.get(h.hotelCode);
    const ilkGorsel = Array.isArray(db?.images)
      ? (db.images as unknown[]).find((x) => typeof x === "string")
      : undefined;
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
}
