import { royalApiClient } from "./client";
import type { LocationDto } from "./types";

export async function getLocations(): Promise<LocationDto[]> {
  return royalApiClient.get<LocationDto[]>("/api/content/locations");
}
