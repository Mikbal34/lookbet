// E-posta gönderimi (Resend) ve rezervasyon e-postaları. RESEND_API_KEY
// yoksa (lokal geliştirme) gönderilmez, yalnız loga kim/konu yazılır.
// Gönderim hatası akışı bozmaz: çağıranlar .catch ile loglar.

import { getLocale, getTranslations } from "next-intl/server";
import type { CancellationPolicy } from "@/lib/royal-api/types";
import { bicimleyici } from "@/i18n/bicim";

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
function kabuk(baslik: string, govde: string, altNot: string): string {
  return `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;color:#141414;line-height:1.5">
  <p style="font-size:20px;font-weight:800;margin:0 0 24px">LookBeds</p>
  <h1 style="font-size:22px;margin:0 0 16px">${kacir(baslik)}</h1>
  ${govde}
  <p style="color:#6b6b6b;font-size:13px;margin-top:32px">${kacir(altNot)}</p>
</div>`;
}

/** E-postalar isteği yapanın dilinde (i18n: çerez ya da tarayıcı dili). */
async function dilAraclari() {
  const t = await getTranslations("api.eposta");
  const dil = await getLocale();
  const b = bicimleyici(dil);
  // Konaklama tarihleri DATE (UTC gece yarısı): UTC'ye göre yaz.
  const tarih = (d: Date | string) =>
    new Date(d).toLocaleDateString(b.yerel, { day: "numeric", month: "long", year: "numeric", weekday: "long", timeZone: "UTC" });
  const tutar = (n: number, para: string) => b.para(n, para || "EUR", true);
  return { t, b, tarih, tutar };
}
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

export async function rezervasyonOnayEpostasi(r: EpostaRezervasyonu) {
  const { t, b, tarih, tutar } = await dilAraclari();
  const otel = r.hotelName || r.hotelCode;
  const gece = Math.max(1, Math.round((new Date(r.checkOut).getTime() - new Date(r.checkIn).getTime()) / 864e5));
  const misafir = Array.isArray(r.guests) ? r.guests.length : 0;
  const odenen = tutar(r.discountedPrice ?? r.totalPrice, r.currency);
  // İptal: ücretsiz son an (İstanbul saatiyle) ya da iade edilemez.
  const p = Array.isArray(r.cancellationPolicy) ? (r.cancellationPolicy as CancellationPolicy[]) : [];
  const bedava = p.find((x) => x.penalty === 0);
  const iptal = bedava
    ? t("ucretsizIptal", {
        tarih: new Date(bedava.toDate).toLocaleString(b.yerel, { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" }),
      })
    : p.length
      ? t("iadeYok")
      : null;
  const link = SITE() ? `${SITE()}/reservations/${r.id}` : null;
  const konaklama = misafir ? t("geceMisafir", { gece, misafir }) : t("gece", { gece });
  const html = kabuk(
    t("onayBaslik"),
    `<p>${kacir(t("onayGiris", { ad: r.contactName ?? "", otel }))}</p>
  <table style="border-collapse:collapse;margin:16px 0">
    ${r.bookingNumber ? satir(kacir(t("rezervasyonNo")), kacir(r.bookingNumber)) : ""}
    ${satir(kacir(t("otel")), kacir(otel))}
    ${satir(kacir(t("giris")), kacir(tarih(r.checkIn)))}
    ${satir(kacir(t("cikis")), kacir(tarih(r.checkOut)))}
    ${satir(kacir(t("konaklama")), kacir(konaklama))}
    ${r.roomType ? satir(kacir(t("oda")), kacir(r.roomType)) : ""}
    ${r.boardTypeName ? satir(kacir(t("pansiyon")), kacir(r.boardTypeName)) : ""}
    ${satir(kacir(t("tutar")), kacir(odenen))}
  </table>
  ${iptal ? `<p>${kacir(iptal)}</p>` : ""}
  <p>${kacir(t("otelde"))}</p>
  ${link ? `<p><a href="${kacir(link)}" style="display:inline-block;background:#141414;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:600">${kacir(t("goruntule"))}</a></p>` : ""}`,
    t("altNot")
  );
  const text = [
    `${t("onayBaslik")}: ${otel}`,
    r.bookingNumber ? `${t("rezervasyonNo")}: ${r.bookingNumber}` : "",
    `${t("giris")}: ${tarih(r.checkIn)}`,
    `${t("cikis")}: ${tarih(r.checkOut)} (${t("gece", { gece })})`,
    `${t("tutar")}: ${odenen}`,
    iptal ?? "",
    link ? `${t("goruntule")}: ${link}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  return { subject: t("onayKonu", { otel }), html, text };
}

export async function iptalEpostasi(r: EpostaRezervasyonu & { cancellationFee: number | null; cancellationFeeCurrency: string | null }) {
  const { t, tarih, tutar } = await dilAraclari();
  const otel = r.hotelName || r.hotelCode;
  const ucret =
    r.cancellationFee && r.cancellationFee > 0
      ? t("iptalUcreti", { tutar: tutar(r.cancellationFee, r.cancellationFeeCurrency || r.currency) })
      : t("ucretYok");
  const html = kabuk(
    t("iptalBaslik"),
    `<p>${kacir(t("iptalGiris", { ad: r.contactName ?? "", otel }))}</p>
  <table style="border-collapse:collapse;margin:16px 0">
    ${r.bookingNumber ? satir(kacir(t("rezervasyonNo")), kacir(r.bookingNumber)) : ""}
    ${satir(kacir(t("otel")), kacir(otel))}
    ${satir(kacir(t("giris")), kacir(tarih(r.checkIn)))}
    ${satir(kacir(t("cikis")), kacir(tarih(r.checkOut)))}
  </table>
  <p>${kacir(ucret)}</p>`,
    t("altNot")
  );
  const text = [`${t("iptalBaslik")}: ${otel}`, r.bookingNumber ? `${t("rezervasyonNo")}: ${r.bookingNumber}` : "", ucret].filter(Boolean).join("\n");
  return { subject: t("iptalKonu", { otel }), html, text };
}

/** Acente başvurusunun sonucu (onay ya da ret). Acente paneli Türkçe: e-posta da. */
export async function acenteSonucEpostasi(p: { onay: boolean; ad: string; sirket: string; sebep?: string | null }) {
  const t = await getTranslations({ locale: "tr", namespace: "api.eposta" });
  const link = SITE() ? `${SITE()}/agency/dashboard` : null;
  const baslik = p.onay ? t("acenteOnayBaslik") : t("acenteRetBaslik");
  const satirlar = p.onay
    ? [t("acenteOnayMetin", { ad: p.ad, sirket: p.sirket })]
    : [t("acenteRetMetin", { ad: p.ad, sirket: p.sirket }), ...(p.sebep ? [t("acenteRetSebep", { sebep: p.sebep })] : []), t("acenteRetYeniden")];
  const dugme = p.onay ? t("panelAc") : t("panelGit");
  const html = kabuk(
    baslik,
    `${satirlar.map((x) => `<p>${kacir(x)}</p>`).join("\n  ")}
  ${link ? `<p><a href="${kacir(link)}" style="display:inline-block;background:#141414;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:600">${kacir(dugme)}</a></p>` : ""}`,
    t("acenteAltNot")
  );
  const text = [baslik, ...satirlar, link ? `${dugme}: ${link}` : ""].filter(Boolean).join("\n");
  return { subject: p.onay ? t("acenteOnayKonu", { sirket: p.sirket }) : t("acenteRetKonu", { sirket: p.sirket }), html, text };
}
