"use client";

// Filtreler penceresi (Airbnb gibi): taslak üzerinde çalışır, alttaki düğme
// canlı sonuç sayısını gösterir ve "göster" ile uygulanır.

import { useFiyat } from "@/components/lb/fiyat";
import * as React from "react";
import { useTranslations } from "next-intl";
import { Govdeye } from "@/components/lb/pencere";
import { Ikon } from "@/components/lb/ikon";
import { Nesne, type NesneAdi } from "@/components/lb/nesne";
import { NATIONALITIES } from "@/lib/constants/nationalities";
import type { HotelSearchResult } from "@/lib/royal-api/types";
import { BOS_FILTRE, uyar, type Filtre } from "./filtre";
import s from "./filtre-penceresi.module.css";

// Adları arama.filtre.secenek.<k>.
const ONERILER: { k: "iptal" | "kahvalti" | "hepsiDahil" | "yildiz4"; nesne: NesneAdi }[] = [
  { k: "iptal", nesne: "iptal" },
  { k: "kahvalti", nesne: "kahvalti" },
  { k: "hepsiDahil", nesne: "hersey-dahil" },
  { k: "yildiz4", nesne: "zil" },
];
const KUTU = 16;

/** Uyruk kodunun görünen adı: arama.filtre.ulke.<kod> ("TR" → "tr"). */
const ulkeAnahtari = (kod: (typeof NATIONALITIES)[number]["code"]) =>
  `filtre.ulke.${kod.toLowerCase() as Lowercase<typeof kod>}` as const;

