// Otel detayı yardımcıları: olanak ikonları, öne çıkanlar, iptal metinleri, oda özellikleri.
//
// Arayüz metinleri dile göre: ad işlevi (otel.* metin anahtarından) ya da
// biçimleyici (i18n/bicim) verilir. Verilmezse Türkçe; eski çağrılar (ör.
// ödeme sayfası) öncekiyle aynı metni alır.

import type { IkonAdi } from "@/components/lb/ikon";
import type { NesneAdi } from "@/components/lb/nesne";
import { bicimleyici, type Bicimleyici } from "@/i18n/bicim";
import type { CancellationPolicy, HotelFacilityItem, RoomResult } from "@/lib/royal-api/types";

const IKONLAR: [string, IkonAdi][] = [
  ["internet", "wifi"], ["wi-fi", "wifi"], ["wifi", "wifi"], ["havuz", "pool"], ["spa", "spa"], ["masaj", "spa"], ["sauna", "spa"],
  ["hamam", "spa"], ["fitness", "gym"], ["spor salonu", "gym"], ["antrenör", "gym"], ["plaj", "beach"], ["şezlong", "beach"],
  ["şemsiye", "beach"], ["iskele", "sea-view"], ["tekne", "sea-view"], ["deniz", "sea-view"], ["otopark", "parking"], ["vale", "parking"],
  ["klima", "ac"], ["bar", "restaurant"], ["oda servisi", "restaurant"], ["restoran", "restaurant"], ["kahvaltı", "breakfast"],
  ["havaalanı", "transfer"], ["transfer", "transfer"], ["çocuk", "child"], ["bebek", "child"], ["kasa", "lock"], ["resepsiyon", "clock"],
  ["konsiyerj", "key"], ["bahçe", "nature"], ["teras", "nature"], ["asansör", "door"], ["evcil", "pet"], ["sigara", "info"],
  ["bagaj", "key"], ["giriş", "key"], ["toplantı", "document"], ["çamaşır", "check"], ["temizlik", "check"], ["ütü", "check"],
  // İngilizce içerik (Etscore en-US olanak adları)
  ["pool", "pool"], ["massage", "spa"], ["steam", "spa"], ["turkish bath", "spa"], ["gym", "gym"], ["beach", "beach"],
  ["sun lounger", "beach"], ["sunbed", "beach"], ["umbrella", "beach"], ["pier", "sea-view"], ["boat", "sea-view"], ["sea", "sea-view"],
  ["parking", "parking"], ["valet", "parking"], ["air condition", "ac"], ["room service", "restaurant"], ["restaurant", "restaurant"],
  ["breakfast", "breakfast"], ["airport", "transfer"], ["shuttle", "transfer"], ["child", "child"], ["kids", "child"], ["baby", "child"],
  ["safe", "lock"], ["reception", "clock"], ["front desk", "clock"], ["concierge", "key"], ["garden", "nature"], ["terrace", "nature"],
  ["elevator", "door"], ["lift", "door"], ["pet", "pet"], ["smok", "info"], ["luggage", "key"], ["check-in", "key"], ["meeting", "document"],
  ["laundry", "check"], ["cleaning", "check"], ["ironing", "check"],
];

export function olanakIkonu(ad: string): IkonAdi {
  // Türkçe (İ→i, I→ı) ve İngilizce (I→i) küçültme: "Internet" de eşleşsin.
  const tr = ad.toLocaleLowerCase("tr");
  const en = ad.toLowerCase();
  return IKONLAR.find(([a]) => tr.includes(a) || en.includes(a))?.[1] ?? "check";
}

/** İlk bakışta gösterilecek olanaklar: bilinen ikonu olanlar önce. */
export function oneCikanOlanaklar(olanaklar: HotelFacilityItem[], adet = 10): HotelFacilityItem[] {
  const tekil = olanaklar.filter((o, i, l) => l.findIndex((x) => x.name.trim() === o.name.trim()) === i);
  return [...tekil].sort((a, b) => Number(olanakIkonu(a.name) === "check") - Number(olanakIkonu(b.name) === "check")).slice(0, adet);
}

/** Olanak grubu = metin anahtarı (otel.olanakGrubu.*). */
export type OlanakGrubu =
  | "genel" | "spor" | "spa" | "plaj" | "yemeIcme" | "cocukBebek" | "termal" | "kayak" | "hizmetler" | "otel" | "ozellik" | "diger";
