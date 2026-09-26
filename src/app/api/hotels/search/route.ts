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
import { fiyatBaglami, fiyatla, otelKonumAdlari } from "@/lib/pricing";
import { feedBul } from "@/lib/feed";

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
// diğerleri B2C feedId'sini kullanır (lib/feed).

type Girdi = ReturnType<typeof hotelSearchSchema.parse>;

/** Şu an Etscore'da yürüyen aramalar (anahtar → sonuç). */
const yurutulen = new Map<string, Promise<AramaKaydi>>();
function tekSeferde(anahtar: string, fn: () => Promise<AramaKaydi>): Promise<AramaKaydi> {
  const p = fn().finally(() => yurutulen.delete(anahtar));
  yurutulen.set(anahtar, p);
  return p;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);

    const parsed = hotelSearchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Geçersiz istek verisi", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const input = parsed.data;

    const session = await getServerSession(authOptions);
    const feedId = await feedBul(session?.user.role, session?.user.agencyId);

    const anahtar = aramaAnahtari({ ...input, feedId });
    // Önbellekte yoksa ama aynı arama şu an yürüyorsa onu bekle: aynı anda
    // gelen aynı aramalar Etscore'a bir kez gider.
    const kayit = onbellektenAl(anahtar) ?? (await yurutulen.get(anahtar)?.catch(() => null)) ?? null;
    const userId = session?.user?.id ?? null;
    const akis = request.headers.get("accept")?.includes("application/x-ndjson");

    // Önbellekte Etscore'un ham fiyatları; kullanıcıya göre fiyat (kural,
    // kampanya, acente indirimi) her istekte uygulanır.
    const fiyatlat = await listeFiyatlayici(input, session?.user.role, session?.user.agencyId ?? undefined);

    if (!akis) {
      const sonuc = kayit ?? (await tekSeferde(anahtar, () => aramayiYurut(input, feedId, userId, anahtar)));
      return NextResponse.json({ ...sonuc, hotels: await fiyatlat(sonuc.hotels) });
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
            if (kayit.hotels.length) yaz({ tip: "oteller", hotels: await fiyatlat(kayit.hotels) });
            yaz({ tip: "son", toplam: kayit.hotels.length });
          } else {
            const sonuc = await tekSeferde(anahtar, () =>
              aramayiYurut(input, feedId, userId, anahtar, {
                onBas: (searchId, eslesme) => yaz({ tip: "bas", searchId, eslesme, onbellek: false }),
                onParca: async (hotels) => yaz({ tip: "oteller", hotels: await fiyatlat(hotels) }),
              })
            );
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
 * Arama listesinin fiyatları: gecelik minPrice'a fiyat motoru (kural →
 * kampanya → acente indirimi) konaklama toplamı üzerinden uygulanır, geceye
 * bölünür. Kampanya varsa üstü çizili önceki fiyat ve etiket eklenir. Liste
 * fiyatında pansiyon bilinmediği için pansiyona özel kurallar burada uymaz.
 */
async function listeFiyatlayici(input: Girdi, rol: string | undefined, agencyId: string | undefined) {
  const userType = rol === "AGENCY" ? "AGENCY" : rol === "ADMIN" ? "ADMIN" : "CUSTOMER";
  const b = await fiyatBaglami(userType, userType === "AGENCY" ? agencyId : undefined);
  // Kural, kampanya ve acente yoksa satış fiyatı = net fiyat; hesaba gerek yok.
  if (!b.kurallar.length && !b.indirimler.length && !b.acente) return async (h: HotelSearchResult[]) => h;
  const gece = Math.max(1, Math.round((Date.parse(input.checkOut) - Date.parse(input.checkIn)) / 864e5));
  return async (oteller: HotelSearchResult[]) => {
    const konumlar = await otelKonumAdlari(b, oteller.map((h) => h.hotelCode));
    return oteller.map((h) => {
      if (!(h.minPrice > 0)) return h;
      const s = fiyatla(b, {
        basePrice: h.minPrice * gece,
        hotelCode: h.hotelCode,
        checkIn: input.checkIn,
        checkOut: input.checkOut,
        konumAdlari: konumlar.get(h.hotelCode),
      });
      const gecelik = (n: number) => Math.round((n / gece) * 100) / 100;
      return {
        ...h,
        minPrice: gecelik(s.finalPrice),
        ...(s.kampanya ? { oncekiFiyat: gecelik(s.oncekiFiyat), kampanya: { ad: s.kampanya.ad, yuzde: s.kampanya.yuzde, tur: s.kampanya.tur } } : {}),
      };
    });
  };
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
    onParca?: (hotels: HotelSearchResult[]) => void | Promise<void>;
  } = {}
): Promise<AramaKaydi> {
  // Yazılanı otel kodlarına çevir — konum adında, bulunamazsa otel adında.
  // Etscore şehre göre arama sunmuyor, eşleşme bizim veritabanımızda
  // (bkz. lib/otel-arama.ts).
  const hedef = await hedefOtelKodlari(input.destination, input.locationId);
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
      await dinle.onParca?.(zengin);
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
