// Arama sonuçları filtreleri — istemcide, gelen oteller üzerinde.
import type { HotelSearchResult } from "@/lib/royal-api/types";

export interface Filtre {
  iptal: boolean;
  kahvalti: boolean;
  hepsiDahil: boolean;
  yildiz4: boolean;
  /** Gecelik fiyat aralığı; null = sınır yok. */
  min: number | null;
  max: number | null;
  pansiyon: string[];
  yildiz: 0 | 3 | 4 | 5;
}

export type Siralama = "oneri" | "ucuz" | "pahali" | "yildiz";

export const BOS_FILTRE: Filtre = { iptal: false, kahvalti: false, hepsiDahil: false, yildiz4: false, min: null, max: null, pansiyon: [], yildiz: 0 };

// "Kahvaltı dahil": oda kahvaltı, yarım/tam pansiyon ve her şey dahil hepsi kahvaltı içerir.
const KAHVALTILI = /kahvalt|pansiyon|dahil/i;
const HEPSI_DAHIL = /her şey dahil/i;

export function uyar(h: HotelSearchResult, f: Filtre): boolean {
  return (
    (!f.iptal || !!h.freeCancellation) &&
    (!f.kahvalti || h.boardTypes.some((b) => KAHVALTILI.test(b))) &&
    (!f.hepsiDahil || h.boardTypes.some((b) => HEPSI_DAHIL.test(b))) &&
    (!f.yildiz4 || h.stars >= 4) &&
    (f.min === null || h.minPrice >= f.min) &&
    (f.max === null || h.minPrice <= f.max) &&
    (!f.pansiyon.length || h.boardTypes.some((b) => f.pansiyon.includes(b))) &&
    (!f.yildiz || h.stars >= f.yildiz)
  );
}

export function filtrele(oteller: HotelSearchResult[], f: Filtre, sira: Siralama): HotelSearchResult[] {
  const l = oteller.filter((h) => uyar(h, f));
  if (sira === "ucuz") l.sort((a, b) => a.minPrice - b.minPrice);
  if (sira === "pahali") l.sort((a, b) => b.minPrice - a.minPrice);
  if (sira === "yildiz") l.sort((a, b) => b.stars - a.stars || a.minPrice - b.minPrice);
  return l;
}

export function filtreSayisi(f: Filtre): number {
  return [f.iptal, f.kahvalti, f.hepsiDahil, f.yildiz4].filter(Boolean).length
    + (f.min !== null || f.max !== null ? 1 : 0) + f.pansiyon.length + (f.yildiz ? 1 : 0);
}
