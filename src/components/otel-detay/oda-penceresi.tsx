"use client";
/* eslint-disable @next/next/no-img-element -- otel ve oda görselleri dış kaynaklı (tedarikçi) */

// Oda penceresi (Airbnb gibi iki sütun): solda fotoğraf mozaiği, sağda oda
// özellikleri, iptal zaman çizelgesi ve fiyat dökümü. Pencerenin solundaki
// rayda diğer odalar küçük fotoğraf + fiyatla durur; tıklayınca (ya da ↑ ↓)
// içerik yumuşakça değişir.

import * as React from "react";
import { Ikon } from "@/components/lb/ikon";
import { Nesne } from "@/components/lb/nesne";
import { Govdeye, useKatman } from "@/components/lb/pencere";
import type { RoomResult } from "@/lib/royal-api/types";
import { iptalOzeti, odaOzellikleri, para } from "./yardimci";
import s from "./oda-penceresi.module.css";

export type Oda = RoomResult & {
  pricing?: {
    /** Net fiyat; yalnız yöneticiye gelir. */
    originalPrice?: number;
    /** Kural sonrası, kampanya indiriminden önceki fiyat. */
    oncekiFiyat?: number;
    finalPrice: number;
    totalDiscount: number;
    kampanya?: { id: string; ad: string; tur: string; yuzde: number; tutar: number } | null;
  };
};
/** Kampanyadan önceki fiyat (üstü çizili); kampanya yoksa null. */
export const odaOncekiFiyati = (o: Oda) => (o.pricing?.kampanya ? o.pricing.oncekiFiyat ?? null : null);

export const odaToplami = (o: Oda) => o.pricing?.finalPrice ?? o.totalPrice;

export function OdaPenceresi({ baslangic, odalar, gece, misafir, seciliKod, onSec, onDevam, onKapat, onFoto }: {
  /** Açılacak odanın priceCode'u; null ise pencere kapalı. */
  baslangic: string | null;
  odalar: Oda[];
  gece: number;
  misafir: string;
  seciliKod: string | null;
  onSec: (o: Oda) => void;
  onDevam: () => void;
  onKapat: () => void;
  onFoto: (o: Oda, j: number) => void;
}) {
  const [kod, setKod] = React.useState(baslangic);
  const [onceki, setOnceki] = React.useState(baslangic);
  const [degisiyor, setDegisiyor] = React.useState(false);
  // Pencere başka bir odayla açılınca o odadan başla (kapanırken içerik kalsın).
  if (baslangic !== onceki) {
    setOnceki(baslangic);
    if (baslangic) setKod(baslangic);
  }
  const kapat = React.useRef<HTMLButtonElement>(null);
  const zaman = React.useRef<ReturnType<typeof setTimeout>>(undefined);
  const acik = !!baslangic;
  useKatman(acik, onKapat, kapat);

  const degistir = React.useCallback(
    (yeni: string) => {
      if (yeni === kod) return;
      clearTimeout(zaman.current);
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) return setKod(yeni);
      setDegisiyor(true);
      zaman.current = setTimeout(() => {
        setKod(yeni);
        setDegisiyor(false);
      }, 200);
    },
    [kod]
  );
  React.useEffect(() => () => clearTimeout(zaman.current), []);
  React.useEffect(() => {
    if (!acik) return;
    const tus = (e: KeyboardEvent) => {
      if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
      e.preventDefault();
      const i = odalar.findIndex((o) => o.priceCode === kod);
      const n = odalar.length;
      degistir(odalar[(i + (e.key === "ArrowDown" ? 1 : -1) + n) % n].priceCode);
    };
    document.addEventListener("keydown", tus);
    return () => document.removeEventListener("keydown", tus);
  }, [acik, odalar, kod, degistir]);

  const oda = odalar.find((o) => o.priceCode === kod) ?? null;
  const sag = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (sag.current) sag.current.scrollTop = 0;
  }, [kod]);

  const kapatDis = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onKapat();
  };

  return (
    <Govdeye>
    <div className={`lb ${s.kap}`} data-acik={acik || undefined} onClick={kapatDis} aria-hidden={!acik}>
      <div className={s.sahne} onClick={kapatDis}>
        {odalar.length > 1 && (
          <nav className={s.ray} aria-label="Diğer odalar">
            {odalar.map((o) => (
              <button
                key={o.priceCode}
                type="button"
                aria-current={o.priceCode === kod}
                aria-label={`${o.roomName}, ${o.boardTypeName}, ${para(odaToplami(o), o.currency)}`}
                onClick={() => degistir(o.priceCode)}
                tabIndex={acik ? 0 : -1}
              >
                <span>{o.images[0] ? <img src={o.images[0]} alt="" loading="lazy" /> : <Nesne ad="zil" boyut={34} />}</span>
                <small>{para(odaToplami(o), o.currency)}</small>
              </button>
            ))}
          </nav>
        )}
        <div className={s.pencere} data-degisiyor={degisiyor || undefined} role="dialog" aria-modal="true" aria-labelledby="oda-baslik">
          <button ref={kapat} type="button" className={s.kapat} onClick={onKapat} aria-label="Kapat" tabIndex={acik ? 0 : -1}>
            <Ikon ad="close" boyut={18} />
          </button>
          {oda && <OdaIcerik oda={oda} gece={gece} misafir={misafir} secili={oda.priceCode === seciliKod} onSec={onSec} onDevam={onDevam} onFoto={onFoto} sagRef={sag} />}
        </div>
      </div>
    </div>
    </Govdeye>
  );
}

