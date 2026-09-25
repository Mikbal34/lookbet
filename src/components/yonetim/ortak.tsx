"use client";
/* eslint-disable @next/next/no-img-element -- otel görselleri dış kaynaklı (tedarikçi) */

// Yönetim paneli ortak parçaları: veri getirme, para ve tarih biçimleri,
// bildiri (toast), çubuk grafik, form alanları, rozetler.

import * as React from "react";
import { Ikon } from "@/components/lb/ikon";
import { AYLAR } from "@/components/lb/arama/durum";
import type { Rezervasyon } from "@/components/rezervasyonlar/ortak";
import s from "./yonetim.module.css";

export async function getir<T>(adres: string, secenek?: RequestInit): Promise<T> {
  const r = await fetch(adres, secenek);
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((d as { error?: string }).error ?? "İstek başarısız, tekrar dene");
  return d as T;
}
export const gonder = <T,>(adres: string, yontem: "POST" | "PATCH" | "DELETE", govde?: unknown) =>
  getir<T>(adres, { method: yontem, headers: { "Content-Type": "application/json" }, body: govde === undefined ? undefined : JSON.stringify(govde) });

/** €12.480 — ondalıksız; hesaplayıcıda kuruşlu. */
export const eur = (n: number, kurus = false) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "EUR", minimumFractionDigits: kurus ? 2 : 0, maximumFractionDigits: kurus ? 2 : 0 }).format(n);
export const sayi = (n: number) => n.toLocaleString("tr-TR");
export const AYK = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
const GUNLER = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
export const tarihKisa = (iso: string) => {
  const d = new Date(iso);
  return `${d.getDate()} ${AYK[d.getMonth()]}`;
};
export const tarihUzun = (iso: string) => {
  const d = new Date(iso);
  return `${d.getDate()} ${AYLAR[d.getMonth()]} ${d.getFullYear()}`;
};
export const bugunYazi = (d = new Date()) => `${GUNLER[d.getDay()]}, ${d.getDate()} ${AYLAR[d.getMonth()]}`;
export const saatYazi = (iso: string) => new Date(iso).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
/** "bugün 09:14", "dün 17:40", "3 gün önce" */
export function neZaman(iso: string, simdi: number) {
  const d = new Date(iso);
  const gun = Math.floor((new Date(simdi).setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / 864e5);
  if (gun <= 0) return `bugün ${saatYazi(iso)}`;
  if (gun === 1) return `dün ${saatYazi(iso)}`;
  if (gun < 7) return `${gun} gün önce`;
  return tarihUzun(iso);
}
export const simdiAl = () => Date.now();

/* ── Rezervasyon (yönetim listesi) ── */
export type YRez = Rezervasyon & {
  source: "CUSTOMER" | "AGENCY";
  appliedPriceRules?: { name: string; type: string; value: number; discountAmount: number }[] | null;
  user?: { id: string; name: string; email: string } | null;
  agency?: { id: string; companyName: string; commission?: number } | null;
};
export const satisFiyati = (r: { totalPrice: number; discountedPrice?: number | null }) => r.discountedPrice ?? r.totalPrice;
export const DURUM: Record<string, { ad: string; renk: "yesil" | "sari" | "gri" | "kirmizi" }> = {
  CONFIRMED: { ad: "Onaylandı", renk: "yesil" },
  PENDING: { ad: "Otel onayı bekleniyor", renk: "sari" },
  CANCELLED: { ad: "İptal edildi", renk: "gri" },
  FAILED: { ad: "Tedarikçide başarısız", renk: "kirmizi" },
};
export function DurumRozet({ durum }: { durum: string }) {
  const d = DURUM[durum] ?? { ad: durum, renk: "gri" as const };
  return <span className={s.rozet} data-renk={d.renk}>{d.ad}</span>;
}
export function Kaynak({ r }: { r: Pick<YRez, "agency" | "source"> }) {
  return r.agency ? (
    <span className={s.kaynak} data-acente title={r.agency.companyName}>{r.agency.companyName}</span>
  ) : (
    <span className={s.kaynak}>Müşteri</span>
  );
}
export function OtelFoto({ src }: { src?: string | null }) {
  const [hata, setHata] = React.useState(false);
  if (!src || hata) return <span className={s.fotoYok}><Ikon ad="hotel" boyut={18} /></span>;
  return <img src={src} alt="" loading="lazy" onError={() => setHata(true)} />;
}

/* ── Bildiri ── */
const BildiriBag = React.createContext<(m: string) => void>(() => {});
export const useBildiri = () => React.useContext(BildiriBag);
export function BildiriSaglayici({ children }: { children: React.ReactNode }) {
  const [m, setM] = React.useState<{ metin: string; no: number } | null>(null);
  React.useEffect(() => {
    if (!m) return;
    const t = setTimeout(() => setM(null), 2800);
    return () => clearTimeout(t);
  }, [m]);
  const goster = React.useCallback((metin: string) => setM((x) => ({ metin, no: (x?.no ?? 0) + 1 })), []);
  return (
    <BildiriBag.Provider value={goster}>
      {children}
      {m && <div key={m.no} className={s.bildiri} role="status">{m.metin}</div>}
    </BildiriBag.Provider>
  );
}

/* ── Çubuk grafik ── */
export interface Cubuk {
  etiket: string;
  ipucu: string;
  /** Üst üste dilimler (alttan üste). */
  dilimler: { deger: number; renk: string }[];
  vurgu?: boolean;
}
/** Eksen üst sınırı: 1-2-2,5-5 × 10^n'den en küçük uyan. */
function ustSinir(maks: number) {
  if (maks <= 0) return 1000;
  const us = 10 ** Math.floor(Math.log10(maks));
  for (const k of [1, 2, 2.5, 5, 10]) if (k * us >= maks) return k * us;
  return 10 * us;
}
const kisaEur = (v: number) => (v >= 1000 ? `€${sayi(Math.round(v / 100) / 10)}B` : `€${v}`);
export function CubukGrafik({ cubuklar, genislik = 680, yukseklik = 230, soluk = false, etiket }: {
  cubuklar: Cubuk[];
  genislik?: number;
  yukseklik?: number;
  /** Vurgusuz çubukları soldur (son ay öne çıksın). */
  soluk?: boolean;
  etiket: string;
}) {
  const [ip, setIp] = React.useState<{ x: number; y: number; metin: string } | null>(null);
  const SOL = 52, ALT = 28;
  const ust = ustSinir(Math.max(...cubuklar.map((c) => c.dilimler.reduce((a, d) => a + d.deger, 0))));
  const h = (v: number) => ((yukseklik - ALT - 12) * v) / ust;
  const bw = (genislik - SOL) / cubuklar.length;
  const pay = Math.min(14, bw * 0.22);
  return (
    <div className={s.grafik} onMouseLeave={() => setIp(null)}>
      <svg viewBox={`0 0 ${genislik} ${yukseklik}`} role="img" aria-label={etiket}>
        {[0, ust / 2, ust].map((v) => (
          <g key={v}>
            <line className={s.izgara} x1={SOL} x2={genislik} y1={yukseklik - ALT - h(v)} y2={yukseklik - ALT - h(v)} />
            <text className={s.eksen} x={SOL - 8} y={yukseklik - ALT - h(v) + 4} textAnchor="end">{kisaEur(v)}</text>
          </g>
        ))}
        {cubuklar.map((c, i) => {
          const x = SOL + i * bw + pay;
          const w = Math.max(4, bw - pay * 2);
          let alt = 0;
          return (
            <g
              key={i}
              className={s.bar}
              data-bu={c.vurgu || undefined}
              data-soluk={(soluk && !c.vurgu) || undefined}
              onMouseEnter={(e) => {
                const k = (e.currentTarget.ownerSVGElement?.parentElement as HTMLElement).getBoundingClientRect();
                const r = e.currentTarget.getBoundingClientRect();
                setIp({ x: r.left - k.left + r.width / 2, y: r.top - k.top, metin: c.ipucu });
              }}
            >
              <title>{c.ipucu}</title>
              {c.dilimler.map((d, j) => {
                const y = yukseklik - ALT - h(alt + d.deger);
                const yuk = Math.max(0, h(d.deger) - (j > 0 && d.deger > 0 ? 2 : 0));
                alt += d.deger;
                return <rect key={j} x={x} y={y} width={w} height={yuk} rx={5} fill={d.renk} />;
              })}
              <rect x={SOL + i * bw} y={0} width={bw} height={yukseklik - ALT} fill="transparent" />
              <text className={s.eksen} x={x + w / 2} y={yukseklik - 8} textAnchor="middle">{c.etiket}</text>
            </g>
          );
        })}
      </svg>
      {ip && <div className={s.ipucu} style={{ left: ip.x, top: ip.y }}>{ip.metin}</div>}
    </div>
  );
}

/* ── Form alanları ── */
export function Girdi({ id, etiket, onDegis, ...g }: { id: string; etiket: string; onDegis: (v: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "id" | "onChange">) {
  return (
    <div className={s.alan}>
      <label htmlFor={id}>{etiket}</label>
      <input id={id} onChange={(e) => onDegis(e.target.value)} {...g} />
    </div>
  );
}
export function Secim({ id, etiket, deger, onDegis, children }: { id: string; etiket: string; deger: string; onDegis: (v: string) => void; children: React.ReactNode }) {
  return (
    <div className={s.alan}>
      <label htmlFor={id}>{etiket}</label>
      <select id={id} value={deger} onChange={(e) => onDegis(e.target.value)}>{children}</select>
      <Ikon ad="chevron-down" boyut={16} className={s.secOk} />
    </div>
  );
}
export function Anahtar({ acik, onDegis, etiket, pasif }: { acik: boolean; onDegis: (v: boolean) => void; etiket: string; pasif?: boolean }) {
  return (
    <label className={s.anahtar}>
      <input type="checkbox" checked={acik} disabled={pasif} onChange={(e) => onDegis(e.target.checked)} aria-label={etiket} />
      <span />
    </label>
  );
}
export function HataYazi({ children }: { children: React.ReactNode }) {
  return <p className={s.hata} role="alert"><Ikon ad="warning" boyut={16} kalinlik={2.1} />{children}</p>;
}
