// Otomatik indirim türlerinin sitede görünen adları (istemci ve sunucu).
export const KAMPANYA_TURU: Record<string, string> = {
  EARLY_BOOKING: "Erken rezervasyon",
  LAST_MINUTE: "Son dakika",
  LONG_STAY: "Uzun konaklama",
  DATE_RANGE: "Kampanya",
};
/** Arama kartındaki etiket: "%15 erken rezervasyon". */
export const kampanyaEtiketi = (k: { yuzde: number; tur: string }) =>
  `%${k.yuzde.toLocaleString("tr-TR")} ${(KAMPANYA_TURU[k.tur] ?? "indirim").toLocaleLowerCase("tr")}`;