export function FiltrePenceresi({ acik, filtre, oteller, pansiyonlar, uyruk, paraBirimi, onUygula, onKapat }: {
  acik: boolean;
  filtre: Filtre;
  oteller: HotelSearchResult[];
  pansiyonlar: string[];
  uyruk: string;
  paraBirimi: string;
  onUygula: (f: Filtre, uyruk: string) => void;
  onKapat: () => void;
}) {
  // Fiyat etiketleri seçilen para biriminde (filtre değerleri EUR kalır).
  const { yaz } = useFiyat();
  // `t` burada taslak filtre; metinler `ceviri` ile.
  const ceviri = useTranslations("arama");
  const tk = useTranslations("ortak");
  const [t, setT] = React.useState(filtre);
  const [u, setU] = React.useState(uyruk);
  const kapatDugme = React.useRef<HTMLButtonElement>(null);

  // Her açılışta taslak güncel filtreden başlasın.
  React.useEffect(() => {
    if (!acik) return;
    setT(filtre);
    setU(uyruk);
    const onceki = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    const zaman = setTimeout(() => kapatDugme.current?.focus(), 50);
    const tus = (e: KeyboardEvent) => e.key === "Escape" && onKapat();
    document.addEventListener("keydown", tus);
    return () => {
      document.body.style.overflow = "";
      clearTimeout(zaman);
      document.removeEventListener("keydown", tus);
      onceki?.focus();
    };
  }, [acik]); // eslint-disable-line react-hooks/exhaustive-deps

  const fiyatlar = oteller.map((h) => h.minPrice).filter((p) => p > 0);
  const enAz = fiyatlar.length ? Math.floor(Math.min(...fiyatlar)) : 0;
  // Üst sınır %95'lik dilim: tek bir çok pahalı otel histogramı sola yığmasın.
  // Sürgü en sağdayken sınır yok (max = null), o oteller de dahil ("+").
  const sirali = [...fiyatlar].sort((x, y) => x - y);
  const enCok = sirali.length ? Math.ceil(sirali[Math.min(sirali.length - 1, Math.floor(sirali.length * 0.95))]) : 0;
  const adim = Math.max(1, Math.round((enCok - enAz) / 100));
  const kutular = Array<number>(KUTU).fill(0);
  fiyatlar.forEach((p) => {
    kutular[Math.min(KUTU - 1, Math.floor(((Math.min(p, enCok) - enAz) / (enCok - enAz + 1)) * KUTU))]++;
  });
  const enYuksek = Math.max(1, ...kutular);
  const tMin = t.min ?? enAz, tMax = t.max ?? enCok;
  const oran = (v: number) => (enCok > enAz ? (v - enAz) / (enCok - enAz) : 0);
  const sayi = oteller.filter((h) => uyar(h, t)).length;
  const para = (n: number) => yaz(n, paraBirimi);

  const degis = (p: Partial<Filtre>) => setT((x) => ({ ...x, ...p }));

  return (
    <Govdeye>
    <div className={`lb ${s.kap}`} data-acik={acik || undefined} onClick={(e) => e.target === e.currentTarget && onKapat()} aria-hidden={!acik}>
      <div className={s.pencere} role="dialog" aria-modal="true" aria-labelledby="filtre-baslik">
        <div className={s.ust}>
          <button ref={kapatDugme} type="button" className={s.kapat} onClick={onKapat} aria-label={tk("kapat")}>
            <Ikon ad="close" boyut={18} />
          </button>
          <h2 id="filtre-baslik">{ceviri("filtre.filtreler")}</h2>
        </div>
        <div className={s.ic}>
          <section>
            <h3>{ceviri("filtre.oneriler")}</h3>
            <div className={s.oneri}>
              {ONERILER.map((o) => (
                <button key={o.k} type="button" aria-pressed={t[o.k]} onClick={() => degis({ [o.k]: !t[o.k] })}>
                  <Nesne ad={o.nesne} boyut={56} />
                  {ceviri(`filtre.secenek.${o.k}`)}
                </button>
              ))}
            </div>
          </section>

          {enCok > enAz && (
            <section>
              <h3>{ceviri("filtre.fiyatAraligi")}</h3>
              <p className={s.alt}>{ceviri("filtre.fiyatNotu")}</p>
              <div className={s.histo} aria-hidden="true">
                {kutular.map((n, i) => {
                  const orta = enAz + ((i + 0.5) * (enCok - enAz)) / KUTU;
                  return <i key={i} data-ic={orta >= tMin && orta <= tMax || undefined} style={{ height: `${8 + (n / enYuksek) * 92}%` }} />;
                })}
              </div>
              <div className={s.aralik}>
                <span className={s.ray} />
                <span className={s.dolu} style={{ left: `calc(14px + ${oran(tMin)} * (100% - 28px))`, width: `calc(${oran(tMax) - oran(tMin)} * (100% - 28px))` }} />
                <input type="range" min={enAz} max={enCok} step={adim} value={tMin} aria-label={ceviri("filtre.enDusukEtiket")}
                  onChange={(e) => { const v = Math.min(+e.target.value, tMax - adim); degis({ min: v <= enAz ? null : v }); }} />
                <input type="range" min={enAz} max={enCok} step={adim} value={tMax} aria-label={ceviri("filtre.enYuksekEtiket")}
                  onChange={(e) => { const v = Math.max(+e.target.value, tMin + adim); degis({ max: v >= enCok ? null : v }); }} />
              </div>
              <div className={s.uclar}>
                <div>{ceviri("filtre.enDusuk")}<output>{para(tMin)}</output></div>
                <div>{ceviri("filtre.enYuksek")}<output>{para(tMax)}{t.max === null ? "+" : ""}</output></div>
              </div>
            </section>
          )}

          {pansiyonlar.length > 0 && (
            <section>
              <h3>{ceviri("filtre.pansiyon")}</h3>
              <div className={s.cipler}>
                {pansiyonlar.map((p) => (
                  <button key={p} type="button" className={s.cip} aria-pressed={t.pansiyon.includes(p)}
                    onClick={() => degis({ pansiyon: t.pansiyon.includes(p) ? t.pansiyon.filter((x) => x !== p) : [...t.pansiyon, p] })}>
                    {p}
                  </button>
                ))}
              </div>
            </section>
          )}

          <section>
            <h3>{ceviri("filtre.yildiz")}</h3>
            <div className={s.parca}>
              {([0, 3, 4, 5] as const).map((y) => (
                <button key={y} type="button" aria-pressed={t.yildiz === y} onClick={() => degis({ yildiz: y })}>
                  {y === 0 ? ceviri("filtre.tumu") : y === 5 ? "5" : `${y}+`}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3>{ceviri("filtre.uyruk")}</h3>
            <p className={s.alt}>{ceviri("filtre.uyrukNotu")}</p>
            <select className={s.secim} value={u} onChange={(e) => setU(e.target.value)} aria-label={ceviri("filtre.uyruk")}>
              {NATIONALITIES.map((n) => <option key={n.code} value={n.code}>{ceviri(ulkeAnahtari(n.code))}</option>)}
            </select>
          </section>
        </div>
        <div className={s.altCubuk}>
          <button type="button" className={s.metin} onClick={() => { setT(BOS_FILTRE); setU(uyruk); }}>{ceviri("tumunuTemizle")}</button>
          <button type="button" className={s.siyah} onClick={() => onUygula(t, u)}>
            {u !== uyruk ? ceviri("filtre.yenidenAra") : ceviri("filtre.goster", { sayi })}
          </button>
        </div>
      </div>
    </div>
    </Govdeye>
  );
}
