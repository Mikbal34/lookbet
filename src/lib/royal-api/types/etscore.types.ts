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

// ── Rezervasyon detayı ───────────────────────────────────────────────────

/** POST /royal/hotel/book/detail — istek. */
export interface EtsBookDetailRequest {
  reservationId?: string;
  clientReferenceId?: string;
}

/**
 * POST /royal/hotel/book/detail — yanıt (dokümana göre; henüz gerçek bir
 * rezervasyonla doğrulanmadı, çünkü rezervasyon oluşturma ucu belgelenmemiş).
 */
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
  cancellationPolicies?: EtsCancellationPolicy[];
  reservationDetails?: EtsReservationDetail | EtsReservationDetail[];
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
