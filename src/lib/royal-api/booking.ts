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
  RoomSearchRequest,
  RoomSearchResponse,
  CreateBookingRequest,
  CreateBookingResponse,
} from "./types";
import type { EtsBookResponse, EtsRoomSearchResponse } from "./types/etscore.types";

const ROYAL = "/api/v1/generic-api-service/royal";

// ── Fiyat kodu hafızası ──────────────────────────────────────────────────
//
// Rezervasyonda Etscore ödeme tutarını ister ve kendi fiyatıyla karşılaştırır.
// O tutar Etscore'un NET fiyatı olmalı: sayfanın taşıdığı fiyat hem
// kurallarla değişmiş olabilir hem de URL'den geldiği için güvenilmez. Oda
// araması her priceCode'un net fiyatını burada tutar, rezervasyon buradan
// okur. Ömrü priceCode'unkiyle aynı: 30 dakika. Süreç içi — uygulama tek
// süreçte koşuyor; yeniden başlarsa kullanıcı odaları yeniden arar.

const FIYAT_OMRU_MS = 30 * 60 * 1000;

interface NetFiyat {
  tutar: number;
  para: string;
  hotelCode: string;
  roomSearchId: string;
  zaman: number;
}

const netFiyatlar = new Map<string, NetFiyat>();

function netFiyatlariKaydet(d: EtsRoomSearchResponse, para: string): void {
  const simdi = Date.now();
  for (const [kod, f] of netFiyatlar) if (simdi - f.zaman > FIYAT_OMRU_MS) netFiyatlar.delete(kod);
  for (const oda of d.rooms ?? [])
    for (const r of oda.rates ?? [])
      netFiyatlar.set(r.priceCode, {
        tutar: r.totalPrice,
        para: r.nightlyPrices[0]?.currency ?? para,
        hotelCode: d.hotelCode,
        roomSearchId: d.roomSearchId,
        zaman: simdi,
      });
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
  if (USE_MOCK) return mockSearchRooms(params);

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

  if (arama) netFiyatlariKaydet(arama, params.currency);
  return etsOdaAramaYaniti(arama, params, etsOdaGorselleri(detay));
}

export async function createBooking(params: CreateBookingRequest): Promise<CreateBookingResponse> {
  if (USE_MOCK) return mockCreateBooking(params);

  // Dokümana göre şimdilik rezervasyon başına tek oda.
  if (params.rooms.length !== 1) {
    throw new EtscoreError(422, "TEK_ODA", "Etscore şimdilik rezervasyon başına tek oda kabul ediyor");
  }

  const net = netFiyatlar.get(params.priceCode);
  if (!net || Date.now() - net.zaman > FIYAT_OMRU_MS || net.hotelCode !== params.hotelCode) {
    throw new EtscoreError(
      409,
      FIYAT_SURESI_DOLDU,
      "Fiyatın geçerlilik süresi doldu, lütfen odaları yeniden arayın"
    );
  }

  const d = await royalApiClient.post<EtsBookResponse>(
    `${ROYAL}/book`,
    etsRezervasyonIstegi(params, net),
    { currency: net.para }
  );
  // Aynı fiyat koduyla ikinci rezervasyon denenmesin.
  netFiyatlar.delete(params.priceCode);
  if (!d?.success || !d.voucher) {
    throw new EtscoreError(422, "REZERVASYON_BASARISIZ", "Rezervasyon tamamlanamadı, lütfen tekrar deneyin");
  }
  return etsRezervasyonYaniti(d);
}
