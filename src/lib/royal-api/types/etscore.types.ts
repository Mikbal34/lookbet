// Etscore (Royal API v1) — tel üzerindeki gerçek şemalar.
//
// Bu tipler dokümandan değil, test ortamından alınan gerçek yanıtlardan
// çıkarıldı. Doküman üç yerde yanlıştı (token süresi, lokasyon kayıtlarında
// isim, toplam otel sayısı); bir alan dokümanda olup yanıtta yoksa burada
// opsiyonel.
//
// Uygulamanın geri kalanı bu tipleri GÖRMEZ: etscore-map.ts bunları
// hotel.types / booking.types'taki uygulama tiplerine çevirir. Tedarikçi bir
// alanı değiştirirse düzeltilecek yer tek.

/** POST /api/v1/auth-service/auth/login — düz OAuth2 yanıtı, zarf yok. */
export interface EtsToken {
  access_token: string;
  /** Saniye. Doküman 4 ya da 5 saat diyor, gerçek yanıt 43200 (12 sa). */
  expires_in: number;
  refresh_token: string;
  refresh_expires_in: number;
  token_type: string;
}

/** Hata zarfı. Başarılı yanıtlar zarfsız gelir, hatalar bu şekilde. */
export interface EtsErrorBody {
  errorCode?: string;
  errorGroupCode?: string;
  errorMessage?: string;
  traceId?: string;
  transactionUser?: string;
  path?: string;
}

/** Çok dilli ad. Anahtarlar dil kodu ("tr", "en", "ru", "de"). */
export interface EtsCeviri {
  translations: Record<string, string>;
}

/** GET /content/currency */
export interface EtsCurrency {
  id: number;
  isoCode: string;
  name: EtsCeviri;
}

/** Sayfalı liste zarfı (find-by-paging uçları). */
export interface EtsSayfa<T> {
  content: T[];
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
  numberOfElements: number;
}

/** GET /content/hotel/find-by-paging — yalnızca ad ve kod. */
export interface EtsHotelListItem {
  id: string;
  name: string;
}

/** GET /content/location/find-by-paging — bazı kayıtlarda `name` yok. */
export interface EtsLocationListItem {
  id: number;
  name?: EtsCeviri;
}

// ── Arama ─────────────────────────────────────────────────────────────────

/** POST /royal/hotel/search — istek. */
export interface EtsSearchRequest {
  hotelCodes: string[];
  checkIn: string; // YYYY-MM-DD
  checkOut: string;
  clientNationality: string; // "TR"
  feedId: string;
  /** true: her oda için tüm fiyat seçenekleri; false: odanın en ucuzu. */
  allPricesFlag: boolean;
  rooms: { adults: number; child: number; childAges: number[] }[];
}

export interface EtsNightlyPrice {
  date: string;
  amount: number;
  currency: string;
}

/**
 * İptal penceresi. Tarihler UTC+03:00 (dokümanda belirtiliyor) ve saat
 * dilimi eki olmadan geliyor: "2026-10-18T17:59:00".
 */
export interface EtsCancellationPolicy {
  amount: number;
  currency: string;
  fromDate: string;
  toDate: string;
}

/**
 * Tek fiyat seçeneği. Asıl anahtar `rateId`: aynı `roomCode` farklı
 * fiyatlarla (ör. iade edilebilir / edilemez) birden fazla kez gelebiliyor.
 */
export interface EtsRate {
  pax: { adult: number; child: number; childAges: number[] };
  totalPrice: number;
  nightlyPrices: EtsNightlyPrice[];
  refundable: boolean;
  /** İade edilemeyen fiyatlarda boş dizi. */
  cancellationPolicies: EtsCancellationPolicy[];
  roomType: string;
  roomCode: string;
  roomCapacity: number;
  rateId: string;
  mealType: string; // Accept-Language'e göre çevrilir ("Oda Kahvaltı")
  mealTypeCode: string; // "BB", "RO", "AI"…
  bedTypes: { id: number; name: string }[];
  taxes: unknown[];
  fees?: unknown[];
  restrictions: unknown[];
  allotment?: number;
}

export interface EtsDestinationCode {
  id: number;
  /** COUNTRY → REGION → CITY → TOWN → CUSTOMREGION, bu sırayla gelir. */
  type: "COUNTRY" | "REGION" | "CITY" | "TOWN" | "CUSTOMREGION" | string;
  typeId: number;
  name: string;
}

export interface EtsSearchHotel {
  hotelCode: string;
  hotelName: string;
  suggested: boolean;
  rooms: EtsRate[];
  destinationCodes: EtsDestinationCode[];
  geoLocation?: { lat: number; lon: number };
  hotelRankingScore?: number;
}