// Veritabanındaki kategori adı → grup; bilinmeyen kategori kendi adıyla gösterilir.
const KATEGORI_GRUBU: Record<string, OlanakGrubu | undefined> = {
  Genel: "genel", Spor: "spor", Spa: "spa", Plaj: "plaj", "Yeme ve İçme": "yemeIcme", "Yeme İçme": "yemeIcme",
  "Çocuk ve Bebek": "cocukBebek", Termal: "termal", Kayak: "kayak", Hizmetler: "hizmetler", Otel: "otel", Özellik: "ozellik", Diğer: "diger",
  Aktiviteler: "spor", Wellness: "spa",
};
const GRUP_ADI: Record<OlanakGrubu, string> = {
  genel: "Genel", spor: "Spor ve aktivite", spa: "Spa ve sağlık", plaj: "Plaj", yemeIcme: "Yeme ve içme", cocukBebek: "Çocuk ve bebek",
  termal: "Termal", kayak: "Kayak", hizmetler: "Hizmetler", otel: "Otel", ozellik: "Özellik", diger: "Diğer",
};
/** Olanaklar gruplarıyla, kalabalık grup önce. grupAdi: grubun dile göre adı (verilmezse Türkçe). */
export function olanakGruplari(
  olanaklar: HotelFacilityItem[],
  grupAdi: (g: OlanakGrubu) => string = (g) => GRUP_ADI[g]
): [string, HotelFacilityItem[]][] {
  const g = new Map<string, HotelFacilityItem[]>();
  olanaklar.forEach((o) => {
    const kategori = o.categoryName ?? "Genel";
    const grup = KATEGORI_GRUBU[kategori];
    const k = grup ? grupAdi(grup) : kategori;
    if (!g.get(k)?.some((x) => x.name.trim() === o.name.trim())) g.set(k, [...(g.get(k) ?? []), o]);
  });
  return [...g.entries()].sort((a, b) => b[1].length - a[1].length);
}

/** Öne çıkan türü = nesnesi ve metin anahtarı (otel.oneCikan.*). */
export type OneCikanTuru = "plaj" | "spa" | "termal" | "kayak";
const ONE_CIKAN_BASLIK: Record<OneCikanTuru, string> = { plaj: "Plaj olanakları", spa: "Spa ve rahatlama", termal: "Termal", kayak: "Kayak" };

/** Olanaklardan çıkarılan öne çıkanlar (Arrow nesneli). Yalnız verisi olanlar. baslik: dile göre başlık (verilmezse Türkçe). */
export function oneCikanlar(
  olanaklar: HotelFacilityItem[],
  baslik: (tur: OneCikanTuru) => string = (tur) => ONE_CIKAN_BASLIK[tur]
): { nesne: NesneAdi; baslik: string; aciklama: string }[] {
  const adlar = (kat: string) => olanaklar.filter((o) => o.categoryName === kat).map((o) => o.name.trim());
  const sonuc: { nesne: NesneAdi; baslik: string; aciklama: string }[] = [];
  const plaj = adlar("Plaj");
  if (plaj.length) sonuc.push({ nesne: "plaj", baslik: baslik("plaj"), aciklama: plaj.slice(0, 4).join(", ") });
  const spa = [...adlar("Spa"), ...adlar("Wellness")];
  if (spa.length) sonuc.push({ nesne: "spa", baslik: baslik("spa"), aciklama: spa.slice(0, 4).join(", ") });
  const termal = adlar("Termal");
  if (termal.length) sonuc.push({ nesne: "termal", baslik: baslik("termal"), aciklama: termal.slice(0, 4).join(", ") });
  const kayak = adlar("Kayak");
  if (kayak.length) sonuc.push({ nesne: "kayak", baslik: baslik("kayak"), aciklama: kayak.slice(0, 4).join(", ") });
  return sonuc.slice(0, 2);
}

