"use client";
/* eslint-disable @next/next/no-img-element -- hareketli SVG'ler (CSS animasyonu img içinde de çalışır) */

// Bekleme animasyonları: zil (genel), takvim (oda ve fiyat), anahtar kartı
// (rezervasyon onayı; bitince ışık yeşile döner) Arrow'da hareketlendirilmiş
// nesneler (public/yukleme); bavul (otel araması) nesnenin kendisi bütün
// halinde sallanır, rüzgâr ve yol çizgiyle. Hareketi azaltan cihazlarda
// durağan kalır (SVG'lerin içinde ve aşağıdaki CSS'te).

import * as React from "react";
import { useTranslations } from "next-intl";
import s from "./bekleme.module.css";

// Varsayılan ekran okuyucu metinleri: ust.bekleme.<tür>.
export type BeklemeTuru = "zil" | "bavul" | "takvim" | "kart";

export function Bekleme({ tur = "zil", boyut = 120, bitti = false, etiket, className }: {
  tur?: BeklemeTuru;
  boyut?: number;
  /** Yalnız kart: işlem bitti, ışık yeşil. */
  bitti?: boolean;
  /** Ekran okuyucu metni; görünür bir metin varsa boş bırak (aria-hidden olur). */
  etiket?: string | null;
  className?: string;
}) {
  const t = useTranslations("ust.bekleme");
  const aria = etiket === null ? { "aria-hidden": true as const } : { role: "img", "aria-label": etiket ?? t(tur) };
  const stil = { width: boyut, height: boyut } as React.CSSProperties;
  if (tur === "bavul") {
    return (
      <span className={`${s.kutu} ${className ?? ""}`} style={stil} {...aria}>
        <svg className={s.bavul} viewBox="0 0 140 140">
          <line x1="8" y1="122" x2="132" y2="122" className={s.yol} />
          <g className={s.ruzgar}>
            <line x1="6" y1="62" x2="22" y2="62" />
            <line x1="2" y1="78" x2="16" y2="78" />
            <line x1="8" y1="94" x2="20" y2="94" />
          </g>
          <g className={s.bavulGovde}>
            <image href="/nesne/bavul.svg" x="24" y="18" width="100" height="100" />
          </g>
        </svg>
      </span>
    );
  }
  return (
    <span className={`${s.kutu} ${className ?? ""}`} style={stil} data-bitti={bitti || undefined} {...aria}>
      <img className={s.hareket} src={`/yukleme/${tur}.svg`} alt="" draggable={false} />
      {tur === "kart" && <img className={s.onay} src="/yukleme/kart-onay.svg" alt="" draggable={false} />}
    </span>
  );
}

/** Uzun beklemede sırayla değişen kısa yazılar (ör. "Fiyatlar karşılaştırılıyor"). */
export function DonenMetin({ metinler, aralik = 2500, className }: { metinler: string[]; aralik?: number; className?: string }) {
  const [i, setI] = React.useState(0);
  React.useEffect(() => {
    if (metinler.length < 2) return;
    const t = setInterval(() => setI((x) => Math.min(x + 1, metinler.length - 1)), aralik);
    return () => clearInterval(t);
  }, [metinler.length, aralik]);
  return (
    <span className={`${s.donen} ${className ?? ""}`} aria-live="polite">
      <span key={i}>{metinler[i]}</span>
    </span>
  );
}
