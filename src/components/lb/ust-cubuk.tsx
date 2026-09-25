"use client";

// İç sayfaların üst çubuğu (arama sonuçları, otel, ödeme…): logo · küçük arama
// hapı · dil ve menü. Hapa tıklayınca çubuk aşağı açılır, tam arama çubuğu
// gelir ve tıklanan alanın paneli açılır; sayfa kararır (Airbnb). Mobilde
// hap tam ekran aramayı açar. `alt` verilirse (ör. filtre şeridi) çubuğun
// altında, onunla birlikte yapışık durur.

import * as React from "react";
import Link from "next/link";
import { AramaCubugu, type AramaKontrol } from "./arama/arama-cubugu";
import { MobilArama } from "./arama/mobil-arama";
import { misafirMetni, tarihMetni, type AramaDegeri, type PanelAdi } from "./arama/durum";
import { Ikon } from "./ikon";
import { Nesne, type NesneAdi } from "./nesne";
import { DunyaDugmesi, MenuDugmesi } from "./ust-araclar";
import s from "./ust-cubuk.module.css";

export function UstCubuk({ deger, onDegis, onAra, nesne = "zil", alt, aramaYok }: {
  deger: AramaDegeri;
  onDegis: (d: AramaDegeri) => void;
  onAra: () => void;
  nesne?: NesneAdi;
  alt?: React.ReactNode;
  /** Ödeme gibi sayfalarda arama hapı gösterilmez. */
  aramaYok?: boolean;
}) {
  const [acik, setAcik] = React.useState(false);
  const [mobilAcik, setMobilAcik] = React.useState(false);
  const kok = React.useRef<HTMLDivElement | null>(null);
  const buyuk = React.useRef<HTMLDivElement | null>(null);
  const kontrol = React.useRef<AramaKontrol>(null);

  const ac = (alan?: PanelAdi) => {
    if (matchMedia("(max-width: 720px)").matches) return setMobilAcik(true);
    setAcik(true);
    setTimeout(() => kontrol.current?.panelAc(alan ?? "yer"), matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 220);
  };
  const kapat = React.useCallback(() => {
    kontrol.current?.panelKapat();
    setAcik(false);
  }, []);
  React.useEffect(() => {
    if (!acik) return;
    const tus = (e: KeyboardEvent) => e.key === "Escape" && kapat();
    const kaydir = () => kapat();
    document.addEventListener("keydown", tus);
    addEventListener("scroll", kaydir, { passive: true, once: true });
    return () => {
      document.removeEventListener("keydown", tus);
      removeEventListener("scroll", kaydir);
    };
  }, [acik, kapat]);

  const tarih = tarihMetni(deger);
  const ara = () => {
    setAcik(false);
    setMobilAcik(false);
    onAra();
  };

  return (
    <>
      <header className={`lb ${s.ust}`} data-acik={acik || undefined}>
        <div className={s.satir}>
          <Link href="/" className={`lb-y ${s.logo}`}>LookBeds</Link>
          {!aramaYok && (
            <button
              type="button"
              className={s.hap}
              aria-label="Aramayı değiştir"
              aria-expanded={acik}
              onClick={(e) => ac((e.target as HTMLElement).closest<HTMLElement>("[data-alan]")?.dataset.alan as PanelAdi | undefined)}
            >
              <Nesne ad={nesne} boyut={30} />
              <span data-alan="yer">{deger.yer || "Nereye gidiyorsun?"}</span>
              <span data-alan="tarih" className={s.soluk}>{tarih ?? "Tarih ekle"}</span>
              <span data-alan="misafir" className={s.soluk}>{misafirMetni(deger)}</span>
              <i><Ikon ad="search" boyut={16} kalinlik={2.6} /></i>
            </button>
          )}
          <div className={s.sag}>
            <DunyaDugmesi className={s.dunya} />
            <MenuDugmesi />
          </div>
        </div>
        {!aramaYok && (
          <div className={s.genis} aria-hidden={!acik}>
            <div className={s.genisIc}>
              <AramaCubugu
                akis
                deger={deger}
                onDegis={onDegis}
                onAra={ara}
                kokRef={kok}
                buyukRef={buyuk}
                kontrol={kontrol}
                nesne={nesne}
                onKucuk={() => {}}
                onTek={() => setMobilAcik(true)}
              />
            </div>
          </div>
        )}
        {alt}
      </header>
      <div className={s.perde} data-acik={acik || undefined} onClick={kapat} />
      {!aramaYok && (
        <MobilArama acik={mobilAcik} deger={deger} onDegis={onDegis} onAra={ara} onKapat={() => setMobilAcik(false)} />
      )}
    </>
  );
}
