import { royalApiClient } from "./client";
import {
  USE_MOCK,
  mockGetCurrencies,
  mockGetBoardTypes,
  mockGetFacilities,
  mockGetRoomAttributes,
} from "./mock";
import type { CurrencyDto, BoardTypeDto, FacilityDto, RoomAttributeDto } from "./types";

export async function getCurrencies(): Promise<CurrencyDto[]> {
  if (USE_MOCK) return mockGetCurrencies();
  return royalApiClient.get<CurrencyDto[]>("/api/content/currencies");
}

export async function getBoardTypes(): Promise<BoardTypeDto[]> {
  if (USE_MOCK) return mockGetBoardTypes();
  return royalApiClient.get<BoardTypeDto[]>("/api/content/board-types");
}

export async function getFacilities(): Promise<FacilityDto[]> {
  if (USE_MOCK) return mockGetFacilities();
  return royalApiClient.get<FacilityDto[]>("/api/content/facilities");
}

export async function getRoomAttributes(): Promise<RoomAttributeDto[]> {
  if (USE_MOCK) return mockGetRoomAttributes();
  return royalApiClient.get<RoomAttributeDto[]>("/api/content/room-attributes");
}
