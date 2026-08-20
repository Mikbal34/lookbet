import { royalApiClient } from "./client";
import {
  USE_MOCK,
  mockSearchHotels,
  mockGetHotelDetail,
  mockGetHotelList,
} from "./mock";
import type {
  HotelSearchRequest,
  HotelSearchResponse,
  HotelDetailResponse,
  HotelListRequest,
  HotelListItem,
} from "./types";

export async function searchHotels(params: HotelSearchRequest): Promise<HotelSearchResponse> {
  if (USE_MOCK) return mockSearchHotels(params);
  return royalApiClient.post<HotelSearchResponse>("/api/hotel/search", params);
}

export async function getHotelDetail(hotelCode: string): Promise<HotelDetailResponse> {
  if (USE_MOCK) return mockGetHotelDetail(hotelCode);
  return royalApiClient.get<HotelDetailResponse>(`/api/hotel/${hotelCode}`);
}

export async function getHotelList(params: HotelListRequest): Promise<HotelListItem[]> {
  if (USE_MOCK) return mockGetHotelList();
  return royalApiClient.post<HotelListItem[]>("/api/hotel/list", params);
}
