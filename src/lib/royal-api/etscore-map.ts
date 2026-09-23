// Etscore yanıtlarını uygulama tiplerine çeviren saf fonksiyonlar.
//
// Sayfalar ve API rotaları hotel.types / booking.types'ı kullanıyor; bu
// dosya o sözleşmeyi koruyor. Tedarikçi bir alanı değiştirirse ya da
// yeniden adlandırırsa düzeltilecek yer burası.

import type {
  CancellationPolicy,
  CurrencyDto,
  HotelListItem,
  HotelSearchRequest,
  HotelSearchResult,
  ReservationDetailResponse,
  RoomRequest,
  RoomResult,
  RoomSearchRequest,
  RoomSearchResponse,
} from "./types";
import type {
  EtsBookDetailResponse,
  EtsCancellationPolicy,
  EtsCeviri,
  EtsCurrency,
  EtsDestinationCode,
  EtsHotelListItem,
  EtsRate,
  EtsReservationDetail,
  EtsSearchHotel,
  EtsSearchRequest,
} from "./types/etscore.types";

/** Tek aramada gönderilecek otel kodu. API sınırı 250 (0904168); 200 kod ~4 sn. */
export const ETS_ARAMA_PAKETI = 200;

const yuvarla = (n: number) => Math.round(n * 100) / 100;

/** Çok dilli addan Türkçe olanı, yoksa İngilizceyi, yoksa ilkini seç. */
export function etsAd(c: EtsCeviri | undefined, yedek = ""): string {
  const t = c?.translations;
  if (!t) return yedek;
  return t.tr ?? t.en ?? Object.values(t)[0] ?? yedek;
}

/**
 * Etscore tarihini açık ISO'ya çevirir.
 *
 * Tarihler UTC+03:00 ama ek olmadan geliyor ("2026-10-18T17:59:00").
 * JavaScript bunu çalıştığı makinenin yerel saati sanar: İngiltere'deki
 * bir kullanıcı "ücretsiz iptal" son saatini 2–3 saat kaymış görürdü.
 * Ayrıca saniyenin 6 haneli kesiri geliyor ("…22.842875"); 3 haneye
 * indiriliyor, her ayrıştırıcı kabul etsin diye.
 */
export function etsTarih(s: string): string {
  if (!s) return s;
  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(s)) return s; // zaten saat dilimli
  const [ana, kesir] = s.split(".");
  const tarih = ana.length === 10 ? `${ana}T00:00:00` : ana;
  return `${tarih}${kesir ? `.${kesir.slice(0, 3)}` : ""}+03:00`;
}

function geceSayisi(checkIn: string, checkOut: string): number {
  const n = Math.round(
    (Date.parse(`${checkOut}T00:00:00Z`) - Date.parse(`${checkIn}T00:00:00Z`)) / 86_400_000
  );
  return n > 0 ? n : 1;
}

// ── İstekler ─────────────────────────────────────────────────────────────

function etsOdalar(rooms: RoomRequest[]): EtsSearchRequest["rooms"] {
  return rooms.map((r) => {
    const yaslar = r.childAges ?? [];
    return { adults: r.adult, child: yaslar.length, childAges: yaslar };
  });
}

export function etsAramaIstegi(
  req: Pick<HotelSearchRequest, "feedId" | "nationality" | "checkIn" | "checkOut" | "rooms">,
  hotelCodes: string[],
  tumFiyatlar: boolean
): EtsSearchRequest {
  return {
    hotelCodes,
    checkIn: req.checkIn,
    checkOut: req.checkOut,
    clientNationality: req.nationality || "TR",
    feedId: req.feedId,
    allPricesFlag: tumFiyatlar,
    rooms: etsOdalar(req.rooms),
  };
}

// ── Arama sonuçları ─────────────────────────────────────────────────────

