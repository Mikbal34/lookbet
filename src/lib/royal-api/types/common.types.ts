export interface RoyalApiResponse<T> {
  result: T;
  isSuccess: boolean;
  message: string | null;
  statusCode: number;
}

export interface RoyalApiError {
  message: string;
  statusCode: number;
  errors?: string[];
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiration: string;
}

export interface CurrencyDto {
  code: string;
  name: string;
}

export interface BoardTypeDto {
  code: string;
  name: string;
}

export interface FacilityDto {
  id: number;
  categoryName: string;
  name: string;
}

export interface RoomAttributeDto {
  id: number;
  categoryName: string;
  name: string;
}

export interface LocationDto {
  id: number;
  name: string;
  parentId: number | null;
  type: string;
}
