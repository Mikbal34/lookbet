import { belgelenmemis, royalApiClient } from "./client";
import { etsRezervasyonDetayi } from "./etscore-map";
import { USE_MOCK, mockGetReservationDetail, mockCancelReservation } from "./mock";
import type {
  ReservationDetailResponse,
  CancelBookingRequest,
  CancelBookingResponse,
} from "./types";
import type { EtsBookDetailResponse } from "./types/etscore.types";

/**
 * Dokümana göre bağlandı; gerçek bir rezervasyonla henüz doğrulanmadı,
 * çünkü rezervasyon oluşturma ucu belgelenmemiş. Çağıran rota hata
 * durumunda yerel kayda düşüyor.
 */
export async function getReservationDetail(
  bookingNumber: string
): Promise<ReservationDetailResponse> {
  if (USE_MOCK) return mockGetReservationDetail(bookingNumber);
  const d = await royalApiClient.post<EtsBookDetailResponse>(
    "/api/v1/generic-api-service/royal/hotel/book/detail",
    { reservationId: bookingNumber }
  );
  return etsRezervasyonDetayi(d);
}

export async function cancelReservation(
  params: CancelBookingRequest
): Promise<CancelBookingResponse> {
  if (USE_MOCK) return mockCancelReservation(params);
  return belgelenmemis("Rezervasyon iptali");
}