/**
 * Otel kartı için özet. Yıldız, adres ve görsel aramada gelmiyor; boş
 * bırakılıyor, rota bunları kendi veritabanımızdan dolduruyor.
 *
 * `minPrice` GECELİK: kart "gecelik" yazıyor ve mock da gecelik veriyor.
 * Etscore totalPrice konaklamanın tamamı; geceye bölünüyor.
 */
export function etsOtelSonucu(
  h: EtsSearchHotel,
  istenenPara: string,
  checkIn: string,
  checkOut: string
): HotelSearchResult {
  const geceler = geceSayisi(checkIn, checkOut);
  const fiyatlar = h.rooms
    .map((r) => r.totalPrice / geceler)
    .filter((n) => Number.isFinite(n));
  const para = h.rooms[0]?.nightlyPrices[0]?.currency ?? istenenPara;
  return {
    hotelCode: h.hotelCode,
    hotelName: h.hotelName?.trim() ?? "",
    stars: 0,
    address: "",
    latitude: h.geoLocation?.lat ?? 0,
    longitude: h.geoLocation?.lon ?? 0,
    thumbnailImage: "",
    minPrice: fiyatlar.length ? yuvarla(Math.min(...fiyatlar)) : 0,
    currency: para,
    boardTypes: [...new Set(h.rooms.map((r) => r.mealTypeCode).filter(Boolean))],
    freeCancellation: h.rooms.some((r) => r.refundable),
  };
}

function etsIptalPolitikasi(p: EtsCancellationPolicy): CancellationPolicy {
  return {
    fromDate: etsTarih(p.fromDate),
    toDate: etsTarih(p.toDate),
    penalty: p.amount,
    penaltyCurrency: p.currency,
    description: "",
  };
}

/**
 * Tek fiyat seçeneği → oda satırı.
 *
 * `priceCode` = Etscore'un `rateId`'si. Aynı oda (roomCode) iade
 * edilebilir ve edilemez olarak iki kez gelebiliyor; ayırt eden rateId.
 *
 * İade edilemeyen fiyatlarda Etscore boş politika dizisi gönderiyor. Boş
 * dizi arayüzde "iptal bilgisi yok" gibi okunurdu; gerçekte anlamı
 * "rezervasyon anından itibaren iptal = tüm tutar". Tam olarak bu tek
 * pencere olarak yazılıyor.
 */
export function etsOdaSonucu(
  rate: EtsRate,
  checkIn: string,
  checkOut: string,
  istenenPara: string
): RoomResult {
  const para = rate.nightlyPrices[0]?.currency ?? istenenPara;
  const politikalar = rate.refundable
    ? rate.cancellationPolicies.map(etsIptalPolitikasi)
    : [
        {
          fromDate: new Date().toISOString(),
          toDate: etsTarih(checkIn),
          penalty: rate.totalPrice,
          penaltyCurrency: para,
          description: "İade edilemez",
        },
      ];

  return {
    roomCode: rate.roomCode,
    roomName: rate.roomType?.replace(/[,\s]+$/, "") ?? "",
    boardType: rate.mealTypeCode,
    boardTypeName: rate.mealType,
    priceCode: rate.rateId,
    totalPrice: yuvarla(rate.totalPrice),
    nightlyPrice: yuvarla(rate.totalPrice / geceSayisi(checkIn, checkOut)),
    currency: para,
    cancellationPolicies: politikalar,
    attributes: rate.bedTypes.map((b) => ({ id: b.id, categoryName: "Yatak", name: b.name })),
    images: [],
    allotment: rate.allotment ?? 0,
  };
}

/**
 * Oda arama yanıtı. Etscore'un ayrı "room search" ucu belgelenmemiş; oteli
 * tek başına aratıp (tüm fiyatlarla) aynı bilgiyi alıyoruz.
 *
 * `roomSearchId` sentetik: gerçek oda arama ucunun döndüreceği kimlik
 * bilinmiyor. Rezervasyon oluşturma ucu belgelenince bu değişecek.
 */
