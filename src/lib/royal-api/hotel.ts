import { royalApiClient } from "./client";
import type {
  HotelSearchRequest,
  HotelSearchResponse,
  HotelDetailResponse,
  HotelListRequest,
  HotelListItem,
} from "./types";

export async function searchHotels(params: HotelSearchRequest): Promise<HotelSearchResponse> {
  return royalApiClient.post<HotelSearchResponse>("/api/hotel/search", params);
}

export async function getHotelDetail(hotelCode: string): Promise<HotelDetailResponse> {
  return royalApiClient.get<HotelDetailResponse>(`/api/hotel/${hotelCode}`);
}

export async function getHotelList(params: HotelListRequest): Promise<HotelListItem[]> {
  return royalApiClient.post<HotelListItem[]>("/api/hotel/list", params);
}
