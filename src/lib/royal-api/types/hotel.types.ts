export interface HotelSearchRequest {
  feedId: string;
  currency: string;
  nationality: string;
  checkIn: string; // YYYY-MM-DD
  checkOut: string;
  hotelCodes: string[];
  rooms: RoomRequest[];
}

export interface RoomRequest {
  adult: number;
  childAges?: number[];
}

export interface HotelSearchResponse {
  searchId: string;
  hotels: HotelSearchResult[];
}

export interface HotelSearchResult {
  hotelCode: string;
  hotelName: string;
  stars: number;
  address: string;
  latitude: number;
  longitude: number;
  thumbnailImage: string;
  minPrice: number;
  currency: string;
  boardTypes: string[];
  // Zenginleştirme (opsiyonel) — arama kartında puan rozeti için.
  reviewScore?: number;
  reviewCount?: number;
  reviewLabel?: string;
}

export interface HotelDetailRequest {
  hotelCode: string;
}

export interface HotelDetailResponse {
  hotelCode: string;
  name: string;
  stars: number;
  address: string;
  description: string;
  latitude: number;
  longitude: number;
  images: HotelImage[];
  facilities: HotelFacilityItem[];
  phone: string;
  email: string;
  // Zenginleştirme alanları (opsiyonel). Tedarikçi temel API'sinde bulunmaz;
  // mock modda üretilir, ileride Google Places / detaylı content endpoint'i
  // ile doldurulabilir. Gerçek API'de yoksa UI koşullu olarak gizler.
  reviewSummary?: HotelReviewSummary;
  reviews?: HotelReview[];
  nearby?: NearbyPlace[];
  policies?: HotelPolicies;
}

export interface HotelReviewSummary {
  score: number; // 0-10
  count: number;
  label: string; // "Çok iyi", "Mükemmel"...
  categories: ReviewCategoryScore[];
  highlight?: string; // öne çıkan yorum alıntısı
}

export interface ReviewCategoryScore {
  name: string; // "Temizlik", "Konum"...
  score: number; // 0-10
}

export interface HotelReview {
  author: string;
  country?: string;
  score: number; // 0-10
  date: string; // ISO
  travelerType?: string; // "Çift", "Aile", "İş"...
  roomType?: string;
  positive?: string;
  negative?: string;
}

export interface NearbyPlace {
  name: string;
  category: "Turistik" | "Restoran" | "Toplu Taşıma" | "Havaalanı" | "Doğa";
  distance: string; // "200 m", "1,3 km"
}

export interface HotelPolicies {
  checkInFrom?: string; // "14:00"
  checkOutUntil?: string; // "12:00"
  cancellationText?: string;
  childrenText?: string;
  acceptedCards?: string[]; // "Visa", "Mastercard"...
  importantInfo?: string[];
}

export interface HotelImage {
  url: string;
  caption: string;
  isMain: boolean;
}

export interface HotelFacilityItem {
  id: number;
  categoryName: string;
  name: string;
}

export interface HotelListRequest {
  feedId: string;
  lastRevisionDate?: string;
}

export interface HotelListItem {
  hotelCode: string;
  name: string;
  stars: number;
  address: string;
  latitude: number;
  longitude: number;
  thumbnailImage: string;
  locationId: number;
  facilities: number[];
  images: string[];
  phone?: string;
  email?: string;
}
