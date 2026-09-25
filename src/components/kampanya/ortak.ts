// Vitrin kampanyası (istemci ve sunucu): tür, nesne ve kartın götürdüğü yer.
import type { NesneAdi } from "@/components/lb/nesne";
import { BOS_ARAMA, aramaAdresi } from "@/components/lb/arama/durum";
import { katla } from "@/lib/katla";

export interface VitrinKampanya {
  id: string;
  ad: string;
  tur: "EARLY_BOOKING" | "LAST_MINUTE" | "LONG_STAY" | "DATE_RANGE";
  yuzde: number;
  aciklama: string;
  tarih: string;
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

/** Kartın götürdüğü yer: bölge aramasına, tek otele ya da ana sayfaya. */
export function kampanyaHedefi(k: Pick<VitrinKampanya, "bolge" | "oteller">) {
  if (k.bolge) return { href: aramaAdresi({ ...BOS_ARAMA, yer: k.bolge }), dugme: `${k.bolge} otelleri` };
  if (k.oteller.length === 1) return { href: `/hotel/${k.oteller[0].kod}`, dugme: "Otele bak" };
  return { href: "/", dugme: "Otel ara" };
}
