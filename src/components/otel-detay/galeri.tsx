"use client";
/* eslint-disable @next/next/no-img-element -- otel ve oda görselleri dış kaynaklı (tedarikçi) */

// Otel fotoğrafları: masaüstünde 1 büyük + 4 küçük ızgara, mobilde kaydırmalı
// şerit. Tıklayınca fotoğraf turu (Genel bakış + oda bölümleri) açılır; turdaki
// fotoğrafa basınca ışık kutusu.

import { fotoBoyutu, kartFotosu } from "@/lib/foto";
import * as React from "react";
import { Ikon } from "@/components/lb/ikon";
import { useKatman } from "@/components/lb/pencere";
import s from "./galeri.module.css";

export interface TurBolumu {
  ad: string;
  gorseller: string[];
}

export function Galeri({ gorseller, onAc, ustDugmeler }: {
  gorseller: string[];
  onAc: () => void;
  /** Mobil şeridin üstündeki düğmeler (geri, paylaş, kaydet). */
  ustDugmeler: React.ReactNode;
}) {
  const [sira, setSira] = React.useState(1);
  const mobil = gorseller.slice(0, 12);
  if (!gorseller.length) {
    return (
      <div className={s.bos}>
        <Ikon ad="image-off" boyut={28} />
        Bu otelin fotoğrafı henüz yok
        <div className={s.mgDugmeler}>{ustDugmeler}</div>
      </div>
    );
  }
  return (
    <>
      <section className={s.izgara} data-adet={Math.min(5, gorseller.length)} id="fotograflar" aria-label="Fotoğraflar">
        {gorseller.slice(0, 5).map((u, i) => (
          <button key={u} type="button" onClick={onAc} aria-label={`Fotoğraf ${i + 1}`}>
            <img src={u} alt="" loading={i ? "lazy" : "eager"} />
          </button>
        ))}
        <button type="button" className={s.tumu} onClick={onAc}>
          <Ikon ad="photos" boyut={18} />
          Tüm fotoğrafları göster
        </button>
      </section>
      <div className={s.mobil}>
        <div
          className={s.serit}
          onScroll={(e) => setSira(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth) + 1)}
        >
          {mobil.map((u, i) => (
            <img key={u} src={u} alt="" loading={i ? "lazy" : "eager"} onClick={onAc} />
          ))}
        </div>
        <div className={s.mgDugmeler}>{ustDugmeler}</div>
        <span className={s.sayac}>{sira} / {mobil.length}</span>
      </div>
    </>
  );
}

export function FotoTuru({ acik, onKapat, bolumler, onFoto, ustSag }: {
  acik: boolean;
  onKapat: () => void;
  bolumler: TurBolumu[];
  onFoto: (b: number, j: number) => void;
  ustSag?: React.ReactNode;
}) {
  const kap = React.useRef<HTMLDivElement>(null);
  const geri = React.useRef<HTMLButtonElement>(null);
  useKatman(acik, onKapat, geri);
  React.useEffect(() => {
    if (acik && kap.current) kap.current.scrollTop = 0;
  }, [acik]);
  const bolumeGit = (i: number) => {
    const b = kap.current?.querySelector<HTMLElement>(`[data-bolum="${i}"]`);
    if (b && kap.current) kap.current.scrollTo({ top: b.offsetTop - 70, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };
  return (
    <div ref={kap} className={s.tur} data-acik={acik || undefined} role="dialog" aria-modal="true" aria-label="Fotoğraf turu" aria-hidden={!acik}>
      <div className={s.turUst}>
        <button ref={geri} type="button" className={s.yuvarlak} onClick={onKapat} aria-label="Geri" tabIndex={acik ? 0 : -1}>
          <Ikon ad="back" boyut={18} />
        </button>
        {ustSag}
      </div>
      {acik && (
        <div className={s.turIc}>
          <h2 className="lb-y">Otel turu</h2>
          <div className={s.turKucuk}>
            {bolumler.map((b, i) => (
              <button key={b.ad} type="button" onClick={() => bolumeGit(i)}>
                <img src={fotoBoyutu(b.gorseller[0], "400x300")} alt="" loading="lazy" />
                {b.ad}
              </button>
            ))}
          </div>
          {bolumler.map((b, i) => (
            <section key={b.ad} className={s.turBolum} data-bolum={i}>
              <h3 className="lb-y">{b.ad}</h3>
              <div className={s.turFoto}>
                {b.gorseller.map((u, j) => (
                  <button key={u} type="button" onClick={() => onFoto(i, j)} aria-label={`${b.ad}, fotoğraf ${j + 1}`}>
                    <img {...kartFotosu(u, "(max-width: 720px) 100vw, 45vw")} alt="" loading="lazy" />
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

export function IsikKutusu({ konum, bolumler, onKapat, onDegis }: {
  konum: { b: number; j: number } | null;
  bolumler: TurBolumu[];
  onKapat: () => void;
  onDegis: (j: number) => void;
}) {
  const kapat = React.useRef<HTMLButtonElement>(null);
  const dx = React.useRef<number | null>(null);
  useKatman(!!konum, onKapat, kapat);
  const bolum = konum ? bolumler[konum.b] : null;
  const n = bolum?.gorseller.length ?? 0;
  const git = React.useCallback((d: number) => konum && onDegis((konum.j + d + n) % n), [konum, n, onDegis]);
  React.useEffect(() => {
    if (!konum) return;
    const tus = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") git(1);
      if (e.key === "ArrowLeft") git(-1);
    };
    document.addEventListener("keydown", tus);
    return () => document.removeEventListener("keydown", tus);
  }, [konum, git]);

  return (
    <div
      className={s.isik}
      data-acik={konum ? true : undefined}
      role="dialog"
      aria-modal="true"
      aria-label="Fotoğraf"
      aria-hidden={!konum}
      onTouchStart={(e) => (dx.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (dx.current === null) return;
        const f = e.changedTouches[0].clientX - dx.current;
        if (Math.abs(f) > 40) git(f < 0 ? 1 : -1);
        dx.current = null;
      }}
    >
      <div className={s.isikUst}>
        <button ref={kapat} type="button" className={s.yuvarlak} onClick={onKapat} aria-label="Kapat" tabIndex={konum ? 0 : -1}>
          <Ikon ad="close" boyut={18} />
        </button>
        <span>{bolum && konum ? `${bolum.ad} · ${konum.j + 1} / ${n}` : ""}</span>
        <span className={s.bosluk} />
      </div>
      <div className={s.isikIc}>
        {n > 1 && (
          <button type="button" className={`${s.ok} ${s.okGeri}`} onClick={() => git(-1)} aria-label="Önceki">
            <Ikon ad="chevron-left" boyut={20} />
          </button>
        )}
        {bolum && konum && <img key={`${konum.b}-${konum.j}`} src={bolum.gorseller[konum.j]} alt="" />}
        {n > 1 && (
          <button type="button" className={`${s.ok} ${s.okIleri}`} onClick={() => git(1)} aria-label="Sonraki">
            <Ikon ad="chevron-right" boyut={20} />
          </button>
        )}
      </div>
    </div>
  );
}
