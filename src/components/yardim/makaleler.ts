// Yardım merkezi makaleleri. Sitenin bugünkü işleyişine göre yazıldı; bir özellik
// değişince ilgili makale de güncellenmeli (ör. tarih değiştirme gelince "tarih").
//
// Burada yalnız kayıt var (adres, kitle, konu). Başlık ve paragraflar dile göre
// messages/<dil>/yardim.json → makale.<anahtar> (metin: p1, p2, …); konu ve
// rehber adları da orada. Makale metinleri ICU'dan geçmeden, olduğu gibi
// okunur: sunucuda getMessages(), istemcide useMessages() → makaleKur /
// makaleleriKur. Böylece sayfa da arama da geçerli dilin metinlerini kullanır.

import type { Messages } from "next-intl";
import type { NesneAdi } from "@/components/lb/nesne";

export type Kitle = "misafir" | "acente";
/** Geçerli dilin makale metinleri (yardim.makale). */
export type MakaleMetinleri = Messages["yardim"]["makale"];
/** Konu anahtarı; adı yardim.konu.<konu>. */
export type Konu = keyof Messages["yardim"]["konu"];

export interface MakaleKaydi {
  /** Adres: /yardim/<id> (iki dilde aynı). */
  id: string;
  /** Metinlerin anahtarı: yardim.makale.<anahtar>. */
  anahtar: keyof MakaleMetinleri;
  kitle: Kitle;
  konu: Konu;
}

export interface Makale extends MakaleKaydi {
  baslik: string;
  metin: string[];
}

export const MAKALELER: MakaleKaydi[] = [
  { id: "giris", anahtar: "giris", kitle: "misafir", konu: "hesap" },
  { id: "kod", anahtar: "kod", kitle: "misafir", konu: "hesap" },
  { id: "hesap-bilgi", anahtar: "hesapBilgi", kitle: "misafir", konu: "hesap" },
  { id: "rezervasyonlarim", anahtar: "rezervasyonlarim", kitle: "misafir", konu: "rezervasyon" },
  { id: "onay-bekliyor", anahtar: "onayBekliyor", kitle: "misafir", konu: "rezervasyon" },
  { id: "rez-no", anahtar: "rezNo", kitle: "misafir", konu: "rezervasyon" },
  { id: "ozel-istek", anahtar: "ozelIstek", kitle: "misafir", konu: "rezervasyon" },
  { id: "iptal", anahtar: "iptal", kitle: "misafir", konu: "iptal" },
  { id: "ucretsiz-iptal", anahtar: "ucretsizIptal", kitle: "misafir", konu: "iptal" },
  { id: "iptal-ucreti", anahtar: "iptalUcreti", kitle: "misafir", konu: "iptal" },
  { id: "tarih", anahtar: "tarih", kitle: "misafir", konu: "iptal" },
  { id: "vergi", anahtar: "vergi", kitle: "misafir", konu: "fiyat" },
  { id: "uyruk", anahtar: "uyruk", kitle: "misafir", konu: "fiyat" },
  { id: "fatura", anahtar: "fatura", kitle: "misafir", konu: "fiyat" },
  { id: "giris-cikis", anahtar: "girisCikis", kitle: "misafir", konu: "konaklama" },
  { id: "otel-iletisim", anahtar: "otelIletisim", kitle: "misafir", konu: "konaklama" },
  { id: "a-giris", anahtar: "aGiris", kitle: "acente", konu: "giris" },
  { id: "a-basvuru", anahtar: "aBasvuru", kitle: "acente", konu: "giris" },
  { id: "a-rezervasyon", anahtar: "aRezervasyon", kitle: "acente", konu: "rezervasyon" },
  { id: "a-bugun", anahtar: "aBugun", kitle: "acente", konu: "rezervasyon" },
  { id: "a-iptal", anahtar: "aIptal", kitle: "acente", konu: "rezervasyon" },
  { id: "a-belge", anahtar: "aBelge", kitle: "acente", konu: "rezervasyon" },
  { id: "a-excel", anahtar: "aExcel", kitle: "acente", konu: "rezervasyon" },
  { id: "a-komisyon", anahtar: "aKomisyon", kitle: "acente", konu: "kazanc" },
  { id: "a-sirket", anahtar: "aSirket", kitle: "acente", konu: "sirket" },
];

/** "Başlarken" rehberleri: nesne, metin anahtarı (yardim.rehber.<anahtar>), açtığı makale. */
export const REHBERLER: Record<Kitle, { nesne: NesneAdi; anahtar: keyof Messages["yardim"]["rehber"]; makale: string }[]> = {
  misafir: [
    { nesne: "kapi", anahtar: "girisHesap", makale: "giris" },
    { nesne: "bavul", anahtar: "rezervasyon", makale: "rezervasyonlarim" },
    { nesne: "iptal", anahtar: "iptal", makale: "iptal" },
  ],
  acente: [
    { nesne: "anahtar-karti", anahtar: "partnerGiris", makale: "a-giris" },
    { nesne: "pasaport", anahtar: "musteriRezervasyon", makale: "a-rezervasyon" },
    { nesne: "havale", anahtar: "komisyon", makale: "a-komisyon" },
  ],
};

export const makaleBul = (id: string) => MAKALELER.find((m) => m.id === id) ?? null;

/** Kayda geçerli dilin başlığını ve paragraflarını ekler. */
export function makaleKur(k: MakaleKaydi, metinler: MakaleMetinleri): Makale {
  const { baslik, metin } = metinler[k.anahtar];
  return { ...k, baslik, metin: Object.values(metin) };
}

/** Bütün makaleler, geçerli dilde, kayıt sırasıyla. */
export const makaleleriKur = (metinler: MakaleMetinleri) => MAKALELER.map((k) => makaleKur(k, metinler));

/** Kitlenin konuları, makale sırasına göre. */
export const konular = (k: Kitle) => [...new Set(MAKALELER.filter((m) => m.kitle === k).map((m) => m.konu))];

export const DESTEK = { eposta: "destek@lookbet.com", telefon: "0850 255 00 00", telefonHref: "tel:+908502550000" };
