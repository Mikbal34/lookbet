import { royalApiClient } from "./client";
import type { CurrencyDto, BoardTypeDto, FacilityDto, RoomAttributeDto } from "./types";

export async function getCurrencies(): Promise<CurrencyDto[]> {
  return royalApiClient.get<CurrencyDto[]>("/api/content/currencies");
}

export async function getBoardTypes(): Promise<BoardTypeDto[]> {
  return royalApiClient.get<BoardTypeDto[]>("/api/content/board-types");
}

export async function getFacilities(): Promise<FacilityDto[]> {
  return royalApiClient.get<FacilityDto[]>("/api/content/facilities");
}

export async function getRoomAttributes(): Promise<RoomAttributeDto[]> {
  return royalApiClient.get<RoomAttributeDto[]>("/api/content/room-attributes");
}
