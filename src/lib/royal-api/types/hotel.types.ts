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
}
