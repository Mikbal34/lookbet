import { USE_MOCK, mockGetLocations } from "./mock";
import type { LocationDto } from "./types";

/**
 * Gerçek modda boş döner — bilerek.
 *
 * Etscore'un lokasyon listesi dünya genelinde 311 bin kaydı düz liste halinde
 * veriyor: tür yok, üst lokasyon yok, bazı kayıtlarda isim bile yok. Bizim
 * "şehir → ilçe" aramamız için işe yaramıyor.
 *
 * Lokasyonlar bunun yerine arama sonuçlarındaki destinationCodes'tan
 * kuruluyor (Türkiye → Marmara → İstanbul → Anadolu Yakası → Ümraniye);
 * bkz. sync.ts → indexHotelLocations.
 */
export async function getLocations(): Promise<LocationDto[]> {
  if (USE_MOCK) return mockGetLocations();
  return [];
}
