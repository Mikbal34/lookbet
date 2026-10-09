"use client";

// Ortak pencere (Airbnb gibi): bulanık perde, ortada kart; mobilde alttan açılır.
// body'ye taşınır (portal): açan öğe sabit bir üst çubuğun içindeyse bile
// (ana sayfada dil/bölge) sayfadaki her şeyin üstünde açılsın.
// Üst üste açılabilir: Esc yalnız en üsttekini kapatır, sayfa kaydırması son
// katman kapanınca döner, odak da açan öğeye geri gider.

import * as React from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { Ikon } from "./ikon";
import s from "./pencere.module.css";

const yigin: symbol[] = [];

/** Katman davranışı (Esc, kaydırma kilidi, odak) — kendi düzenini kuran pencereler için. */
export function useKatman(acik: boolean, onKapat: () => void, odak: React.RefObject<HTMLElement | null>) {
  const kapat = React.useRef(onKapat);
  React.useEffect(() => {
    kapat.current = onKapat;
  });
  React.useEffect(() => {
    if (!acik) return;
    const ben = Symbol();
    const onceki = document.activeElement as HTMLElement | null;
    yigin.push(ben);
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => odak.current?.focus(), 60);
    const tus = (e: KeyboardEvent) => {
      if (e.key === "Escape" && yigin[yigin.length - 1] === ben) kapat.current();
    };
    document.addEventListener("keydown", tus);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", tus);
      yigin.splice(yigin.indexOf(ben), 1);
      if (!yigin.length) document.body.style.overflow = "";
      onceki?.focus?.({ preventScroll: true });
    };
  }, [acik, odak]);
}

const abonelikYok = () => () => {};

/**
 * İçeriği body'ye taşır (portal): sabit bir üst çubuğun ya da kendi katmanı
 * olan bir öğenin içinden açılan pencereler sayfadaki her şeyin üstünde
 * kalsın. Sunucuda document yok; yalnız tarayıcıda çizilir.
 */
export function Govdeye({ children }: { children: React.ReactNode }) {
  const istemci = React.useSyncExternalStore(abonelikYok, () => true, () => false);
  return istemci ? createPortal(children, document.body) : null;
}

export function Pencere({ acik, onKapat, baslik, children, genislik = 760, className }: {
  acik: boolean;
  onKapat: () => void;
  baslik: string;
  children: React.ReactNode;
  genislik?: number;
  className?: string;
}) {
  const tk = useTranslations("ortak");
  const kapat = React.useRef<HTMLButtonElement>(null);
  const kimlik = React.useId();
  useKatman(acik, onKapat, kapat);
  return (
    <Govdeye>
    <div className={`lb ${s.kap}`} data-acik={acik || undefined} onClick={(e) => e.target === e.currentTarget && onKapat()} aria-hidden={!acik}>
      <div
        className={`${s.pencere} ${className ?? ""}`}
        style={{ "--genislik": `${genislik}px` } as React.CSSProperties}
        role="dialog"
        aria-modal="true"
        aria-labelledby={kimlik}
      >
        <div className={s.ust}>
          <button ref={kapat} type="button" className={s.kapat} onClick={onKapat} aria-label={tk("kapat")} tabIndex={acik ? 0 : -1}>
            <Ikon ad="close" boyut={18} />
          </button>
          <h2 id={kimlik}>{baslik}</h2>
        </div>
        <div className={s.ic}>{acik && children}</div>
      </div>
    </div>
    </Govdeye>
  );
}
