import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { belgelenmemis, EtscoreError, royalApiClient } from "./client";
import {
  ETS_ARAMA_PAKETI,
  etsAramaIstegi,
  etsOtelListeOgesi,
  etsOtelSonucu,
} from "./etscore-map";
import {
  USE_MOCK,
  mockSearchHotels,
  mockGetHotelDetail,
  mockGetHotelList,
} from "./mock";
import type {
  HotelSearchRequest,
  HotelSearchResponse,
  HotelDetailResponse,
  HotelListRequest,
  HotelListItem,
} from "./types";
import type {
  EtsHotelListItem,
  EtsSayfa,
  EtsSearchHotel,
  EtsSearchResponse,
} from "./types/etscore.types";

const ARAMA = "/api/v1/generic-api-service/royal/hotel/search";
const OTEL_LISTESI = "/api/v1/generic-api-service/content/hotel/find-by-paging";

/** Aynı anda en fazla bu kadar arama paketi. */
const PARALEL = 3;

/** Otel listesinde sayfa boyu. 5000 kayıt ~1 sn (ölçüldü); 15.679 otel 4 istek. */
const LISTE_SAYFASI = 5000;

async function paketlerHalinde<T, R>(ogeler: T[], boyut: number, fn: (paket: T[]) => Promise<R[]>): Promise<R[]> {
  const paketler: T[][] = [];
  for (let i = 0; i < ogeler.length; i += boyut) paketler.push(ogeler.slice(i, i + boyut));
  const sonuc: R[] = [];
  for (let i = 0; i < paketler.length; i += PARALEL) {
    const dalga = await Promise.all(paketler.slice(i, i + PARALEL).map(fn));
    sonuc.push(...dalga.flat());
  }
  return sonuc;
}

/**
 * Tek paketi arar. "Sonuç yok" kodları (bkz. ETS_SONUC_YOK) boş liste sayılır.
 *
 * Eskiden 0904172'de ("provider ülke tanımı yok") paket ikiye bölünüp
 * yeniden deneniyordu; kodun tek bir kötü otel yüzünden bütün paketi
 * reddettiği sanılıyordu. Ölçüm tersini gösterdi: tek başına 0904172 veren
 * otel, fiyat veren bir otelle aynı pakette OK dönüyor (16/16 çift, 200'lük
 * karışık paket). Yani 0904172 de "pakette satılabilir otel yok" demek;
 * bölmek hiçbir otel kazandırmıyor, yalnızca çağrı sayısını katlıyordu.
 */
async function paketAra(
  req: Pick<HotelSearchRequest, "feedId" | "nationality" | "checkIn" | "checkOut" | "rooms" | "currency">,
  kodlar: string[],
  tumFiyatlar: boolean
): Promise<EtsSearchHotel[]> {
  if (kodlar.length === 0) return [];
  try {
    const d = await royalApiClient.post<EtsSearchResponse>(
      ARAMA,
      etsAramaIstegi(req, kodlar, tumFiyatlar),
      { currency: req.currency }
    );
    return d?.hotels ?? [];
  } catch (e) {
    if (e instanceof EtscoreError && e.musaitlikYok) return [];
    throw e;
  }
}

/**
 * Etscore araması — ham yanıt. Oda arama ve konum indeksi de bunu kullanıyor.
 *
 * Kod listesi 200'lük paketlere bölünüyor (tek istekte 200 kod ~4 sn).
 * Müsaitlik yoksa Etscore boş liste yerine HTTP 400 dönüyor; o paket boş
 * sayılıyor, diğer paketler etkilenmiyor.
 */
export async function etsOtelAra(
  req: Pick<HotelSearchRequest, "feedId" | "nationality" | "checkIn" | "checkOut" | "rooms" | "currency">,
  hotelCodes: string[],
  tumFiyatlar: boolean
): Promise<EtsSearchHotel[]> {
  return paketlerHalinde(hotelCodes, ETS_ARAMA_PAKETI, (kodlar) => paketAra(req, kodlar, tumFiyatlar));
}

/**
 * Aramadan pansiyon adlarını öğren.
 *
 * Pansiyon tipleri ucu belgelenmemiş, ama her arama sonucu kodu ve Türkçe
 * adını birlikte taşıyor ("BB" → "Oda Kahvaltı"). Rota kodları bu tablodan
 * çeviriyor; böylece tablo arama yapıldıkça kendiliğinden doluyor.
 * Arama sonucunu bekletmesin diye await edilmiyor.
 */
function pansiyonAdlariniOgren(oteller: EtsSearchHotel[]): void {
  const adlar = new Map<string, string>();
  for (const h of oteller)
    for (const r of h.rooms) if (r.mealTypeCode && r.mealType) adlar.set(r.mealTypeCode, r.mealType);
  for (const [code, name] of adlar) {
    void prisma.boardType
      .upsert({ where: { code }, update: { name }, create: { code, name } })
      .catch((e) => console.error("[PANSIYON_OGREN]", code, e));
  }
}

export async function searchHotels(params: HotelSearchRequest): Promise<HotelSearchResponse> {
  if (USE_MOCK) return mockSearchHotels(params);

  const oteller = await etsOtelAra(params, params.hotelCodes, false);
  pansiyonAdlariniOgren(oteller);

  return {
    searchId: randomUUID(),
    hotels: oteller.map((h) => etsOtelSonucu(h, params.currency, params.checkIn, params.checkOut)),
  };
}

export async function getHotelDetail(hotelCode: string): Promise<HotelDetailResponse> {
  if (USE_MOCK) return mockGetHotelDetail(hotelCode);
  // Doküman "Hotel Detail (including images, descriptions)" servisinden söz
  // ediyor ama sayfası yok. Çağıran rota yerel veritabanına düşüyor.
  return belgelenmemis(`Otel detayı (${hotelCode})`);
}

/** Tüm otel listesi — yalnızca ad ve kod gelir. */
export async function getHotelList(params: HotelListRequest): Promise<HotelListItem[]> {
  if (USE_MOCK) return mockGetHotelList();
  void params; // Etscore listesi feed'e göre filtrelenmiyor

  const liste: HotelListItem[] = [];
  for (let sayfa = 0; ; sayfa++) {
    const d = await royalApiClient.get<EtsSayfa<EtsHotelListItem>>(
      `${OTEL_LISTESI}?page=${sayfa}&size=${LISTE_SAYFASI}`
    );
    liste.push(...d.content.map(etsOtelListeOgesi));
    if (sayfa + 1 >= d.totalPages || d.content.length === 0) break;
  }
  return liste;
}
