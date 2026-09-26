// Metin dosyaları alan alan: messages/<dil>/<alan>.json. Her alan bir ekran
// grubunun metinleri; bileşen useTranslations("<alan>") ile okur. Yeni alan
// eklenince buraya ve global.d.ts'e de eklenmeli.
export const ALANLAR = [
  "ortak",
  "ust",
  "anaSayfa",
  "arama",
  "otel",
  "odeme",
  "hesap",
  "giris",
  "rezervasyon",
  "yardim",
  "api",
] as const;
export type Alan = (typeof ALANLAR)[number];
