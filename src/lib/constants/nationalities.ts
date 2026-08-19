// Royal API otel aramasında fiyatlar misafir uyruğuna göre değişir;
// bu liste arama formu ve filtre panelinde ortak kullanılır.
export const NATIONALITIES = [
  { code: "TR", label: "Türkiye" },
  { code: "DE", label: "Almanya" },
  { code: "GB", label: "İngiltere" },
  { code: "FR", label: "Fransa" },
  { code: "RU", label: "Rusya" },
  { code: "US", label: "Amerika" },
  { code: "NL", label: "Hollanda" },
  { code: "BE", label: "Belçika" },
  { code: "IT", label: "İtalya" },
  { code: "ES", label: "İspanya" },
] as const;

export const DEFAULT_NATIONALITY = "TR";
