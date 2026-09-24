// Otel araması önbelleği — aynı arama 10 dakika içinde tekrar gelirse
// Etscore'a gitmeden döner.
//
// Neden: İstanbul araması Etscore'da ~2,5 sn. Kullanıcı otele girip geri
// döndüğünde, filtreyi değiştirip dönünce ya da aynı aramayı başka biri
// yapınca bekletmemek. Tedarikçiye giden arama sayısı da düşüyor (toptancılar
// arama/satış oranına bakıyor). Kesin fiyat zaten oda seçiminde canlı
// soruluyor; buradaki fiyat en fazla 10 dakikalık, priceCode'un 30 dakikalık
// ömrünün içinde.
//
// Süreç içi: uygulama tek süreçte koşuyor. Yeniden başlarsa boşalır.

import { katla } from "@/lib/otel-arama";
import type { HotelSearchResult } from "@/lib/royal-api/types";

const OMUR_MS = 10 * 60 * 1000;
/** İstanbul ~300 otel ≈ 150 KB; 200 kayıt en kötü ~30 MB. */
const EN_FAZLA = 200;

export interface AramaKaydi {
  searchId: string;
  hotels: HotelSearchResult[];
  eslesme: string;
}

const kayitlar = new Map<string, AramaKaydi & { zaman: number }>();

export function aramaAnahtari(a: {
  destination: string;
  checkIn: string;
  checkOut: string;
  rooms: { adult: number; childAges?: number[] }[];
  currency: string;
  nationality: string;
  feedId: string;
}): string {
  return JSON.stringify([
    katla(a.destination),
    a.checkIn,
    a.checkOut,
    a.rooms.map((r) => [r.adult, r.childAges ?? []]),
    a.currency,
    a.nationality,
    a.feedId,
  ]);
}

export function onbellektenAl(anahtar: string): AramaKaydi | null {
  const k = kayitlar.get(anahtar);
  if (!k) return null;
  if (Date.now() - k.zaman > OMUR_MS) {
    kayitlar.delete(anahtar);
    return null;
  }
  return k;
}

export function onbellegeYaz(anahtar: string, kayit: AramaKaydi): void {
  kayitlar.delete(anahtar);
  kayitlar.set(anahtar, { ...kayit, zaman: Date.now() });
  // Map ekleme sırasını koruyor: en eski baştaki.
  while (kayitlar.size > EN_FAZLA) kayitlar.delete(kayitlar.keys().next().value!);
}
