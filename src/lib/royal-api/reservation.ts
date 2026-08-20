import { royalApiClient } from "./client";
import { USE_MOCK, mockGetReservationDetail, mockCancelReservation } from "./mock";
import type {
  ReservationDetailResponse,
  CancelBookingRequest,
  CancelBookingResponse,
} from "./types";

export async function getReservationDetail(
  bookingNumber: string
): Promise<ReservationDetailResponse> {
  if (USE_MOCK) return mockGetReservationDetail(bookingNumber);
  return royalApiClient.get<ReservationDetailResponse>(
    `/api/booking/detail/${bookingNumber}`
  );
}

export async function cancelReservation(
  params: CancelBookingRequest
): Promise<CancelBookingResponse> {
  if (USE_MOCK) return mockCancelReservation(params);
  return royalApiClient.post<CancelBookingResponse>("/api/booking/cancel", params);
}
