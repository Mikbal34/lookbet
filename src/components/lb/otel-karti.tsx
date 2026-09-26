"use client";

// Otel kartı (arama sonuçları): kare fotoğraf, kalp, ücretsiz iptal etiketi,
// yer ve yıldız, pansiyon, konaklamanın toplam fiyatı; otomatik indirim
// varsa turuncu etiket ve üstü çizili önceki fiyat. Fotoğrafı açılmayan
// otelde resepsiyon zilli boş durum. Her otel kendi sekmesinde açılır (Airbnb).

import { kartFotosu } from "@/lib/foto";
import * as React from "react";
import { Ikon } from "./ikon";
import { Nesne } from "./nesne";
import s from "./otel-karti.module.css";

export interface OtelKartiVerisi {
  kod: string;
  ad: string;
  foto?: string | null;
  yildiz?: number;
  yer?: string | null;
  pansiyon?: string | null;
  iptal?: boolean;
  /** Biçimlenmiş toplam fiyat ("€116") ve açıklaması ("2 gece"); indirim varsa önceki (üstü çizili). */
  fiyat?: { tutar: string; aciklama: string; onceki?: string | null } | null;
  /** Otomatik indirim etiketi ("%15 erken rezervasyon"). */
  indirim?: string | null;
}

export function OtelKarti({ otel, href, favori, onFavori, onUzerinde, sira = 0 }: {
  otel: OtelKartiVerisi;
  href: string;
  favori: boolean;
  onFavori: () => void;
  onUzerinde?: (girdi: boolean) => void;
  sira?: number;
}) {
  const [fotoYok, setFotoYok] = React.useState(!otel.foto);
  return (
    <li
      className={s.kart}
      style={{ "--s": Math.min(sira, 12) } as React.CSSProperties}
      onMouseEnter={() => onUzerinde?.(true)}
      onMouseLeave={() => onUzerinde?.(false)}
    >
      <a className={s.bag} href={href} target={`otel_${otel.kod}`}>
        <div className={s.foto}>
          {fotoYok ? (
            <span className={s.fotoYok}>
              <Nesne ad="zil" boyut={60} />
              Fotoğraf yok
            </span>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- dış kaynaklı otel görseli
            <img {...kartFotosu(otel.foto!)} alt="" loading="lazy" onError={() => setFotoYok(true)} />
          )}
          {(otel.indirim || otel.iptal) && (
            <span className={s.etiketler}>
              {otel.indirim && (
                <span className={`${s.etiket} ${s.indirim}`}>
                  <Ikon ad="discount" boyut={14} kalinlik={2.2} />
                  {otel.indirim}
                </span>
              )}
              {otel.iptal && (
                <span className={s.etiket}>
                  <Ikon ad="check" boyut={14} kalinlik={2.4} />
                  Ücretsiz iptal
                </span>
              )}
            </span>
          )}
        </div>
        <div className={s.satir1}>
          <span>{otel.yer ? `Otel · ${otel.yer}` : "Otel"}</span>
          {!!otel.yildiz && (
            <span className={s.yildiz}>
              <Ikon ad="star" boyut={13} kalinlik={1.5} />
              {otel.yildiz}
            </span>
          )}
        </div>
        <p>{otel.ad}</p>
        {otel.pansiyon && <p>{otel.pansiyon}</p>}
        {otel.fiyat && (
          <p className={s.fiyat}>
            {otel.fiyat.onceki && <><s>{otel.fiyat.onceki}</s>{" "}</>}
            <b className="lb-y">{otel.fiyat.tutar}</b> <span>{otel.fiyat.aciklama}</span>
          </p>
        )}
      </a>
      <button
        type="button"
        className={s.kalp}
        aria-pressed={favori}
        aria-label={`${otel.ad}: ${favori ? "favorilerden çıkar" : "favorilere ekle"}`}
        onClick={onFavori}
      >
        <Ikon ad="heart" boyut={26} kalinlik={1.8} />
      </button>
    </li>
  );
}

export function OtelKartiIskelet() {
  return (
    <li className={`${s.kart} ${s.iskelet}`} aria-hidden="true">
      <div className={s.foto} />
      <i />
      <i />
    </li>
  );
}
