// Rezervasyonlarım: ortak tipler, durum rozetleri, tarih ve iptal hesapları.

import { AYLAR, isoOku } from "@/components/lb/arama/durum";
import type { CancellationPolicy } from "@/lib/royal-api/types";

export type Durum = "PENDING" | "CONFIRMED" | "CANCELLED" | "FAILED";

export interface Rezervasyon {
  id: string;
  bookingNumber?: string | null;
  hotelCode: string;
  hotelName?: string | null;
  checkIn: string;
  checkOut: string;
  status: Durum;
  totalPrice: number;
  discountedPrice?: number | null;
  discountAmount?: number | null;
  currency: string;
  boardType?: string | null;
  boardTypeName?: string | null;
  roomType?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  guests?: { name: string; surname: string; type: "Adult" | "Child"; age?: number }[] | null;
  cancellationPolicy?: CancellationPolicy[] | null;
  hotelConfirmationNumber?: string | null;
  cancellationFee?: number | null;
  cancellationFeeCurrency?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  hotel?: { image: string | null; stars: number | null; place?: string | null; address?: string | null; city?: string | null; phone?: string | null } | null;
}

const GUN = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];

/** Sunucudaki tarih (gece yarısı UTC) → yerel gün. */
export const gunOku = (s: string) => isoOku(s.slice(0, 10))!;
export const gunKisa = (d: Date) => `${d.getDate()} ${AYLAR[d.getMonth()]}`;
export const gunUzun = (d: Date) => `${GUN[d.getDay()]}, ${d.getDate()} ${AYLAR[d.getMonth()]}`;
export const geceler = (r: Rezervasyon) => Math.max(1, Math.round((gunOku(r.checkOut).getTime() - gunOku(r.checkIn).getTime()) / 864e5));

export function aralik(r: Rezervasyon) {
  const g = gunOku(r.checkIn), c = gunOku(r.checkOut);
  if (g.getMonth() === c.getMonth() && g.getFullYear() === c.getFullYear()) return `${g.getDate()}–${c.getDate()} ${AYLAR[c.getMonth()]} ${c.getFullYear()}`;
  return `${gunKisa(g)} – ${gunKisa(c)} ${c.getFullYear()}`;
}

export const tutar = (r: Rezervasyon) => r.discountedPrice ?? r.totalPrice;

export function misafirYazi(r: Rezervasyon) {
  const g = r.guests ?? [];
  if (!g.length) return null;
  const y = g.filter((x) => x.type === "Adult").length;
  const c = g.length - y;
  return `${y} yetişkin${c ? `, ${c} çocuk` : ""}`;
}

/** Bugünden girişe kalan gün (bugün = 0). */
export const kalanGun = (r: Rezervasyon, simdi: number) => {
  const b = new Date(simdi);
  return Math.round((gunOku(r.checkIn).getTime() - new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime()) / 864e5);
};

export function durumBilgisi(r: Rezervasyon, simdi: number): { ad: string; renk: "yesil" | "sari" | "gri" | "kirmizi" } {
  if (r.status === "CANCELLED") return { ad: "İptal edildi", renk: "kirmizi" };
  if (r.status === "FAILED") return { ad: "Tamamlanamadı", renk: "kirmizi" };
  if (gunOku(r.checkOut).getTime() < simdi) return { ad: "Tamamlandı", renk: "gri" };
  if (r.status === "PENDING") return { ad: "Otel onayı bekleniyor", renk: "sari" };
  return { ad: "Onaylandı", renk: "yesil" };
}

/** Şu an iptal edilirse kesilecek ücret (koşullara göre tahmin) ve ücretsiz iptalin son anı. */
export function iptalDurumu(r: Rezervasyon, simdi: number) {
  const p = r.cancellationPolicy ?? [];
  const ucretsiz = p.find((x) => x.penalty === 0);
  const simdikiKosul = p.find((x) => Date.parse(x.fromDate) <= simdi && simdi <= Date.parse(x.toDate));
  const ucretsizSon = ucretsiz ? new Date(ucretsiz.toDate) : null;
  return {
    bilgiVar: p.length > 0,
    ucretsizSon: ucretsizSon && ucretsizSon.getTime() > simdi ? ucretsizSon : null,
    ucretsizSonHer: ucretsizSon,
    simdiUcret: simdikiKosul ? simdikiKosul.penalty : ucretsiz && Date.parse(ucretsiz.toDate) > simdi ? 0 : null,
    ceza: p.find((x) => x.penalty > 0) ?? null,
  };
}

const YONELME: Record<number, string> = { 8: "e", 9: "e" }; // Eylül'e, Ekim'e
/** "2 Ekim'e" gibi yönelme ekli gün. */
export const gunYonelme = (d: Date) => `${d.getDate()} ${AYLAR[d.getMonth()]}'${YONELME[d.getMonth()] ?? "a"}`;
export const saat = (d: Date) => d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" });

/** "+90 532 123 45 67" → "+90 532 ••• •• 67": ülke kodu, ilk grup ve son iki hane kalır. */
export const telefonGizle = (t: string) => {
  const p = t.replace(/\s+/g, " ").trim().split(" ");
  if (p.length >= 4) return [...p.slice(0, 2), ...p.slice(2, -1).map((x) => "•".repeat(x.length)), p[p.length - 1]].join(" ");
  const r = p.join(" ");
  return r.length > 6 ? `${r.slice(0, 4)}${"•".repeat(r.length - 6)}${r.slice(-2)}` : r;
};
