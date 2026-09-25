// Ana sayfa kategorileri — istemciye güvenli (veritabanı kodu yok).
import type { NesneAdi } from "@/components/lb/nesne";

export type KategoriKodu = "hepsi" | "deniz" | "termal" | "kayak" | "sehir";

export const KATEGORILER: { kod: KategoriKodu; ad: string; nesne: NesneAdi }[] = [
  { kod: "hepsi", ad: "Hepsi", nesne: "zil" },
  { kod: "deniz", ad: "Deniz", nesne: "deniz" },
  { kod: "termal", ad: "Termal", nesne: "termal" },
  { kod: "kayak", ad: "Kayak", nesne: "kayak" },
  { kod: "sehir", ad: "Şehir", nesne: "sehir" },
];
