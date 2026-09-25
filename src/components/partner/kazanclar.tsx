"use client";

// Partner · Kazançlar (Airbnb "Kazançlar" gibi): bu ayın komisyonu büyük,
// altında son 12 ayın çubuk grafiği, yanda bu ayın dökümü. Komisyon,
// anlaşmadaki orandan hesaplanan tahmindir; ödeme kaydı henüz yok.

import * as React from "react";
import { AYLAR } from "@/components/lb/arama/durum";
import { Nesne } from "@/components/lb/nesne";
import { para } from "@/components/otel-detay/yardimci";
import { Bos } from "./bugun";
import { useKazanc } from "./veri";
import s from "./partner.module.css";

const AYK = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
const G = 720, Y = 240, SOL = 52, ALT = 28;

/** Eksen için yuvarlak üst sınır: 1, 2, 2.5, 5 × 10ⁿ. */
function ustSinir(m: number) {
  if (m <= 0) return 100;
  const u = 10 ** Math.floor(Math.log10(m));
  return ([1, 2, 2.5, 5, 10].find((k) => k * u >= m) ?? 10) * u;
}

export function Kazanclar() {
  const q = useKazanc();
  const [ipucu, setIpucu] = React.useState<{ x: number; y: number; metin: string } | null>(null);
  const kap = React.useRef<HTMLDivElement>(null);

  if (q.isPending) return <div className={s.dis}><div className={s.iskeletTablo} aria-busy="true" /></div>;
  if (q.isError || !q.data) return <div className={s.dis}><Bos nesne="zil" baslik="Kazançlar şu an alınamadı" metin="Birazdan tekrar dene." /></div>;

  const { aylar, komisyonOrani, paraBirimi } = q.data;
  const bu = aylar[aylar.length - 1];
  const [yil, ay] = bu.ay.split("-").map(Number);
  const toplam = aylar.reduce((t, a) => t + a.komisyon, 0);
  const ust = ustSinir(Math.max(...aylar.map((a) => a.komisyon)));
  const cubuk = (G - SOL) / 12;
  const yuk = (v: number) => ((Y - ALT - 10) * v) / ust;

  return (
    <div className={s.dis}>
      <div className={s.kazancDuzen}>
        <div>
          <h1 className={s.kazancBaslik}>{AYLAR[ay - 1]} {yil} komisyonun (tahmini)</h1>
          <div className={s.buyuk}>
            <b className="lb-y">{para(bu.komisyon, paraBirimi)}</b>
            <span>son 12 ayda {para(toplam, paraBirimi)}</span>
          </div>
          <div className={s.grafik} ref={kap}>
            <svg viewBox={`0 0 ${G} ${Y}`} role="img" aria-label="Son 12 ayın komisyonu">
              {[0, ust / 2, ust].map((v) => (
                <g key={v}>
                  <line x1={SOL} x2={G} y1={Y - ALT - yuk(v)} y2={Y - ALT - yuk(v)} className={s.izgaraCizgi} />
                  <text x={SOL - 8} y={Y - ALT - yuk(v) + 4} textAnchor="end" className={s.eksen}>{para(v, paraBirimi)}</text>
                </g>
              ))}
              {aylar.map((a, i) => {
                const m = Number(a.ay.split("-")[1]);
                const x = SOL + i * cubuk;
                const h = Math.max(a.komisyon > 0 ? 2 : 0, yuk(a.komisyon));
                return (
                  <g
                    key={a.ay}
                    className={s.cubuk}
                    data-bu={i === aylar.length - 1 || undefined}
                    onMouseEnter={(e) => {
                      const k = kap.current?.getBoundingClientRect();
                      const r = (e.currentTarget.firstChild as SVGRectElement).getBoundingClientRect();
                      if (k) setIpucu({ x: r.left - k.left + r.width / 2, y: r.top - k.top, metin: `${AYLAR[m - 1]} · ${para(a.komisyon, paraBirimi)} · ${a.adet} rezervasyon` });
                    }}
                    onMouseLeave={() => setIpucu(null)}
                  >
                    <rect x={x + 8} y={Y - ALT - h} width={cubuk - 16} height={h} rx={6} />
                    <rect x={x} y={0} width={cubuk} height={Y - ALT} fill="transparent" />
                    <text x={x + cubuk / 2} y={Y - 8} textAnchor="middle" className={s.eksen}>{AYK[m - 1]}</text>
                  </g>
                );
              })}
            </svg>
            {ipucu && <span className={s.ipucu} style={{ left: ipucu.x, top: ipucu.y }}>{ipucu.metin}</span>}
          </div>
        </div>
        <aside className={s.yanKart}>
          <div className={s.yanUst}>
            <Nesne ad="havale" boyut={56} />
            <div>
              <b>{AYLAR[ay - 1]} dökümü</b>
              <span>Girişi bu ayda olan onaylı rezervasyonlar</span>
            </div>
          </div>
          <div className={s.dokum}>
            <div><span>Satış</span><span>{para(bu.satis, paraBirimi)}</span></div>
            <div><span>Rezervasyon</span><span>{bu.adet}</span></div>
            <div><span>Komisyon oranı</span><span>%{komisyonOrani}</span></div>
            <div className={s.toplam}><span>Komisyon</span><span>{para(bu.komisyon, paraBirimi)}</span></div>
          </div>
          <span className={s.not}>Tutarlar anlaşmadaki orandan hesaplanan tahmindir; iptal edilen rezervasyonlar sayılmaz. Ödemeler anlaşmana göre yapılır.</span>
        </aside>
      </div>
    </div>
  );
}
