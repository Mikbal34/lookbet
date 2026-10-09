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

/** Bildirim zamanı: "az önce", "5 dakika önce", "3 saat önce", "dün", "4 gün önce"; bir haftadan eskiyse tarih. */
export function gecenSure(iso: string, simdi: number) {
  const t = new Date(iso).getTime();
  const dk = Math.floor((simdi - t) / 60_000);
  if (dk < 1) return "az önce";
  if (dk < 60) return `${dk} dakika önce`;
  if (dk < 24 * 60) return `${Math.floor(dk / 60)} saat önce`;
  const gun = Math.round((gunBasi(simdi) - gunBasi(t)) / 864e5);
  if (gun <= 1) return "dün";
  if (gun < 7) return `${gun} gün önce`;
  const d = new Date(t);
  const buYil = d.getFullYear() === new Date(simdi).getFullYear();
  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: buYil ? undefined : "numeric" });
}
