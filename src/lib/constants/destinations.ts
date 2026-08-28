// Popüler destinasyonlar — ana sayfadaki hızlı chip'ler ve tam ekran arama
// akışındaki öneri listesi aynı kaynağı kullansın diye burada.

export const POPULAR_DESTINATIONS = [
  { label: "İstanbul", query: "İstanbul" },
  { label: "Antalya", query: "Antalya" },
  { label: "Kapadokya", query: "Kapadokya" },
  { label: "Bodrum", query: "Bodrum" },
  { label: "Çeşme", query: "Çeşme" },
  { label: "Uludağ", query: "Uludağ" },
] as const;

export type PopularDestination = (typeof POPULAR_DESTINATIONS)[number];
