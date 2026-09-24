import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { EtscoreError, royalApiClient } from "./client";
import {
  ETS_ARAMA_PAKETI,
  etsAramaIstegi,
  etsOtelDetayi,
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
  HotelSearchResult,
  HotelDetailResponse,
  HotelListRequest,
  HotelListItem,
} from "./types";
import type {
  EtsHotelListItem,
  EtsSayfa,
  EtsSearchHotel,
  EtsSearchResponse,
  EtsHotelDetail,
} from "./types/etscore.types";

const ARAMA = "/api/v1/generic-api-service/royal/hotel/search";
const ICERIK = "/api/v1/generic-api-service/content";
const OTEL_LISTESI = `${ICERIK}/hotel/find-by-paging`;

/** Toplu işlerde (indeks, fiyat taraması) aynı anda en fazla bu kadar paket. */
const PARALEL = 3;

/** Otel listesinde sayfa boyu. 5000 kayıt ~1 sn (ölçüldü); 15.679 otel 4 istek. */
const LISTE_SAYFASI = 5000;

async function paketlerHalinde<T, R>(
  ogeler: T[],
  boyut: number,
  paralel: number,
  fn: (paket: T[]) => Promise<R[]>
): Promise<R[]> {
  const paketler: T[][] = [];
  for (let i = 0; i < ogeler.length; i += boyut) paketler.push(ogeler.slice(i, i + boyut));
  const sonuc: R[] = [];
  for (let i = 0; i < paketler.length; i += paralel) {
    const dalga = await Promise.all(paketler.slice(i, i + paralel).map(fn));
    sonuc.push(...dalga.flat());
  }
  return sonuc;
}

/**
 * Kullanıcı aramasında paket boyu. Etscore'un süresi pakette fiyat veren otel
 * sayısıyla artıyor (~30 ms/otel), paketler paralel gidiyor: küçük paket =
 * kısa bekleme. İstanbul, 600 kod, 295 fiyatlı otel (ölçüldü):
 *   200 × 3   toplam 4,7 sn, ilk paket 2,7 sn
 *   100 × 6   toplam 2,8 sn, ilk paket 1,3 sn
 *    50 × 12  toplam 2,4 sn, ilk paket 0,3 sn
 * Toplu işler 200'lük pakette kalıyor: çağrı sayısı dört katına çıkmasın.
 */
export const KULLANICI_PAKETI = 50;

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
  tumFiyatlar: boolean,
  opts: {
    /** Varsayılan 200 (toplu işler); kullanıcı araması KULLANICI_PAKETI. */
    paket?: number;
    /** Varsayılan 3; kullanıcı aramasında hepsi birden (hız sınırlayıcı zaten sıraya koyuyor). */
    paralel?: number;
    /** Her paket dönünce — sonuçları gelen gelene göstermek için. */
    onPaket?: (oteller: EtsSearchHotel[]) => void | Promise<void>;
  } = {}
): Promise<EtsSearchHotel[]> {
  const { paket = ETS_ARAMA_PAKETI, paralel = PARALEL, onPaket } = opts;
  return paketlerHalinde(hotelCodes, paket, paralel, async (kodlar) => {
    const oteller = await paketAra(req, kodlar, tumFiyatlar);
    if (onPaket && oteller.length) await onPaket(oteller);
    return oteller;
  });
}

/**
 * Otel araması. `onParca` verilirse her paketin otelleri geldikçe çağrılır;
 * dönen değer yine tüm sonuçlar.
 */
export async function searchHotels(
  params: HotelSearchRequest,
  onParca?: (oteller: HotelSearchResult[]) => void | Promise<void>
): Promise<HotelSearchResponse> {
  const cevir = (h: EtsSearchHotel) => etsOtelSonucu(h, params.currency, params.checkIn, params.checkOut);

  if (USE_MOCK) {
    const mock = await mockSearchHotels(params);
    if (onParca && mock.hotels.length) await onParca(mock.hotels);
    return mock;
  }

  const oteller = await etsOtelAra(params, params.hotelCodes, false, {
    paket: KULLANICI_PAKETI,
    paralel: Math.ceil(params.hotelCodes.length / KULLANICI_PAKETI),
    onPaket: onParca ? (parca) => onParca(parca.map(cevir)) : undefined,
  });

  return { searchId: randomUUID(), hotels: oteller.map(cevir) };
}

// Otel detayı değişmiyor sayılır (içerik güncellemesi revizyon ucuyla
// izlenir); her sayfa açılışında ve her oda aramasında yeniden istemek
// gereksiz. Süreç içi, 1 saat.
const DETAY_OMRU_MS = 60 * 60 * 1000;
// Sınırsız olsaydı toplu içerik senkronu 15 bin detayı (~30 KB) belleğe
// doldururdu: ~450 MB, 2 GB'lık sunucuda. En eskiler atılıyor (Map ekleme
// sırasını korur).
const DETAY_EN_FAZLA = 500;
const detayOnbellegi = new Map<string, { d: EtsHotelDetail; zaman: number }>();

/** Ham otel detayı (önbellekli). Oda araması fotoğraflar için de kullanıyor. */
export async function etsOtelDetayiGetir(hotelCode: string, taze = false): Promise<EtsHotelDetail> {
  const kayit = detayOnbellegi.get(hotelCode);
  if (!taze && kayit && Date.now() - kayit.zaman < DETAY_OMRU_MS) return kayit.d;
  const d = await royalApiClient.post<EtsHotelDetail>(`${ICERIK}/hotel/detail`, { hotelId: hotelCode });
  detayOnbellegi.delete(hotelCode);
  detayOnbellegi.set(hotelCode, { d, zaman: Date.now() });
  if (detayOnbellegi.size > DETAY_EN_FAZLA) {
    detayOnbellegi.delete(detayOnbellegi.keys().next().value!);
  }
  return d;
}

export async function getHotelDetail(hotelCode: string): Promise<HotelDetailResponse> {
  if (USE_MOCK) return mockGetHotelDetail(hotelCode);

  const d = await etsOtelDetayiGetir(hotelCode);
  // Detay olanağın adını veriyor, grubunu vermiyor; grup bizim tabloda
  // (syncFacilities).
  const ids = (d.facilities ?? []).map((f) => String(f.id));
  const kategoriler = new Map(
    (
      await prisma.hotelFacility.findMany({
        where: { externalId: { in: ids } },
        select: { externalId: true, category: true },
      })
    ).map((f) => [Number(f.externalId), f.category])
  );
  return etsOtelDetayi(d, kategoriler);
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
