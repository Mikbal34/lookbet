import { belgelenmemis, royalApiClient } from "./client";
import { etsParaBirimi } from "./etscore-map";
import {
  USE_MOCK,
  mockGetCurrencies,
  mockGetBoardTypes,
  mockGetFacilities,
  mockGetRoomAttributes,
} from "./mock";
import type { CurrencyDto, BoardTypeDto, FacilityDto, RoomAttributeDto } from "./types";
import type { EtsCurrency } from "./types/etscore.types";

export async function getCurrencies(): Promise<CurrencyDto[]> {
  if (USE_MOCK) return mockGetCurrencies();
  const d = await royalApiClient.get<EtsCurrency[]>("/api/v1/generic-api-service/content/currency");
  return (d ?? []).map(etsParaBirimi);
}

/**
 * Pansiyon tipleri ucu belgelenmemiş. Tablo yine de doluyor: her arama
 * sonucu kodu ve adı birlikte taşıyor, hotel.ts bunları öğrenip yazıyor.
 */
export async function getBoardTypes(): Promise<BoardTypeDto[]> {
  if (USE_MOCK) return mockGetBoardTypes();
  return belgelenmemis("Pansiyon tipleri");
}

export async function getFacilities(): Promise<FacilityDto[]> {
  if (USE_MOCK) return mockGetFacilities();
  return belgelenmemis("Otel olanakları");
}

export async function getRoomAttributes(): Promise<RoomAttributeDto[]> {
  if (USE_MOCK) return mockGetRoomAttributes();
  return belgelenmemis("Oda özellikleri");
}
