// Etscore yanıtlarını uygulama tiplerine çeviren saf fonksiyonlar.
//
// Sayfalar ve API rotaları hotel.types / booking.types'ı kullanıyor; bu
// dosya o sözleşmeyi koruyor. Tedarikçi bir alanı değiştirirse ya da
// yeniden adlandırırsa düzeltilecek yer burası.

import type {
  CancelBookingResponse,
  CancellationPolicy,
  CreateBookingRequest,
  CreateBookingResponse,
  CurrencyDto,
  FacilityDto,
  HotelDetailResponse,
  HotelFacilityItem,
  HotelImage,
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
  EtsBookRequest,
  EtsBookResponse,
  EtsCancellationPolicy,
  EtsCancelResponse,
  EtsCeviri,
  EtsCurrency,
  EtsDestinationCode,
  EtsGorsel,
  EtsHotelDetail,
  EtsHotelListItem,
  EtsMisafir,
  EtsOzellikSayfasi,
  EtsReservationDetail,
  EtsRoomRate,
  EtsRoomSearchRequest,
  EtsRoomSearchResponse,
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

/** Oda araması isteği. Etscore şimdilik rezervasyon başına tek oda kabul ediyor. */
export function etsOdaAramaIstegi(req: RoomSearchRequest): EtsRoomSearchRequest {
  return {
    hotelCode: req.hotelCode,
    checkIn: req.checkIn,
    checkOut: req.checkOut,
    feedId: req.feedId,
    clientNationality: req.nationality || "TR",
    rooms: etsOdalar(req.rooms),
  };
}

type EtsOda = EtsRoomSearchResponse["rooms"][number];

/**
 * Tek fiyat seçeneği → oda satırı.
 *
 * `priceCode` = Etscore'un priceCode'u: rezervasyonda gönderilen, 30 dakika
 * geçerli anahtar. Aynı oda farklı pansiyonlarla birden çok kez gelir.
 *
 * İade edilemeyen fiyatlarda Etscore boş politika dizisi gönderiyor. Boş
 * dizi arayüzde "iptal bilgisi yok" gibi okunurdu; gerçekte anlamı
 * "rezervasyon anından itibaren iptal = tüm tutar". Tam olarak bu tek
 * pencere olarak yazılıyor.
 */
export function etsOdaSonucu(
  oda: EtsOda,
  rate: EtsRoomRate,
  checkIn: string,
  checkOut: string,
  istenenPara: string,
  gorseller: string[] = []
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
    roomCode: oda.roomCode,
    roomName: oda.roomType?.replace(/[,\s]+$/, "") ?? "",
    boardType: rate.mealTypeCode,
    boardTypeName: rate.mealType,
    priceCode: rate.priceCode,
    totalPrice: yuvarla(rate.totalPrice),
    nightlyPrice: yuvarla(rate.totalPrice / geceSayisi(checkIn, checkOut)),
    currency: para,
    cancellationPolicies: politikalar,
    attributes: (oda.bedTypes ?? []).map((b) => ({ id: b.id, categoryName: "Yatak", name: b.name })),
    images: gorseller,
    allotment: rate.allotment ?? 0,
  };
}

/**
 * Oda arama yanıtı. `gorseller`: oda koduna göre fotoğraflar (otel
 * detayından); oda araması fotoğraf vermiyor.
 */
export function etsOdaAramaYaniti(
  d: EtsRoomSearchResponse | null,
  req: RoomSearchRequest,
  gorseller: Map<string, string[]> = new Map()
): RoomSearchResponse {
  const odalar = (d?.rooms ?? [])
    .flatMap((oda) =>
      (oda.rates ?? []).map((r) =>
        etsOdaSonucu(oda, r, req.checkIn, req.checkOut, req.currency, gorseller.get(oda.roomCode))
      )
    )
    .sort((a, b) => a.totalPrice - b.totalPrice);

  return {
    roomSearchId: d?.roomSearchId ?? "",
    // priceCode'un ömrü 30 dakika (doküman).
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    rooms: odalar,
  };
}

