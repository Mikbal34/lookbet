// Kampanya tarihleri Türkiye saatine göre: başlangıç günün başı, bitiş günün
// sonu (İstanbul). Konaklama aralığı (stayStart/stayEnd) tarih olarak saklanır.
export const trGunBasi = (v: string) => new Date(`${v}T00:00:00+03:00`);
export const trGunSonu = (v: string) => new Date(`${v}T23:59:59+03:00`);
export const tarihOlarak = (v: string) => new Date(`${v}T00:00:00Z`);

/** undefined → değiştirme, null → temizle, "YYYY-AA-GG" → Date. */
export const tarihAlani = (v: string | null | undefined, cevir: (s: string) => Date) =>
  v === undefined ? undefined : v === null ? null : cevir(v);
