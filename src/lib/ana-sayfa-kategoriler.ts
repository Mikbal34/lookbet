// Ana sayfa kategorileri — istemciye güvenli (veritabanı kodu yok). Adları
// metin dosyasında: anaSayfa.kategori.<kod>.
import type { NesneAdi } from "@/components/lb/nesne";

export type KategoriKodu = "hepsi" | "deniz" | "termal" | "kayak" | "sehir";

export const KATEGORILER: { kod: KategoriKodu; nesne: NesneAdi }[] = [
  { kod: "hepsi", nesne: "zil" },
  { kod: "deniz", nesne: "deniz" },
  { kod: "termal", nesne: "termal" },
  { kod: "kayak", nesne: "kayak" },
  { kod: "sehir", nesne: "sehir" },
];
