// LookBeds Partner (acente paneli): rezervasyonları "bugün" gruplarına ayırma
// ve ortak biçimlendirme.

import { gunOku, iptalDurumu, type Rezervasyon } from "@/components/rezervasyonlar/ortak";

export type Grup = "bugun" | "konakliyor" | "ayriliyor" | "yaklasan" | "tamam" | "iptal";

const gunBasi = (t: number) => {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};

export function grup(r: Rezervasyon, simdi: number): Grup {
  if (r.status === "CANCELLED" || r.status === "FAILED") return "iptal";
  const bugun = gunBasi(simdi);
  const g = gunOku(r.checkIn).getTime();
  const c = gunOku(r.checkOut).getTime();
  if (c < bugun) return "tamam";
  if (g === bugun) return "bugun";
  if (c === bugun) return "ayriliyor";
  if (g < bugun) return "konakliyor";
  return "yaklasan";
}

/** Ücretsiz iptalin bitmesine kalan gün (yalnız yaklaşan, ücretsiz iptali süren rezervasyonlarda). */
export function iptalKalan(r: Rezervasyon, simdi: number): number | null {
  const son = iptalDurumu(r, simdi).ucretsizSon;
  if (!son) return null;
  return Math.max(0, Math.floor((gunBasi(son.getTime()) - gunBasi(simdi)) / 864e5));
}

export const misafirAdi = (r: Rezervasyon) =>
  r.contactName || (r.guests?.[0] ? `${r.guests[0].name} ${r.guests[0].surname}` : "Misafir");