/**
 * POST /royal/hotel/search — yanıt.
 * DİKKAT: hiç müsaitlik yoksa boş liste DEĞİL, HTTP 400 + errorCode (bkz. ETS_SONUC_YOK)
 * ("0904077" vb.) dönüyor. client.ts bunu EtscoreError.musaitlikYok ile ayırır.
 */
export interface EtsSearchResponse {
  totalHotelCount: number;
  hotels: EtsSearchHotel[];
}

// ── İçerik listeleri ──────────────────────────────────────────────────────

/** GET /content/list-board-types — Accept-Language'e göre çevrili ad. */
export interface EtsBoardType {
  code: string;
  name: string;
}

/**
 * GET /content/list-hotel-facilities/ATTRIBUTE_ALL ve
 * GET /content/list-rooms/ATTRIBUTE_ALL — ikisi de aynı şekilde.
 * Sayfa boyutu ~1000'de kesiliyor (1837 oda özelliğinden 996'sı geldi);
 * sayfalanarak okunmalı.
 */
export interface EtsOzellikSayfasi {
  totalCount: number;
  pageSize: number;
  attributes: {
    id: string;
    parentId: number;
    parentName: string; // "FOOD_DRINK", "BED_TYPES"…
    name: string; // Accept-Language'e göre
    description: Record<string, string | null>;
  }[];
}

// ── Otel detayı ───────────────────────────────────────────────────────────

export interface EtsGorsel {
  /** Aynı görselin boyutları: 300x300, 800x600, 1024x768. */
  imageUrls: { url: string; width: number; height: number }[];
  imageText: string | null;
  type: string; // "GENERALVIEW", "ROOM"…
  roomCode: string | null;
  mainImage: boolean;
  contentType: string; // "IMAGE"
}

/** POST /content/hotel/detail {hotelId} */
export interface EtsHotelDetail {
  id: string;
  name: string;
  /** "4 Stars" gibi metin; yıldızı olmayan otelde yok. */
  starLevel?: string;
  location?: {
    id: number;
    city?: string;
    postalCode?: string;
    countryCode?: string;
    country?: string;
    state?: string;
  };
  geoLocation?: { lat: number; lon: number };
  allowedPet?: boolean;
  /**
   * Konum zinciri. Aramadaki destinationCodes'la aynı kimlikler ("795" =
   * İstanbul) ama fiyattan bağımsız: satışta olmayan otelde de geliyor.
   * `locationType`: COUNTRY, REGION, CITY, TOWN, CUSTOMREGION.
   */
  locationStructure?: { id: number; name: string; type?: string; locationType: string }[];
  checkInOutPolicy?: { checkInTime?: string; checkOutTime?: string };
  hotelImages?: EtsGorsel[];
  contact?: {
    addressLines?: string[];
    phones?: { number?: string; type?: string }[];
    email?: string | null;
    webSite?: string | null;
  };
  /** Başlıklar: GENERAL, WHYTHISHOTEL, FOOD, GENERAL_WARNINGS… */
  descriptions?: { title?: string; description: string }[];
  extraInformation?: { info?: string; value?: string }[];
  rooms?: {
    code: string;
    name: string;
    size?: number;
    capacity?: number;
    bedTypes?: { id: number; name: string }[];
    descriptions?: { text: string }[];
    images?: EtsGorsel[];
    facilities?: { id: number; description?: string }[];
  }[];
  facilities?: { id: number; free?: boolean; description?: string }[];
}

/**
 * POST /content/hotel/revision?page&size {sinceDate, revisionType}.
 * sinceDate en fazla 6 gün geri (7'de 0905028). Türsüz sorgu yalnızca UPDATE döndürüyor.
 */
export interface EtsRevizyonSayfasi {
  totalCount: number;
  numberOfPages: number;
  hotels: { hotelId: string; revisionType: "INSERT" | "UPDATE" | "DELETE"; updateDate?: string }[];
}

// ── Oda arama ─────────────────────────────────────────────────────────────

/** POST /royal/room/search — istek. Şimdilik rezervasyon başına tek oda. */
export interface EtsRoomSearchRequest {
  hotelCode: string;
  checkIn: string;
  checkOut: string;
  feedId: string;
  clientNationality: string;
  rooms: { adults: number; child: number; childAges: number[] }[];
}

/**
 * Oda araması fiyatı. Otel aramasındaki EtsRate'ten farkı `priceCode`:
 * rezervasyonda gönderilen, 30 dakika geçerli anahtar.
 */
export type EtsRoomRate = Omit<EtsRate, "pax" | "roomType" | "roomCode" | "roomCapacity" | "bedTypes"> & {
  priceCode: string;
};

