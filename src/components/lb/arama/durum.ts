// Arama çubuğunun ortak durumu ve yardımcıları.
// URL biçimi arama sayfasıyla aynı: destination, checkIn, checkOut (YYYY-MM-DD),
// adults, childAges (virgülle).

export interface AramaDegeri {
  /** Aramaya giden metin (konum adı ya da otel adı). */
  yer: string;
  /** Öneriden seçildiyse üst konum ("Muğla"); kutuda ikinci satır. */
  yerUst?: string | null;
  giris: Date | null;
  cikis: Date | null;
  yetiskin: number;
  /** Her çocuğun yaşı (0–17); Etscore fiyatı yaşa göre veriyor. */
  cocuklar: number[];
}

export type PanelAdi = "yer" | "tarih" | "misafir";

export const BOS_ARAMA: AramaDegeri = { yer: "", yerUst: null, giris: null, cikis: null, yetiskin: 2, cocuklar: [] };

export const AYLAR = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
export const GUNLER = ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"];

export const gunBasi = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const gunEkle = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export const ayniGun = (a: Date | null, b: Date | null) => !!a && !!b && a.getTime() === b.getTime();
export const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const isoOku = (s: string | null | undefined): Date | null => {
  const m = s?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
};
export const kisaTarih = (d: Date) => `${d.getDate()} ${AYLAR[d.getMonth()].slice(0, 3)}`;
export const geceSayisi = (a: Date, b: Date) => Math.round((gunBasi(b).getTime() - gunBasi(a).getTime()) / 864e5);

export function tarihMetni(d: AramaDegeri): string | null {
  if (!d.giris) return null;
  if (!d.cikis) return `${kisaTarih(d.giris)} – ?`;
  if (d.giris.getMonth() === d.cikis.getMonth()) return `${d.giris.getDate()}–${kisaTarih(d.cikis)}`;
  return `${kisaTarih(d.giris)} – ${kisaTarih(d.cikis)}`;
}

export function misafirMetni(d: AramaDegeri): string {
  const c = d.cocuklar.length;
  return `${d.yetiskin} yetişkin${c ? `, ${c} çocuk` : ""}`;
}

export function aramaAdresi(d: AramaDegeri): string {
  const p = new URLSearchParams({ destination: d.yer.trim() });
  if (d.giris) p.set("checkIn", iso(d.giris));
  if (d.cikis) p.set("checkOut", iso(d.cikis));
  p.set("adults", String(d.yetiskin));
  if (d.cocuklar.length) p.set("childAges", d.cocuklar.join(","));
  return `/search?${p.toString()}`;
}

/** Hızlı tarih seçenekleri: bu hafta sonu, gelecek hafta sonu, gelecek hafta. */
export function hizliTarihler(bugun = gunBasi(new Date())) {
  const cuma = gunEkle(bugun, (5 - bugun.getDay() + 7) % 7);
  // Cumartesi ya da pazar günündeysek "bu hafta sonu" bu günden başlasın.
  const buBas = bugun.getDay() === 6 || bugun.getDay() === 0 ? bugun : cuma;
  const buSon = gunEkle(cuma, 2);
  const pazartesi = gunEkle(bugun, ((8 - bugun.getDay()) % 7) || 7);
  return [
    { ad: "Bu hafta sonu", bas: buBas, son: buSon.getTime() > buBas.getTime() ? buSon : gunEkle(buBas, 1) },
    { ad: "Gelecek hafta sonu", bas: gunEkle(cuma, 7), son: gunEkle(cuma, 9) },
    { ad: "Bir hafta", bas: pazartesi, son: gunEkle(pazartesi, 7) },
  ];
}

export function aralikMetni(bas: Date, son: Date): string {
  return bas.getMonth() === son.getMonth() ? `${bas.getDate()} – ${kisaTarih(son)}` : `${kisaTarih(bas)} – ${kisaTarih(son)}`;
}
