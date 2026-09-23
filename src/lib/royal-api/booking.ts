import { belgelenmemis } from "./client";
import { etsOdaAramaYaniti } from "./etscore-map";
import { etsOtelAra } from "./hotel";
import { USE_MOCK, mockSearchRooms, mockCreateBooking } from "./mock";
import type {
  RoomSearchRequest,
  RoomSearchResponse,
  CreateBookingRequest,
  CreateBookingResponse,
} from "./types";

/**
 * Bir otelin odaları ve fiyatları.
 *
 * Etscore'un ayrı "room search" ucu belgelenmemiş. Oteli tek başına ve tüm
 * fiyat seçenekleriyle (allPricesFlag) aratmak aynı bilgiyi veriyor: oda
 * tipleri, pansiyon, iptal pencereleri, gecelik fiyatlar.
 */
export async function searchRooms(params: RoomSearchRequest): Promise<RoomSearchResponse> {
  if (USE_MOCK) return mockSearchRooms(params);

  const oteller = await etsOtelAra(params, [params.hotelCode], true);
  const otel = oteller.find((h) => h.hotelCode === params.hotelCode) ?? oteller[0];
  return etsOdaAramaYaniti(otel, params);
}

export async function createBooking(params: CreateBookingRequest): Promise<CreateBookingResponse> {
  if (USE_MOCK) return mockCreateBooking(params);
  // Rezervasyon oluşturma belgelenmemiş. Deneme yanılmayla bulunmaz: yanlış
  // bir POST gerçek rezervasyon açabilir.
  return belgelenmemis("Rezervasyon oluşturma");
}
