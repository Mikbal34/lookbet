// Arama çubuğunun ortak durumu ve yardımcıları.
// URL biçimi arama sayfasıyla aynı: destination, konum (öneriden seçildiyse
// konum kimliği), checkIn, checkOut (YYYY-MM-DD), adults, childAges (virgülle).
//
// Metin yardımcılarının iki hali var: AYLAR, kisaTarih, tarihMetni,
// misafirMetni, aralikMetni ve hizliTarihler Türkçe yazar (başka ekranlar
// hâlâ kullanıyor); tarihOzeti, aralikOzeti, misafirOzeti ve hizliAraliklar
// geçerli dilde yazar (b = useBicim() ya da bicimleyici(dil),
// t = useTranslations("arama") ya da getTranslations("arama")). Dosya sunucu
// bileşenlerinden de içe aktarılıyor; burada yalnız saf fonksiyonlar var.

import type { useTranslations } from "next-intl";
import type { Bicimleyici } from "@/i18n/bicim";

export interface AramaDegeri {
  /** Aramaya giden metin (konum adı ya da otel adı). */
  yer: string;
  /** Öneriden seçildiyse üst konum ("Muğla"); kutuda ikinci satır. */
  yerUst?: string | null;
  /** Öneriden seçilen konumun kimliği: aynı adlı konumlar (üç ayrı "Bodrum")
   *  karışmasın, arama o konumun altındaki otellerle yapılsın. */
  yerId?: string | null;
  giris: Date | null;
  cikis: Date | null;
  yetiskin: number;
  /** Her çocuğun yaşı (0–17); Etscore fiyatı yaşa göre veriyor. */
  cocuklar: number[];
}

export type PanelAdi = "yer" | "tarih" | "misafir";

export const BOS_ARAMA: AramaDegeri = { yer: "", yerUst: null, yerId: null, giris: null, cikis: null, yetiskin: 2, cocuklar: [] };

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
  if (d.yerId) p.set("konum", d.yerId);
  if (d.giris) p.set("checkIn", iso(d.giris));
  if (d.cikis) p.set("checkOut", iso(d.cikis));
  p.set("adults", String(d.yetiskin));
  if (d.cocuklar.length) p.set("childAges", d.cocuklar.join(","));
  return `/search?${p.toString()}`;
}

/** Hızlı tarih seçeneği; adı arama.takvim.hizli.<anahtar> metninde. */
export type HizliTarih = "buHaftaSonu" | "gelecekHaftaSonu" | "birHafta";

/** Hızlı tarih seçenekleri: bu hafta sonu, gelecek hafta sonu, gelecek hafta. */
export function hizliAraliklar(bugun = gunBasi(new Date())): { anahtar: HizliTarih; bas: Date; son: Date }[] {
  const gun = bugun.getDay(); // 0 pazar … 6 cumartesi
  // Bu hafta sonunun cuması: cumartesi günü dünkü cuma (giriş bugün, çıkış
  // yarın pazar); pazar günü hafta sonu bitiyor, gelecek cuma; diğer günler bu
  // cuma. Önceden cumartesi günü cuma gelecek haftaya kayıyor, "bu hafta sonu"
  // 8 gece oluyordu (26 Eyl – 4 Eki).
  const cuma = gun === 6 ? gunEkle(bugun, -1) : gun === 0 ? gunEkle(bugun, 5) : gunEkle(bugun, 5 - gun);
  const buBas = cuma.getTime() < bugun.getTime() ? bugun : cuma;
  const buSon = gunEkle(cuma, 2);
  const pazartesi = gunEkle(bugun, ((8 - gun) % 7) || 7);
  return [
    { anahtar: "buHaftaSonu", bas: buBas, son: buSon },
    { anahtar: "gelecekHaftaSonu", bas: gunEkle(cuma, 7), son: gunEkle(cuma, 9) },
    { anahtar: "birHafta", bas: pazartesi, son: gunEkle(pazartesi, 7) },
  ];
}

const HIZLI_AD: Record<HizliTarih, string> = { buHaftaSonu: "Bu hafta sonu", gelecekHaftaSonu: "Gelecek hafta sonu", birHafta: "Bir hafta" };

/** hizliAraliklar, Türkçe adıyla. */
export function hizliTarihler(bugun = gunBasi(new Date())) {
  return hizliAraliklar(bugun).map(({ anahtar, bas, son }) => ({ ad: HIZLI_AD[anahtar], bas, son }));
}

export function aralikMetni(bas: Date, son: Date): string {
  return bas.getMonth() === son.getMonth() ? `${bas.getDate()} – ${kisaTarih(son)}` : `${kisaTarih(bas)} – ${kisaTarih(son)}`;
}

/* ── Geçerli dilde ─────────────────────────────────────────────────── */

type AramaMetinleri = ReturnType<typeof useTranslations<"arama">>;

/** tarihMetni gibi, geçerli dilde: "3–5 Eki" · "3–5 Oct"; çıkış yoksa "3 Eki – ?". */
export function tarihOzeti(d: AramaDegeri, b: Bicimleyici): string | null {
  if (!d.giris) return null;
  if (!d.cikis) return `${b.gunAy(d.giris)} – ?`;
  if (d.giris.getMonth() === d.cikis.getMonth()) return `${d.giris.getDate()}–${b.gunAy(d.cikis)}`;
  return `${b.gunAy(d.giris)} – ${b.gunAy(d.cikis)}`;
}

/** aralikMetni gibi, geçerli dilde: "3 – 5 Eki" · "3 – 5 Oct". */
export function aralikOzeti(bas: Date, son: Date, b: Bicimleyici): string {
  return bas.getMonth() === son.getMonth() ? `${bas.getDate()} – ${b.gunAy(son)}` : `${b.gunAy(bas)} – ${b.gunAy(son)}`;
}

/** misafirMetni gibi, geçerli dilde: "2 yetişkin, 1 çocuk" · "2 adults, 1 child". */
export function misafirOzeti(d: AramaDegeri, t: AramaMetinleri): string {
  return t("misafir.ozet", { yetiskin: d.yetiskin, cocuk: d.cocuklar.length });
}
