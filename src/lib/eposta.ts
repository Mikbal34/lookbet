// E-posta gönderimi (Resend) ve rezervasyon e-postaları. RESEND_API_KEY
// yoksa (lokal geliştirme) gönderilmez, yalnız loga kim/konu yazılır.
// Gönderim hatası akışı bozmaz: çağıranlar .catch ile loglar.

import type { CancellationPolicy } from "@/lib/royal-api/types";

const GONDEREN = () => process.env.EMAIL_FROM ?? "LookBeds <noreply@lookbeds.com>";
const SITE = () => (process.env.NEXTAUTH_URL ?? "").replace(/\/$/, "");

/** HTML'e giden her dış değer (ad, not, otel adı) kaçırılır. */
export const kacir = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export async function epostaGonder(p: { to: string; subject: string; html: string; text: string }): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[EPOSTA] (gönderilmedi, mailer yok) ${p.to}: ${p.subject}`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: GONDEREN(), to: [p.to], subject: p.subject, html: p.html, text: p.text }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`E-posta gönderilemedi: ${res.status}`);
}

/** Ortak kabuk: siyah-beyaz, sade (e-posta istemcileri için satır içi stil). */
function kabuk(baslik: string, govde: string): string {
  return `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;color:#141414;line-height:1.5">
  <p style="font-size:20px;font-weight:800;margin:0 0 24px">LookBeds</p>
  <h1 style="font-size:22px;margin:0 0 16px">${baslik}</h1>
  ${govde}
  <p style="color:#6b6b6b;font-size:13px;margin-top:32px">Bu e-posta LookBeds rezervasyonun hakkında bilgi vermek için gönderildi.</p>
</div>`;
}

const tarih = (d: Date | string) =>
  new Date(d).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric", weekday: "long", timeZone: "UTC" });
const tutar = (n: number, para: string) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: para || "EUR" }).format(n);
const satir = (ad: string, deger: string) =>
  `<tr><td style="padding:6px 16px 6px 0;color:#6b6b6b;white-space:nowrap;vertical-align:top">${ad}</td><td style="padding:6px 0;font-weight:600">${deger}</td></tr>`;

export interface EpostaRezervasyonu {
  id: string;
  bookingNumber: string | null;
  hotelName: string | null;
  hotelCode: string;
  checkIn: Date;
  checkOut: Date;
  roomType: string | null;
  boardTypeName?: string | null;
  discountedPrice: number | null;
  totalPrice: number;
  currency: string;
  contactName: string | null;
  contactEmail: string | null;
  guests: unknown;
  cancellationPolicy: unknown;
}

function ucretsizIptal(politika: unknown): string | null {
  const p = Array.isArray(politika) ? (politika as CancellationPolicy[]) : [];
  const bedava = p.find((x) => x.penalty === 0);
  if (!bedava) return p.length ? "Bu rezervasyon iade edilemez." : null;
  return `${new Date(bedava.toDate).toLocaleString("tr-TR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" })} tarihine kadar ücretsiz iptal.`;
}

export function rezervasyonOnayEpostasi(r: EpostaRezervasyonu) {
  const otel = r.hotelName || r.hotelCode;
  const gece = Math.max(1, Math.round((new Date(r.checkOut).getTime() - new Date(r.checkIn).getTime()) / 864e5));
  const misafir = Array.isArray(r.guests) ? r.guests.length : 0;
  const odenen = tutar(r.discountedPrice ?? r.totalPrice, r.currency);
  const iptal = ucretsizIptal(r.cancellationPolicy);
  const link = SITE() ? `${SITE()}/reservations/${r.id}` : null;
  const html = kabuk(
    "Rezervasyonun onaylandı",
    `<p>Merhaba ${kacir(r.contactName ?? "")}, ${kacir(otel)} rezervasyonun onaylandı.</p>
  <table style="border-collapse:collapse;margin:16px 0">
    ${r.bookingNumber ? satir("Rezervasyon no", kacir(r.bookingNumber)) : ""}
    ${satir("Otel", kacir(otel))}
    ${satir("Giriş", kacir(tarih(r.checkIn)))}
    ${satir("Çıkış", kacir(tarih(r.checkOut)))}
    ${satir("Konaklama", `${gece} gece${misafir ? ` · ${misafir} misafir` : ""}`)}
    ${r.roomType ? satir("Oda", kacir(r.roomType)) : ""}
    ${r.boardTypeName ? satir("Pansiyon", kacir(r.boardTypeName)) : ""}
    ${satir("Tutar", kacir(odenen))}
  </table>
  ${iptal ? `<p>${kacir(iptal)}</p>` : ""}
  <p>Otelde rezervasyon numaranı söylemen yeterli.</p>
  ${link ? `<p><a href="${kacir(link)}" style="display:inline-block;background:#141414;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:600">Rezervasyonu görüntüle</a></p>` : ""}`
  );
  const text = [
    `Rezervasyonun onaylandı: ${otel}`,
    r.bookingNumber ? `Rezervasyon no: ${r.bookingNumber}` : "",
    `Giriş: ${tarih(r.checkIn)}`,
    `Çıkış: ${tarih(r.checkOut)} (${gece} gece)`,
    `Tutar: ${odenen}`,
    iptal ?? "",
    link ? `Rezervasyon: ${link}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  return { subject: `Rezervasyonun onaylandı · ${otel}`, html, text };
}

export function iptalEpostasi(r: EpostaRezervasyonu & { cancellationFee: number | null; cancellationFeeCurrency: string | null }) {
  const otel = r.hotelName || r.hotelCode;
  const ucret =
    r.cancellationFee && r.cancellationFee > 0
      ? `İptal ücreti: ${tutar(r.cancellationFee, r.cancellationFeeCurrency || r.currency)}.`
      : "İptal ücreti alınmadı.";
  const html = kabuk(
    "Rezervasyonun iptal edildi",
    `<p>Merhaba ${kacir(r.contactName ?? "")}, ${kacir(otel)} rezervasyonun iptal edildi.</p>
  <table style="border-collapse:collapse;margin:16px 0">
    ${r.bookingNumber ? satir("Rezervasyon no", kacir(r.bookingNumber)) : ""}
    ${satir("Otel", kacir(otel))}
    ${satir("Giriş", kacir(tarih(r.checkIn)))}
    ${satir("Çıkış", kacir(tarih(r.checkOut)))}
  </table>
  <p>${kacir(ucret)}</p>`
  );
  const text = [`Rezervasyonun iptal edildi: ${otel}`, r.bookingNumber ? `Rezervasyon no: ${r.bookingNumber}` : "", ucret].filter(Boolean).join("\n");
  return { subject: `Rezervasyonun iptal edildi · ${otel}`, html, text };
}
