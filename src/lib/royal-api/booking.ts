import { royalApiClient } from "./client";
import type {
  RoomSearchRequest,
  RoomSearchResponse,
  CreateBookingRequest,
  CreateBookingResponse,
} from "./types";

export async function searchRooms(params: RoomSearchRequest): Promise<RoomSearchResponse> {
  return royalApiClient.post<RoomSearchResponse>("/api/booking/room-search", params);
}

export async function createBooking(params: CreateBookingRequest): Promise<CreateBookingResponse> {
  return royalApiClient.post<CreateBookingResponse>("/api/booking/create", params);
}