export function etsOdaAramaYaniti(
  otel: EtsSearchHotel | undefined,
  req: RoomSearchRequest
): RoomSearchResponse {
  const odalar = (otel?.rooms ?? [])
    .map((r) => etsOdaSonucu(r, req.checkIn, req.checkOut, req.currency))
    .sort((a, b) => a.totalPrice - b.totalPrice);

  return {
    roomSearchId: `ets:${req.hotelCode}:${req.checkIn}:${req.checkOut}`,
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    rooms: odalar,
  };
}

// ── İçerik ───────────────────────────────────────────────────────────────

export function etsParaBirimi(c: EtsCurrency): CurrencyDto {
  return { code: c.isoCode, name: etsAd(c.name, c.isoCode) };
}

/** Otel listesi yalnızca ad ve kod veriyor; diğer alanlar boş gelir. */
export function etsOtelListeOgesi(h: EtsHotelListItem): HotelListItem {
  return {
    hotelCode: h.id,
    name: h.name?.trim() ?? "",
    stars: 0,
    address: "",
    latitude: 0,
    longitude: 0,
    thumbnailImage: "",
    locationId: 0,
    facilities: [],
    images: [],
  };
}

/**
 * Etscore konum türü → bizim enum. Hiyerarşi (parentId) destinationCodes
 * dizisinin sırasından kuruluyor, tür yalnızca etiket.
 */
export function etsKonumTuru(
  tur: EtsDestinationCode["type"]
): "COUNTRY" | "CITY" | "DISTRICT" | "AREA" {
  switch (tur) {
    case "COUNTRY":
      return "COUNTRY";
    case "REGION":
      return "AREA";
    case "CITY":
      return "CITY";
    default: // TOWN, CUSTOMREGION
      return "DISTRICT";
  }
}

// ── Rezervasyon detayı ───────────────────────────────────────────────────

/**
 * RESERVATION → CONFIRMED, CANCELLED ve CANCELLED_PENALTY → CANCELLED.
 * Cezalı iptal ile cezasız iptal bizde aynı durum; fark iptal ücreti
 * alanında tutuluyor.
 */
export function etsDurum(s: string | undefined): string {
  if (s === "RESERVATION") return "CONFIRMED";
  if (s === "CANCELLED" || s === "CANCELLED_PENALTY") return "CANCELLED";
  return s ?? "PENDING";
}

/**
 * Dokümana göre yazıldı; gerçek bir rezervasyonla henüz doğrulanmadı
 * (rezervasyon oluşturma ucu belgelenmemiş). Bu yüzden her alan savunmacı.
 */
export function etsRezervasyonDetayi(d: EtsBookDetailResponse): ReservationDetailResponse {
  const detaylar: EtsReservationDetail[] = Array.isArray(d.reservationDetails)
    ? d.reservationDetails
    : d.reservationDetails
      ? [d.reservationDetails]
      : [];
  const ilk = detaylar[0];
  const [ad, ...soyad] = (d.contactName ?? "").trim().split(/\s+/);

  return {
    bookingNumber: d.bookingNumber || d.voucher,
    clientReferenceId: d.clientReferenceId ?? "",
    status: etsDurum(ilk?.status),
    hotelCode: "",
    hotelName: d.hotelName,
    checkIn: d.checkIn,
    checkOut: d.checkOut,
    boardType: ilk?.mealTypeCode ?? "",
    roomType: ilk?.roomType ?? "",
    totalPrice: d.price,
    currency: d.currency,
    contact: { name: ad ?? "", surname: soyad.join(" "), email: "", phone: d.contactPhone ?? "" },
    guests: [],
    cancellationPolicies: (d.cancellationPolicies ?? []).map(etsIptalPolitikasi),
    roomConfirmationCodes: detaylar.map((x) => x.roomCode).filter((x): x is string => !!x),
    createdAt: ilk?.date ?? "",
  };
}
