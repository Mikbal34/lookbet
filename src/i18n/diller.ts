// Desteklenen diller ve dil çerezi. Adres yapısı dile göre değişmiyor
// (/en yok): dil NEXT_LOCALE çerezinde; yoksa tarayıcı Türkçe değilse
// İngilizce (i18n/request.ts). İstemci ve sunucu ortak kullanır.

export const DILLER = ["tr", "en"] as const;
export type Dil = (typeof DILLER)[number];
export const VARSAYILAN_DIL: Dil = "tr";
export const DIL_CEREZI = "NEXT_LOCALE";

/** Tarih ve sayı biçimi için Intl yereli (en-GB: 26 Oct 2026, €1,234). */
export const BICIM_YERELI: Record<Dil, string> = { tr: "tr-TR", en: "en-GB" };

export const dilMi = (v: unknown): v is Dil => typeof v === "string" && (DILLER as readonly string[]).includes(v);

/** Çereze yazar (bir yıl); sayfanın sunucu tarafı yeniden çizilince geçerli olur. */
export function dilCereziYaz(dil: Dil) {
  document.cookie = `${DIL_CEREZI}=${dil}; path=/; max-age=31536000; samesite=lax`;
}