// ── Otel detayı ──────────────────────────────────────────────────────────

/** Görselin en büyük boyutu (1024x768 > 800x600 > 300x300). */
export function etsGorselUrl(g: EtsGorsel): string {
  const enBuyuk = [...(g.imageUrls ?? [])].sort((a, b) => b.width - a.width)[0];
  return enBuyuk?.url ?? "";
}

/** Oda kodu → fotoğraflar. */
export function etsOdaGorselleri(d: EtsHotelDetail | null): Map<string, string[]> {
  const m = new Map<string, string[]>();
  for (const oda of d?.rooms ?? []) {
    const urller = (oda.images ?? []).map(etsGorselUrl).filter(Boolean);
    if (urller.length) m.set(oda.code, urller);
  }
  return m;
}

/** Olanak kategorileri — liste ucundaki parentName. */
const KATEGORI: Record<string, string> = {
  FOOD_DRINK: "Yeme ve İçme",
  BEACH: "Plaj",
  FACILITIES: "Genel",
  HOTEL_FACILITY: "Otel",
  SPA: "Spa",
  THERMAL: "Termal",
  SKI: "Kayak",
  SPORT: "Spor",
  KID_BABY: "Çocuk ve Bebek",
  BED_TYPES: "Yatak",
  SPECIALITY: "Özellik",
};
export const etsKategori = (k: string | null | undefined) => (k && KATEGORI[k]) || "Diğer";

/** Olanak / oda özelliği listesi ögesi. Ad Accept-Language'e göre (tr). */
export function etsOzellik(a: EtsOzellikSayfasi["attributes"][number]): FacilityDto {
  return {
    id: Number(a.id),
    categoryName: etsKategori(a.parentName),
    name: a.name || a.description?.TURKISH || a.description?.ENGLISH || "",
  };
}

/**
 * Otel detayı → sayfanın beklediği şekil.
 *
 * `olanakKategorileri`: olanak id → kategori (bizim tablodan). Detay ucu
 * olanağın adını veriyor ama grubunu vermiyor; grup liste ucunda.
 */
export function etsOtelDetayi(
  d: EtsHotelDetail,
  olanakKategorileri: Map<number, string> = new Map()
): HotelDetailResponse {
  const aciklamalar = d.descriptions ?? [];
  const uyarilar = aciklamalar.filter((x) => x.title === "GENERAL_WARNINGS").map((x) => x.description);
  const metin = aciklamalar
    .filter((x) => x.title !== "GENERAL_WARNINGS")
    .map((x) => x.description?.trim())
    .filter(Boolean)
    .join("\n\n");

  // Adres satırı çoğu zaman şehri içermiyor; semt ve şehir yoksa ekle.
  const satirlar = (d.contact?.addressLines ?? []).map((x) => x.replace(/\s+/g, " ").trim()).filter(Boolean);
  const adres = [...satirlar];
  for (const ek of [d.location?.state, d.location?.city]) {
    if (ek && !adres.join(" ").toLocaleLowerCase("tr").includes(ek.toLocaleLowerCase("tr"))) adres.push(ek);
  }

  // Ana görsel önce, sonra genel görünüm, tesis (plaj, spa…), odalar; türü
  // belirsizler en sonda.
  const sira = (g: EtsGorsel) =>
    g.mainImage ? 0
    : g.type === "GENERALVIEW" ? 1
    : g.type === "ROOM" ? 3
    : !g.type || g.type === "UNCATEGORIZED" ? 4
    : 2;
  const images: HotelImage[] = (d.hotelImages ?? [])
    .filter((g) => !g.contentType || g.contentType === "IMAGE")
    .sort((a, b) => sira(a) - sira(b))
    .map((g, i) => ({ url: etsGorselUrl(g), caption: g.imageText ?? "", isMain: i === 0 }))
    .filter((g) => g.url);

  const facilities: HotelFacilityItem[] = (d.facilities ?? []).map((f) => ({
    id: f.id,
    categoryName: olanakKategorileri.get(f.id) ?? "Genel",
    name: f.description ?? "",
  }));

  return {
    hotelCode: d.id,
    name: d.name?.trim() ?? "",
    stars: parseInt(d.starLevel ?? "", 10) || 0,
    address: adres.join(", "),
    description: metin,
    latitude: d.geoLocation?.lat ?? 0,
    longitude: d.geoLocation?.lon ?? 0,
    images,
    facilities: facilities.filter((f) => f.name),
    phone: d.contact?.phones?.find((p) => p.number)?.number ?? "",
    email: d.contact?.email ?? "",
    policies: {
      checkInFrom: d.checkInOutPolicy?.checkInTime,
      checkOutUntil: d.checkInOutPolicy?.checkOutTime,
      ...(uyarilar.length && { importantInfo: uyarilar }),
    },
  };
}

