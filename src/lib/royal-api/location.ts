import { royalApiClient } from "./client";
import { USE_MOCK, mockGetLocations } from "./mock";
import type { LocationDto } from "./types";

export async function getLocations(): Promise<LocationDto[]> {
  if (USE_MOCK) return mockGetLocations();
  return royalApiClient.get<LocationDto[]>("/api/content/locations");
}
