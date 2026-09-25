// Otel detayı yardımcıları: olanak ikonları, öne çıkanlar, iptal metinleri, oda özellikleri.

import type { IkonAdi } from "@/components/lb/ikon";
import type { NesneAdi } from "@/components/lb/nesne";
import type { CancellationPolicy, HotelFacilityItem, RoomResult } from "@/lib/royal-api/types";

const IKONLAR: [string, IkonAdi][] = [
  ["internet", "wifi"], ["wi-fi", "wifi"], ["wifi", "wifi"], ["havuz", "pool"], ["spa", "spa"], ["masaj", "spa"], ["sauna", "spa"],
  ["hamam", "spa"], ["fitness", "gym"], ["spor salonu", "gym"], ["antrenör", "gym"], ["plaj", "beach"], ["şezlong", "beach"],
  ["şemsiye", "beach"], ["iskele", "sea-view"], ["tekne", "sea-view"], ["deniz", "sea-view"], ["otopark", "parking"], ["vale", "parking"],
  ["klima", "ac"], ["bar", "restaurant"], ["oda servisi", "restaurant"], ["restoran", "restaurant"], ["kahvaltı", "breakfast"],
  ["havaalanı", "transfer"], ["transfer", "transfer"], ["çocuk", "child"], ["bebek", "child"], ["kasa", "lock"], ["resepsiyon", "clock"],
  ["konsiyerj", "key"], ["bahçe", "nature"], ["teras", "nature"], ["asansör", "door"], ["evcil", "pet"], ["sigara", "info"],
  ["bagaj", "key"], ["giriş", "key"], ["toplantı", "document"], ["çamaşır", "check"], ["temizlik", "check"], ["ütü", "check"],
];

export function olanakIkonu(ad: string): IkonAdi {
  const k = ad.toLocaleLowerCase("tr");
  return IKONLAR.find(([a]) => k.includes(a))?.[1] ?? "check";
}

/** İlk bakışta gösterilecek olanaklar: bilinen ikonu olanlar önce. */
export function oneCikanOlanaklar(olanaklar: HotelFacilityItem[], adet = 10): HotelFacilityItem[] {
  const tekil = olanaklar.filter((o, i, l) => l.findIndex((x) => x.name.trim() === o.name.trim()) === i);
  return [...tekil].sort((a, b) => Number(olanakIkonu(a.name) === "check") - Number(olanakIkonu(b.name) === "check")).slice(0, adet);
}

const KATEGORI_ADI: Record<string, string> = {
  Genel: "Genel", Spor: "Spor ve aktivite", Spa: "Spa ve sağlık", Plaj: "Plaj", "Yeme ve İçme": "Yeme ve içme",
  "Yeme İçme": "Yeme ve içme", "Çocuk ve Bebek": "Çocuk ve bebek", Termal: "Termal", Kayak: "Kayak", Hizmetler: "Hizmetler",
};
export function olanakGruplari(olanaklar: HotelFacilityItem[]): [string, HotelFacilityItem[]][] {
  const g = new Map<string, HotelFacilityItem[]>();
  olanaklar.forEach((o) => {
    const k = KATEGORI_ADI[o.categoryName] ?? o.categoryName ?? "Genel";
    if (!g.get(k)?.some((x) => x.name.trim() === o.name.trim())) g.set(k, [...(g.get(k) ?? []), o]);
  });
  return [...g.entries()].sort((a, b) => b[1].length - a[1].length);
}

/** Olanaklardan çıkarılan öne çıkanlar (Arrow nesneli). Yalnız verisi olanlar. */
export function oneCikanlar(olanaklar: HotelFacilityItem[]): { nesne: NesneAdi; baslik: string; aciklama: string }[] {
  const adlar = (kat: string) => olanaklar.filter((o) => o.categoryName === kat).map((o) => o.name.trim());
  const sonuc: { nesne: NesneAdi; baslik: string; aciklama: string }[] = [];
  const plaj = adlar("Plaj");
  if (plaj.length) sonuc.push({ nesne: "plaj", baslik: "Plaj olanakları", aciklama: plaj.slice(0, 4).join(", ") });
  const spa = [...adlar("Spa"), ...adlar("Wellness")];
  if (spa.length) sonuc.push({ nesne: "spa", baslik: "Spa ve rahatlama", aciklama: spa.slice(0, 4).join(", ") });
  const termal = adlar("Termal");
  if (termal.length) sonuc.push({ nesne: "termal", baslik: "Termal", aciklama: termal.slice(0, 4).join(", ") });
  const kayak = adlar("Kayak");
  if (kayak.length) sonuc.push({ nesne: "kayak", baslik: "Kayak", aciklama: kayak.slice(0, 4).join(", ") });
  return sonuc.slice(0, 2);
}

/* ── Tarihler (Türkçe ekler) ── */
const AYLAR = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const YONELME: Record<string, string> = { Eylül: "e", Ekim: "e" };
export function tarihParca(s: string) {
  const d = new Date(s);
  const ay = AYLAR[d.getMonth()];
  const saat = d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" });
  return { gun: `${d.getDate()} ${ay}`, saat, yonelme: `${d.getDate()} ${ay}'${YONELME[ay] ?? "a"}` };
}

export interface IptalOzeti {
  ucretsiz: { yonelme: string; saat: string } | null;
  ceza: { gun: string; saat: string; tutar: number; para: string } | null;
}
export function iptalOzeti(politikalar: CancellationPolicy[] | undefined): IptalOzeti {
  const p = politikalar ?? [];
  const bedava = p.find((x) => x.penalty === 0);
  const ceza = p.find((x) => x.penalty > 0);
  return {
    ucretsiz: bedava ? (({ yonelme, saat }) => ({ yonelme, saat }))(tarihParca(bedava.toDate)) : null,
    ceza: ceza ? { ...(({ gun, saat }) => ({ gun, saat }))(tarihParca(ceza.fromDate)), tutar: ceza.penalty, para: ceza.penaltyCurrency } : null,
  };
}

export function para(n: number, birim: string) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: birim || "EUR", maximumFractionDigits: 0 }).format(n);
}

/** Oda adından ve niteliklerinden okunan özellikler. */
export function odaOzellikleri(oda: RoomResult): { ikon: IkonAdi; metin: string }[] {
  const k = oda.roomName.toLocaleLowerCase("tr");
  const o: { ikon: IkonAdi; metin: string }[] = [];
  const yatak = oda.attributes?.find((a) => a.categoryName === "Yatak")?.name;
  if (yatak) o.push({ ikon: "bed", metin: { "King Bed": "King yatak", "Queen Bed": "Queen yatak", "Twin Beds": "İki tek yatak" }[yatak] ?? yatak });
  o.push({ ikon: "breakfast", metin: oda.boardTypeName });
  if (k.includes("kısmi deniz")) o.push({ ikon: "sea-view", metin: "Kısmi deniz manzarası" });
  else if (k.includes("deniz manzara")) o.push({ ikon: "sea-view", metin: "Deniz manzarası" });
  if (k.includes("bahçe manzara")) o.push({ ikon: "nature", metin: "Bahçe manzarası" });
  if (k.includes("havuz manzara")) o.push({ ikon: "pool", metin: "Havuz manzarası" });
  if (k.includes("balkon")) o.push({ ikon: "door", metin: "Balkon" });
  if (k.includes("jakuzi")) o.push({ ikon: "bath", metin: "Jakuzi" });
  oda.attributes?.filter((a) => a.categoryName !== "Yatak").slice(0, 4).forEach((a) => o.push({ ikon: olanakIkonu(a.name), metin: a.name }));
  return o;
}
