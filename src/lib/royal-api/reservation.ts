import { royalApiClient } from "./client";
import type {
  ReservationDetailResponse,
  CancelBookingRequest,
  CancelBookingResponse,
} from "./types";

export async function getReservationDetail(
  bookingNumber: string
): Promise<ReservationDetailResponse> {
  return royalApiClient.get<ReservationDetailResponse>(
    `/api/booking/detail/${bookingNumber}`
  );
}

export async function cancelReservation(
  params: CancelBookingRequest
): Promise<CancelBookingResponse> {
  return royalApiClient.post<CancelBookingResponse>("/api/booking/cancel", params);
}