// ── Rezervasyon ──────────────────────────────────────────────────────────

/** Uyruk → telefon ülke kodu; formdaki uyruk listesiyle aynı ülkeler. */
const ULKE_KODU: Record<string, string> = {
  TR: "90", DE: "49", GB: "44", FR: "33", RU: "7", US: "1",
  NL: "31", BE: "32", IT: "39", ES: "34", AT: "43", CH: "41",
};

/**
 * Serbest yazılmış telefonu Etscore'un istediği iki parçaya ayırır.
 *
 *   "0532 123 45 67"   → +90 / 5321234567
 *   "+49 151 2345678"  → +49 / 1512345678
 *   "5321234567"       → +90 / 5321234567
 *
 * Başında + olan numarada bilinen ülke kodları denenir; bilinmiyorsa ilk
 * iki hane kod sayılır.
 */
export function etsTelefon(telefon: string): { phoneCountryCode: string; phoneNumber: string } {
  const artili = telefon.trim().startsWith("+") || telefon.trim().startsWith("00");
  let rakam = telefon.replace(/\D/g, "");
  if (telefon.trim().startsWith("00")) rakam = rakam.slice(2);

  if (artili) {
    const kod =
      Object.values(ULKE_KODU)
        .sort((a, b) => b.length - a.length)
        .find((k) => rakam.startsWith(k)) ?? rakam.slice(0, 2);
    return { phoneCountryCode: `+${kod}`, phoneNumber: rakam.slice(kod.length) };
  }
  if (rakam.length === 12 && rakam.startsWith("90")) rakam = rakam.slice(2);
  if (rakam.length === 11 && rakam.startsWith("0")) rakam = rakam.slice(1);
  return { phoneCountryCode: "+90", phoneNumber: rakam };
}

/**
 * Rezervasyon isteği. `netFiyat`: oda aramasında Etscore'un verdiği tutar
 * (müşteriye gösterilen, kurallarla değişmiş fiyat DEĞİL). Etscore ödeme
 * tutarını kendi fiyatıyla karşılaştırıyor.
 *
 * Misafirlerin e-posta ve telefonu formda sorulmuyor; Etscore her misafir
 * için zorunlu tuttuğundan iletişim kişisininki yazılıyor.
 */
export function etsRezervasyonIstegi(
  req: CreateBookingRequest,
  netFiyat: { tutar: number; para: string }
): EtsBookRequest {
  const tel = etsTelefon(req.contact.phone);
  const misafirler: EtsMisafir[] = req.rooms.flatMap((r) =>
    r.guests.map((g) => ({
      name: g.name.trim(),
      surname: g.surname.trim(),
      birthDate: g.birthDate ?? "",
      email: req.contact.email,
      nationality: (g.nationality || "TR").toUpperCase(),
      ...tel,
      gender: g.gender === "Female" ? "FEMALE" : "MALE",
      type: g.type === "Child" ? "CHILD" : "ADULT",
    }))
  );

  return {
    contact: {
      name: req.contact.name.trim(),
      surname: req.contact.surname.trim(),
      email: req.contact.email,
      ...tel,
    },
    roomSearchId: req.roomSearchId,
    checkIn: req.checkIn,
    checkOut: req.checkOut,
    hotelCode: req.hotelCode,
    payment: {
      paymentType: `CASH_${netFiyat.para}`,
      price: netFiyat.tutar.toFixed(2),
      currency: netFiyat.para,
    },
    guests: misafirler,
    priceCode: req.priceCode,
    clientReferenceId: req.clientReferenceId,
    ...(req.additionalInfo && { additionalInfo: req.additionalInfo }),
  };
}