/* ── Tarihler ── */
// Gün ve ay tarayıcının saatiyle, saat otelin saatiyle (Türkiye).
let turkce: Bicimleyici | undefined;
const varsayilanBicim = () => (turkce ??= bicimleyici("tr"));
const saatBicimleri = new Map<string, Intl.DateTimeFormat>();
function otelSaati(d: Date, yerel: string) {
  let f = saatBicimleri.get(yerel);
  if (!f) saatBicimleri.set(yerel, (f = new Intl.DateTimeFormat(yerel, { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" })));
  return f.format(d);
}

/**
 * Tarihin parçaları: gun (20 Ekim · 20 October), saat (14:00) ve yonelme —
 * "… kadar" metnine giden biçim: Türkçede yönelme ekli (20 Ekim'e, 3 Mart'a),
 * İngilizcede tarihin kendisi. Biçimleyici verilmezse Türkçe.
 */
export function tarihParca(s: string, bicim: Bicimleyici = varsayilanBicim()) {
  const d = new Date(s);
  // Geçersiz tarihte Intl hata fırlatır; sayfa düşmesin.
  if (Number.isNaN(d.getTime())) return { gun: "", saat: "", yonelme: "" };
  const gun = bicim.gunAyUzun(d);
  // Eylül ve Ekim 'e, öbür aylar 'a alır.
  const yonelme = bicim.dil === "tr" ? `${gun}'${d.getMonth() === 8 || d.getMonth() === 9 ? "e" : "a"}` : gun;
  return { gun, saat: otelSaati(d, bicim.yerel), yonelme };
}

export interface IptalOzeti {
  ucretsiz: { yonelme: string; saat: string } | null;
  ceza: { gun: string; saat: string; tutar: number; para: string } | null;
}
/** İptal koşullarının özeti; tarihler verilen biçimleyiciyle (verilmezse Türkçe). */
export function iptalOzeti(politikalar: CancellationPolicy[] | undefined, bicim?: Bicimleyici): IptalOzeti {
  const p = politikalar ?? [];
  const bedava = p.find((x) => x.penalty === 0);
  const ceza = p.find((x) => x.penalty > 0);
  return {
    ucretsiz: bedava ? (({ yonelme, saat }) => ({ yonelme, saat }))(tarihParca(bedava.toDate, bicim)) : null,
    ceza: ceza ? { ...(({ gun, saat }) => ({ gun, saat }))(tarihParca(ceza.fromDate, bicim)), tutar: ceza.penalty, para: ceza.penaltyCurrency } : null,
  };
}

export function para(n: number, birim: string) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: birim || "EUR", maximumFractionDigits: 0 }).format(n);
}

/** Oda özelliği = metin anahtarı (otel.odaOzelligi.*). */
export type OdaOzelligi =
  | "kingYatak" | "queenYatak" | "ikiTekYatak" | "kismiDenizManzarasi" | "denizManzarasi" | "bahceManzarasi" | "havuzManzarasi" | "balkon" | "jakuzi";
const ODA_OZELLIGI: Record<OdaOzelligi, string> = {
  kingYatak: "King yatak", queenYatak: "Queen yatak", ikiTekYatak: "İki tek yatak", kismiDenizManzarasi: "Kısmi deniz manzarası",
  denizManzarasi: "Deniz manzarası", bahceManzarasi: "Bahçe manzarası", havuzManzarasi: "Havuz manzarası", balkon: "Balkon", jakuzi: "Jakuzi",
};
// Tedarikçinin yatak adı → özellik; bilinmeyen yatak kendi adıyla gösterilir.
const YATAKLAR: Record<string, OdaOzelligi | undefined> = { "King Bed": "kingYatak", "Queen Bed": "queenYatak", "Twin Beds": "ikiTekYatak" };

/** Oda adından ve niteliklerinden okunan özellikler. ad: özelliğin dile göre adı (verilmezse Türkçe). */
export function odaOzellikleri(oda: RoomResult, ad: (x: OdaOzelligi) => string = (x) => ODA_OZELLIGI[x]): { ikon: IkonAdi; metin: string }[] {
  // Oda adı aramanın dilinde gelir: Türkçe ya da İngilizce kalıpla eşleşir
  // (İngilizce "I" Türkçe küçültmede "ı" olur, ayrı küçültülür).
  const tr = oda.roomName.toLocaleLowerCase("tr");
  const en = oda.roomName.toLowerCase();
  const var_ = (t: string, e: string) => tr.includes(t) || en.includes(e);
  const o: { ikon: IkonAdi; metin: string }[] = [];
  const yatak = oda.attributes?.find((a) => a.categoryName === "Yatak")?.name;
  const yatakTuru = yatak ? YATAKLAR[yatak] : undefined;
  if (yatak) o.push({ ikon: "bed", metin: yatakTuru ? ad(yatakTuru) : yatak });
  o.push({ ikon: "breakfast", metin: oda.boardTypeName });
  if (var_("kısmi deniz", "partial sea")) o.push({ ikon: "sea-view", metin: ad("kismiDenizManzarasi") });
  else if (var_("deniz manzara", "sea view")) o.push({ ikon: "sea-view", metin: ad("denizManzarasi") });
  if (var_("bahçe manzara", "garden view")) o.push({ ikon: "nature", metin: ad("bahceManzarasi") });
  if (var_("havuz manzara", "pool view")) o.push({ ikon: "pool", metin: ad("havuzManzarasi") });
  if (var_("balkon", "balcony")) o.push({ ikon: "door", metin: ad("balkon") });
  if (var_("jakuzi", "jacuzzi")) o.push({ ikon: "bath", metin: ad("jakuzi") });
  oda.attributes?.filter((a) => a.categoryName !== "Yatak").slice(0, 4).forEach((a) => o.push({ ikon: olanakIkonu(a.name), metin: a.name }));
  return o;
}
