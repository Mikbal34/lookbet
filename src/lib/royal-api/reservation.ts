import { royalApiClient } from "./client";
import { etsIptalYaniti, etsRezervasyonDetayi } from "./etscore-map";
import { USE_MOCK, mockGetReservationDetail, mockCancelReservation } from "./mock";
import type {
  ReservationDetailResponse,
  CancelBookingRequest,
  CancelBookingResponse,
} from "./types";
import type { EtsBookDetailResponse, EtsCancelResponse } from "./types/etscore.types";

const ROYAL = "/api/v1/generic-api-service/royal";

/**
 * Rezervasyon detayı. `bookingNumber` = Etscore voucher'ı ("ETSR…"); detay
 * ve iptal uçları rezervasyonu bununla tanıyor. Çağıran rota hata durumunda
 * yerel kayda düşüyor.
 */
export async function getReservationDetail(
  bookingNumber: string
): Promise<ReservationDetailResponse> {
  if (USE_MOCK) return mockGetReservationDetail(bookingNumber);
  const d = await royalApiClient.post<EtsBookDetailResponse>(
    `${ROYAL}/hotel/book/detail`,
    { reservationId: bookingNumber }
  );
  return etsRezervasyonDetayi(d);
}

export async function cancelReservation(
  params: CancelBookingRequest
): Promise<CancelBookingResponse> {
  if (USE_MOCK) return mockCancelReservation(params);

  // İptal ucu oda onay kodlarını istiyor. Yerel kayıtta yoksa (ör. eski
  // kayıt) Etscore'un kendi detayından okunur.
  let kodlar = params.roomConfirmationCodes?.filter(Boolean) ?? [];
  if (kodlar.length === 0) {
    kodlar = (await getReservationDetail(params.bookingNumber)).roomConfirmationCodes;
  }

  const d = await royalApiClient.post<EtsCancelResponse>(`${ROYAL}/hotel/book/cancel`, {
    reservationId: params.bookingNumber,
    roomConfirmationCodes: kodlar,
  });
  return etsIptalYaniti(d, params.bookingNumber);
}
