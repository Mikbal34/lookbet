// Vitrin kampanyası (istemci ve sunucu): tür, nesne ve kartın götürdüğü yer.
// Kartın metinleri (tarih, koşul, düğme) dile göre bileşende kurulur: metin.ts.
import type { NesneAdi } from "@/components/lb/nesne";
import { BOS_ARAMA, aramaAdresi } from "@/components/lb/arama/durum";
import { katla } from "@/lib/katla";

export interface VitrinKampanya {
  id: string;
  ad: string;
  tur: "EARLY_BOOKING" | "LAST_MINUTE" | "LONG_STAY" | "DATE_RANGE";
  yuzde: number;
  /** Yönetimde yazılan açıklama; boşsa koşul metni kurulur. */
  aciklama: string | null;
  /** Koşul: erken rezervasyonda girişe en az, son dakikada en fazla kalan gün; uzun konaklamada en az gece. */
  minGun: number | null;
  maxGun: number | null;
  minGece: number | null;
  /** Tarih aralığı kampanyasında giriş aralığı (YYYY-MM-DD). */
  girisBas: string | null;
  girisSon: string | null;
  /** Yayın başlangıcı ve bitişi, İstanbul saatiyle gün (YYYY-MM-DD). */
  baslangic: string | null;
  bitis: string | null;
  bolge: string | null;
  oteller: { kod: string; ad: string }[];
  yakinda: boolean;
}

const TUR_NESNE: Record<VitrinKampanya["tur"], NesneAdi> = {
  EARLY_BOOKING: "kartpostal",
  LAST_MINUTE: "bavul",
  LONG_STAY: "anahtar-karti",
  DATE_RANGE: "indirim",
};
const BOLGE_NESNE: Record<string, NesneAdi> = { bodrum: "bodrum", antalya: "antalya", kapadokya: "kapadokya" };

export const kampanyaNesnesi = (k: Pick<VitrinKampanya, "bolge" | "tur">): NesneAdi =>
  (k.bolge && BOLGE_NESNE[katla(k.bolge)]) || TUR_NESNE[k.tur];

/** Kartın götürdüğü yer: bölge aramasına, tek otele ya da ana sayfaya (tur: düğme metni için). */
export function kampanyaHedefi(k: Pick<VitrinKampanya, "bolge" | "oteller">) {
  if (k.bolge) return { href: aramaAdresi({ ...BOS_ARAMA, yer: k.bolge }), tur: "bolge" as const, bolge: k.bolge };
  if (k.oteller.length === 1) return { href: `/hotel/${k.oteller[0].kod}`, tur: "otel" as const };
  return { href: "/", tur: "ara" as const };
}
