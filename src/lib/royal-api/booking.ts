import { royalApiClient } from "./client";
import { USE_MOCK, mockSearchRooms, mockCreateBooking } from "./mock";
import type {
  RoomSearchRequest,
  RoomSearchResponse,
  CreateBookingRequest,
  CreateBookingResponse,
} from "./types";

export async function searchRooms(params: RoomSearchRequest): Promise<RoomSearchResponse> {
  if (USE_MOCK) return mockSearchRooms(params);
  return royalApiClient.post<RoomSearchResponse>("/api/booking/room-search", params);
}

export async function createBooking(params: CreateBookingRequest): Promise<CreateBookingResponse> {
  if (USE_MOCK) return mockCreateBooking(params);
  return royalApiClient.post<CreateBookingResponse>("/api/booking/create", params);
}