/** POST /royal/room/search — yanıt. */
export interface EtsRoomSearchResponse {
  hotelCode: string;
  hotelName: string;
  /** Etscore önbelleğindeki arama; rezervasyonda gönderilir. */
  roomSearchId: string;
  destinations?: EtsDestinationCode[];
  rooms: {
    pax: { adult: number; child: number; childAges: number[] };
    roomType: string;
    roomCode: string;
    roomCapacity: number;
    bedTypes: { id: number; name: string }[];
    rates: EtsRoomRate[];
  }[];
  hotelImportantNotes?: unknown[];
}

// ── Rezervasyon ───────────────────────────────────────────────────────────

export interface EtsKisi {
  name: string;
  surname: string;
  phoneCountryCode: string; // "+90"
  phoneNumber: string;
  email: string;
}

export interface EtsMisafir extends EtsKisi {
  birthDate: string; // yyyy-MM-dd
  nationality: string; // iki harf
  gender: "MALE" | "FEMALE";
  type: "ADULT" | "CHILD";
}

/** POST /royal/book — istek. */
export interface EtsBookRequest {
  contact: EtsKisi;
  roomSearchId: string;
  checkIn: string;
  checkOut: string;
  hotelCode: string;
  payment: {
    /** Örnekte "CASH_EUR"; dokümanda başka değer listelenmiyor. */
    paymentType: string;
    price: string; // "222.13"
    currency: string;
  };
  guests: EtsMisafir[];
  priceCode: string;
  /** En fazla 20 karakter, benzersiz. */
  clientReferenceId?: string;
  additionalInfo?: string;
}

export interface EtsRezervasyonOdasi {
  pax?: { adult: number; child?: number; childAges?: number[] };
  roomCode: string;
  roomName: string;
  mealType: string; // kod: "BB"
  nightlyPrices?: EtsNightlyPrice[];
  /** İptalde gönderilir: "ETSR2014683530230886". */
  confirmationCode: string;
  rateId?: string;
}

/** POST /royal/book — yanıt. `price` metin olarak geliyor ("222.13"). */
export interface EtsBookResponse {
  success: boolean;
  bookingNumber: string;
  /** Rezervasyon kimliği: detay ve iptal bununla yapılır ("ETSR…"). */
  voucher: string;
  createdAt?: string;
  hotelCode: string;
  price: string | number;
  agencyCommission?: string | number;
  currency: string;
  isRefundable?: boolean;
  cancellationPolicies?: EtsCancellationPolicy[];
  room?: EtsRezervasyonOdasi[];
  clientReferenceId?: string;
  hotelConfirmationNumber?: string;
}

/** POST /royal/hotel/book/cancel — istek. */
export interface EtsCancelRequest {
  reservationId: string; // voucher
  roomConfirmationCodes: string[];
  reason?: string;
}

/** POST /royal/hotel/book/cancel — yanıt. */
export interface EtsCancelResponse {
  cancelInfos?: {
    price: number;
    refundPrice: number;
    penaltyAmount?: number;
    currency: string;
    roomCode: string;
    success: boolean;
  }[];
  cancellationPolicies?: EtsCancellationPolicy[];
  cancelId?: string;
  /** RESERVATION | CANCELLED | CANCELLED_PENALTY */
  status: string;
}

// ── Rezervasyon detayı ───────────────────────────────────────────────────

/** POST /royal/hotel/book/detail — istek. */
export interface EtsBookDetailRequest {
  reservationId?: string;
  clientReferenceId?: string;
}

/** POST /royal/hotel/book/detail — yanıt. */
export interface EtsBookDetailResponse {
  hotelName: string;
  hotelAddress?: string;
  hotelPhone?: string;
  price: number;
  currency: string;
  voucher: string;
  bookingUuid: string;
  bookingNumber: string;
  clientReferenceId?: string;
  checkIn: string;
  checkOut: string;
  contactName?: string;
  contactPhone?: string;
  additionalInfo?: string;
  cancellationPolicies?: EtsCancellationPolicy[];
  reservationDetails?: EtsReservationDetail | EtsReservationDetail[];
  guests?: { name?: string; surname?: string; birthDate?: string; guidId?: string }[];
  room?: EtsRezervasyonOdasi[];
  hotelConfirmationNumber?: string;
}

export interface EtsReservationDetail {
  date?: string;
  /** RESERVATION | CANCELLED | CANCELLED_PENALTY */
  status: string;
  roomPrice?: number;
  refundPrice?: number;
  roomCode?: string;
  roomType?: string;
  mealType?: string;
  mealTypeCode?: string;
  guests?: { name?: string; surname?: string; age?: number; type?: string }[];
}
