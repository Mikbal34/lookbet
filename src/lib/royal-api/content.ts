import { royalApiClient, type EtsDil } from "./client";
import { etsOzellik, etsParaBirimi } from "./etscore-map";
import {
  USE_MOCK,
  mockGetCurrencies,
  mockGetBoardTypes,
  mockGetFacilities,
  mockGetRoomAttributes,
} from "./mock";
import type { CurrencyDto, BoardTypeDto, FacilityDto, RoomAttributeDto } from "./types";
import type { EtsBoardType, EtsCurrency, EtsOzellikSayfasi } from "./types/etscore.types";

export async function getCurrencies(): Promise<CurrencyDto[]> {
  if (USE_MOCK) return mockGetCurrencies();
  const d = await royalApiClient.get<EtsCurrency[]>("/api/v1/generic-api-service/content/currency");
  return (d ?? []).map(etsParaBirimi);
}

const ICERIK = "/api/v1/generic-api-service/content";

/** Pansiyon tipleri — Türkçe adlarıyla ("BB" → "Oda Kahvaltı"). */
export async function getBoardTypes(dil: EtsDil = "tr-TR"): Promise<BoardTypeDto[]> {
  if (USE_MOCK) return mockGetBoardTypes();
  const d = await royalApiClient.get<EtsBoardType[]>(`${ICERIK}/list-board-types`, { dil });
  return (d ?? []).filter((b) => b.code && b.name).map((b) => ({ code: b.code, name: b.name.trim() }));
}

/**
 * Olanak ve oda özelliği listeleri sayfalı. Tek sayfa ~1000 kayıtta
 * kesiliyor (1837 oda özelliğinden 996'sı geldi), boş sayfa gelene ya da
 * toplam dolana kadar okunuyor.
 */
async function ozellikListesi(yol: string, dil: EtsDil = "tr-TR"): Promise<FacilityDto[]> {
  const BOYUT = 500;
  const hepsi: FacilityDto[] = [];
  for (let sayfa = 0; sayfa < 20; sayfa++) {
    const d = await royalApiClient.get<EtsOzellikSayfasi>(`${yol}?page=${sayfa}&size=${BOYUT}`, { dil });
    const parca = d?.attributes ?? [];
    hepsi.push(...parca.map(etsOzellik).filter((x) => x.id && x.name));
    if (parca.length === 0 || (d?.totalCount && (sayfa + 1) * BOYUT >= d.totalCount)) break;
  }
  return [...new Map(hepsi.map((x) => [x.id, x])).values()];
}

export async function getFacilities(dil: EtsDil = "tr-TR"): Promise<FacilityDto[]> {
  if (USE_MOCK) return mockGetFacilities();
  return ozellikListesi(`${ICERIK}/list-hotel-facilities/ATTRIBUTE_ALL`, dil);
}

export async function getRoomAttributes(): Promise<RoomAttributeDto[]> {
  if (USE_MOCK) return mockGetRoomAttributes();
  return ozellikListesi(`${ICERIK}/list-rooms/ATTRIBUTE_ALL`);
}
