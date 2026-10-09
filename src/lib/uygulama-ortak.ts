// Mobil uygulama (yalnız müşteri) işaretleri; sunucu ve tarayıcı kodu ortak.
// Uygulama User-Agent'ın sonuna "LookBedsApp/<sürüm>" ekler (Capacitor
// appendUserAgent). Tarayıcıda denemek için /api/uygulama?ac=1 oturum çerezi koyar.

export const UYGULAMA_UA = "LookBedsApp/";
export const UYGULAMA_CEREZ = "lb_uygulama";
