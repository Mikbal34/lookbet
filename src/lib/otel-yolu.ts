// Otel sayfasının bağlantısı. Okunur adresi varsa lookbeds.com/<adres>
// (il + otelin adı: /antalya/club-hotel-sera), yoksa
// eski biçim /hotel/<kod>; sunucu o adresi okunur olana yönlendirir
// (app/hotel/[hotelCode]). Adresleri veren: lib/otel-adresi.ts.
//
// İstemcide de kullanılır: veritabanına dokunmaz.

export function otelYolu(kod: string, adres?: string | null, sorgu?: string): string {
  const yol = adres ? `/${adres}` : `/hotel/${encodeURIComponent(kod)}`;
  return sorgu ? `${yol}?${sorgu}` : yol;
}
