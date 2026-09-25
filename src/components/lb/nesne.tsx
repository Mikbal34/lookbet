// Otel nesnesi illüstrasyonları (Arrow ile üretildi) — public/nesne/*.svg.
// Karakter katmanı: kategori sekmeleri, öne çıkanlar, boş durumlar.
// İşlev ikonları için <Ikon> (çizgi) kullanılır.

export type NesneAdi =
  | "zil" | "deniz" | "termal" | "kayak" | "sehir" | "anahtar-karti" | "bavul"
  | "plaj" | "spa" | "iptal" | "indirim" | "kilit" | "odeme-karti" | "havale"
  | "kahvalti" | "hersey-dahil" | "kartpostal" | "pasaport" | "kapi"
  | "bodrum" | "kapadokya" | "antalya";

export function Nesne({ ad, boyut = 56, className }: { ad: NesneAdi; boyut?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- küçük, sabit SVG; optimizasyona gerek yok
    <img src={`/nesne/${ad}.svg`} width={boyut} height={boyut} alt="" draggable={false} className={className} />
  );
}