/**
 * Rezervasyon yanıtı. `bookingNumber` olarak Etscore'un voucher'ı
 * ("ETSR…") saklanıyor: detay ve iptal uçları rezervasyonu bununla tanıyor,
 * Etscore'un kendi bookingNumber'ıyla değil.
 */
export function etsRezervasyonYaniti(d: EtsBookResponse): CreateBookingResponse {
  return {
    bookingNumber: d.voucher || d.bookingNumber,
    status: d.success ? "CONFIRMED" : "FAILED",
    hotelConfirmationNumber: d.hotelConfirmationNumber || d.bookingNumber || "",
    roomConfirmationCodes: (d.room ?? []).map((r) => r.confirmationCode).filter(Boolean),
    totalPrice: Number(d.price) || 0,
    currency: d.currency,
  };
}

/** İptal yanıtı. Ücret = ödenen − iade (penaltyAmount her zaman gelmiyor). */
export function etsIptalYaniti(d: EtsCancelResponse, bookingNumber: string): CancelBookingResponse {
  const bilgiler = d.cancelInfos ?? [];
  const ucret = bilgiler.reduce(
    (t, b) => t + (b.penaltyAmount ?? Math.max(0, (b.price ?? 0) - (b.refundPrice ?? 0))),
    0
  );
  return {
    bookingNumber,
    status: etsDurum(d.status),
    cancellationFee: yuvarla(ucret),
    currency: bilgiler[0]?.currency ?? d.cancellationPolicies?.[0]?.currency ?? "",
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

/** Rezervasyon detayı (POST /royal/hotel/book/detail). */
export function etsRezervasyonDetayi(d: EtsBookDetailResponse): ReservationDetailResponse {
  const detaylar: EtsReservationDetail[] = Array.isArray(d.reservationDetails)
    ? d.reservationDetails
    : d.reservationDetails
      ? [d.reservationDetails]
      : [];
  const ilk = detaylar[0];
  const oda = d.room?.[0];
  const [ad, ...soyad] = (d.contactName ?? "").trim().split(/\s+/);

  return {
    bookingNumber: d.voucher || d.bookingNumber,
    clientReferenceId: d.clientReferenceId ?? "",
    status: etsDurum(ilk?.status),
    hotelCode: "",
    hotelName: d.hotelName,
    checkIn: d.checkIn,
    checkOut: d.checkOut,
    boardType: oda?.mealType ?? ilk?.mealTypeCode ?? "",
    roomType: oda?.roomName?.replace(/[,\s]+$/, "") ?? ilk?.roomType ?? "",
    totalPrice: d.price,
    currency: d.currency,
    contact: { name: ad ?? "", surname: soyad.join(" "), email: "", phone: d.contactPhone ?? "" },
    guests: (d.guests ?? []).map((g) => ({
      name: g.name ?? "",
      surname: g.surname ?? "",
      type: "Adult" as const,
      gender: "Male" as const,
      nationality: "",
      birthDate: g.birthDate,
    })),
    cancellationPolicies: (d.cancellationPolicies ?? []).map(etsIptalPolitikasi),
    roomConfirmationCodes: (d.room ?? []).map((r) => r.confirmationCode).filter(Boolean),
    createdAt: ilk?.date ?? "",
  };
}