function OdaIcerik({ oda, gece, misafir, secili, onSec, onDevam, onFoto, sagRef }: {
  oda: Oda;
  gece: number;
  misafir: string;
  secili: boolean;
  onSec: (o: Oda) => void;
  onDevam: () => void;
  onFoto: (o: Oda, j: number) => void;
  sagRef: React.RefObject<HTMLDivElement | null>;
}) {
  const g = oda.images;
  const fazla = g.length - 3;
  const toplam = odaToplami(oda);
  const onceki = oda.pricing?.oncekiFiyat ?? toplam;
  const kampanya = oda.pricing?.kampanya ?? null;
  // Kampanyadan sonra kalan fark acentenin anlaşma indirimi.
  const acenteIndirimi = Math.max(0, onceki - (kampanya?.tutar ?? 0) - toplam);
  const ip = iptalOzeti(oda.cancellationPolicies);
  const ozellik = odaOzellikleri(oda);
  ozellik.splice(ozellik[0]?.ikon === "bed" ? 1 : 0, 0, { ikon: "guests", metin: misafir });
  const yatak = ozellik.find((o) => o.ikon === "bed")?.metin;

  return (
    <>
      <div className={s.mozaik} data-adet={Math.min(3, g.length)}>
        {g.length ? (
          g.slice(0, 3).map((u, i) => (
            <button key={u} type="button" onClick={() => onFoto(oda, i)} aria-label={`Fotoğraf ${i + 1}`}>
              <img src={u} alt="" />
              {i === 2 && fazla > 0 && <span className={s.fazla}>+{fazla}</span>}
            </button>
          ))
        ) : (
          <div className={s.fotoYok}>
            <Nesne ad="zil" boyut={72} />
            Bu odanın fotoğrafı yok
          </div>
        )}
      </div>
      <div className={s.sag}>
        <div ref={sagRef} className={s.sagIc}>
          <h2 id="oda-baslik" className="lb-y">{oda.roomName}</h2>
          <p className={s.alt}>{[yatak, misafir, oda.boardTypeName].filter(Boolean).join(" · ")}</p>
          <section>
            <h3>Bu oda neler sunuyor?</h3>
            <ul className={s.ozellik}>
              {ozellik.map((o) => (
                <li key={o.metin}>
                  <Ikon ad={o.ikon} boyut={22} />
                  <span>{o.metin}</span>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h3>İptal koşulları</h3>
            <div className={s.zaman}>
              {ip.ucretsiz && (
                <div>
                  <b>{ip.ucretsiz.yonelme} kadar</b>
                  <span>Saat {ip.ucretsiz.saat} öncesi ücretsiz iptal; ödemenin tamamı iade edilir</span>
                </div>
              )}
              {ip.ceza && (
                <div className={s.ceza}>
                  <b>{ip.ucretsiz ? `${ip.ceza.gun}, saat ${ip.ceza.saat} ve sonrası` : "İade edilmez"}</b>
                  <span>İptal ücreti {para(ip.ceza.tutar, ip.ceza.para)}{ip.ceza.tutar >= toplam ? " (toplam tutar)" : ""}</span>
                </div>
              )}
              {!ip.ucretsiz && !ip.ceza && <p className={s.soluk}>İptal koşulları rezervasyon adımında gösterilir.</p>}
            </div>
          </section>
          <section>
            <h3>Fiyat</h3>
            <div className={s.dokum}>
              <div>
                <span>{para(onceki / gece, oda.currency)} × {gece} gece</span>
                <span>{para(onceki, oda.currency)}</span>
              </div>
              {kampanya && (
                <div className={s.indirim}>
                  <span>{kampanya.ad} %{kampanya.yuzde}</span>
                  <span>−{para(kampanya.tutar, oda.currency)}</span>
                </div>
              )}
              {acenteIndirimi >= 0.5 && (
                <div className={s.indirim}>
                  <span>Acente indirimi</span>
                  <span>−{para(acenteIndirimi, oda.currency)}</span>
                </div>
              )}
              <div className={s.toplam}>
                <span>Toplam</span>
                <span>{para(toplam, oda.currency)}</span>
              </div>
            </div>
          </section>
        </div>
        <div className={s.altCubuk}>
          <div>
            <b className="lb-y">{para(toplam, oda.currency)}</b>
            <span>{gece} gece, vergiler dahil</span>
          </div>
          <button type="button" className={s.dugme} onClick={() => (secili ? onDevam() : onSec(oda))}>
            {secili ? "Rezervasyona devam et" : "Bu odayı seç"}
          </button>
        </div>
      </div>
    </>
  );
}
