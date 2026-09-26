import { EtscoreError, royalApiClient } from "./client";
import {
  etsOdaAramaIstegi,
  etsOdaAramaYaniti,
  etsOdaGorselleri,
  etsRezervasyonIstegi,
  etsRezervasyonYaniti,
} from "./etscore-map";
import { etsOtelDetayiGetir } from "./hotel";
import { USE_MOCK, mockSearchRooms, mockCreateBooking } from "./mock";
import type {
  CancellationPolicy,
  RoomSearchRequest,
  RoomSearchResponse,
  CreateBookingRequest,
  CreateBookingResponse,
} from "./types";
import type { EtsBookResponse, EtsRoomSearchResponse } from "./types/etscore.types";

const ROYAL = "/api/v1/generic-api-service/royal";

// ── Fiyat kodu kaydı ─────────────────────────────────────────────────────
//
// Oda araması her priceCode için Etscore'un NET fiyatını ve fiyatı belirleyen
// koşulları (otel, pansiyon, tarihler, kişi sayıları, iptal koşulları, feed)
// burada tutar. Rezervasyon bunların hiçbirini tarayıcıdan almaz: sayfanın
// taşıdığı değerler URL'den geldiği için değiştirilebilir. Etscore da ödeme
// tutarını kendi net fiyatıyla karşılaştırıyor.
//
// Ömrü priceCode'unkiyle aynı: 30 dakika. Süreç içi — uygulama tek süreçte
// koşuyor; yeniden başlarsa kullanıcı odaları yeniden arar.

const FIYAT_OMRU_MS = 30 * 60 * 1000;

export interface FiyatKaydi {
  /** Etscore net fiyatı (konaklamanın toplamı). */
  tutar: number;
  para: string;
  hotelCode: string;
  roomSearchId: string;
  feedId: string;
  boardType: string;
  boardTypeName: string;
  roomName: string;
  checkIn: string;
  checkOut: string;
  /** Aramadaki kişi sayıları (tek oda). */
  odalar: RoomSearchRequest["rooms"];
  iptal: CancellationPolicy[];
  zaman: number;
}

const fiyatKayitlari = new Map<string, FiyatKaydi>();

function fiyatlariKaydet(yanit: RoomSearchResponse, params: RoomSearchRequest): void {
  const simdi = Date.now();
  for (const [kod, f] of fiyatKayitlari) if (simdi - f.zaman > FIYAT_OMRU_MS) fiyatKayitlari.delete(kod);
  for (const oda of yanit.rooms)
    fiyatKayitlari.set(oda.priceCode, {
      tutar: oda.totalPrice,
      para: oda.currency || params.currency,
      hotelCode: params.hotelCode,
      roomSearchId: yanit.roomSearchId,
      feedId: params.feedId,
      boardType: oda.boardType,
      boardTypeName: oda.boardTypeName,
      roomName: oda.roomName,
      checkIn: params.checkIn,
      checkOut: params.checkOut,
      odalar: params.rooms,
      iptal: oda.cancellationPolicies,
      zaman: simdi,
    });
}

/** Geçerli fiyat kaydı (yoksa ya da süresi dolduysa null). */
export function fiyatKaydi(priceCode: string): FiyatKaydi | null {
  const k = fiyatKayitlari.get(priceCode);
  if (!k || Date.now() - k.zaman > FIYAT_OMRU_MS) return null;
  return k;
}

/**
 * Fiyat kodunu rezervasyon için ayırır: kayıt haritadan çıkar. Senkron —
 * aynı anda gelen ikinci istek (çift tıklama, iki sekme) kaydı bulamaz.
 */
export function fiyatKodunuAyir(priceCode: string): FiyatKaydi | null {
  const k = fiyatKaydi(priceCode);
  if (k) fiyatKayitlari.delete(priceCode);
  return k;
}

/** Rezervasyon Etscore'a hiç ulaşmadan ya da reddedilerek bitti: kod yeniden kullanılabilir. */
export function fiyatKodunuGeriKoy(priceCode: string, k: FiyatKaydi): void {
  if (Date.now() - k.zaman <= FIYAT_OMRU_MS) fiyatKayitlari.set(priceCode, k);
}

/** Fiyat kodu bilinmiyor ya da süresi doldu — kullanıcı odaları yeniden aramalı. */
export const FIYAT_SURESI_DOLDU = "FIYAT_SURESI_DOLDU";

/**
 * Bir otelin odaları ve fiyatları.
 *
 * Oda araması fotoğraf vermiyor; otel detayındaki oda fotoğrafları oda
 * koduna göre ekleniyor. Detay alınamazsa odalar fotoğrafsız gelir, arama
 * bundan etkilenmez.
 */
export async function searchRooms(params: RoomSearchRequest): Promise<RoomSearchResponse> {
  if (USE_MOCK) {
    const yanit = await mockSearchRooms(params);
    fiyatlariKaydet(yanit, params);
    return yanit;
  }

  const [arama, detay] = await Promise.all([
    royalApiClient
      .post<EtsRoomSearchResponse>(`${ROYAL}/room/search`, etsOdaAramaIstegi(params), {
        currency: params.currency,
      })
      .catch((e) => {
        if (e instanceof EtscoreError && e.musaitlikYok) return null;
        throw e;
      }),
    etsOtelDetayiGetir(params.hotelCode).catch(() => null),
  ]);

  const yanit = etsOdaAramaYaniti(arama, params, etsOdaGorselleri(detay));
  fiyatlariKaydet(yanit, params);
  return yanit;
}

/**
 * Etscore'da rezervasyon. `kayit`: fiyat kodunun sunucudaki kaydı (net fiyat,
 * tarihler) — çağıran fiyatKodunuAyir ile ayırmış olmalı.
 *
 * Hata türleri (EtscoreError):
 *   • belirsiz (zaman aşımı, bağlantı, 5xx): rezervasyon oluşmuş olabilir;
 *   • diğer 4xx: Etscore reddetti, rezervasyon oluşmadı.
 */
export async function createBooking(params: CreateBookingRequest, kayit: FiyatKaydi): Promise<CreateBookingResponse> {
  if (USE_MOCK) return mockCreateBooking(params);

  // Dokümana göre şimdilik rezervasyon başına tek oda.
  if (params.rooms.length !== 1) {
    throw new EtscoreError(422, "TEK_ODA", "Etscore şimdilik rezervasyon başına tek oda kabul ediyor");
  }

  const d = await royalApiClient.post<EtsBookResponse>(
    `${ROYAL}/book`,
    etsRezervasyonIstegi(
      { ...params, roomSearchId: kayit.roomSearchId, hotelCode: kayit.hotelCode, checkIn: kayit.checkIn, checkOut: kayit.checkOut },
      kayit
    ),
    // Rezervasyon oteli de onaylatabiliyor; aramadan uzun bekle.
    { currency: kayit.para, zamanAsimiMs: 90_000 }
  );
  if (!d?.success || !d.voucher) {
    throw new EtscoreError(422, "REZERVASYON_BASARISIZ", "Rezervasyon tamamlanamadı, lütfen tekrar deneyin");
  }
  return etsRezervasyonYaniti(d);
}
