"use client";
/* eslint-disable @next/next/no-img-element -- otel ve oda görselleri dış kaynaklı (tedarikçi) */

// Oda penceresi (Airbnb gibi iki sütun): solda fotoğraf mozaiği, sağda oda
// özellikleri, iptal zaman çizelgesi ve fiyat dökümü. Pencerenin solundaki
// rayda diğer odalar küçük fotoğraf + fiyatla durur; tıklayınca (ya da ↑ ↓)
// içerik yumuşakça değişir.

import { useFiyat } from "@/components/lb/fiyat";
import * as React from "react";
import { useTranslations } from "next-intl";
import { Ikon } from "@/components/lb/ikon";
import { Nesne } from "@/components/lb/nesne";
import { Govdeye, useKatman } from "@/components/lb/pencere";
import { useBicim } from "@/i18n/use-bicim";
import type { RoomResult } from "@/lib/royal-api/types";
import { iptalOzeti, odaOzellikleri } from "./yardimci";
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
  const t = useTranslations("otel");
  const tk = useTranslations("ortak");
  const { yaz } = useFiyat();
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
          <nav className={s.ray} aria-label={t("odaPenceresi.digerOdalar")}>
            {odalar.map((o) => (
              <button
                key={o.priceCode}
                type="button"
                aria-current={o.priceCode === kod}
                aria-label={`${o.roomName}, ${o.boardTypeName}, ${yaz(odaToplami(o), o.currency)}`}
                onClick={() => degistir(o.priceCode)}
                tabIndex={acik ? 0 : -1}
              >
                <span>{o.images[0] ? <img src={o.images[0]} alt="" loading="lazy" /> : <Nesne ad="zil" boyut={34} />}</span>
                <small>{yaz(odaToplami(o), o.currency)}</small>
              </button>
            ))}
          </nav>
        )}
        <div className={s.pencere} data-degisiyor={degisiyor || undefined} role="dialog" aria-modal="true" aria-labelledby="oda-baslik">
          <button ref={kapat} type="button" className={s.kapat} onClick={onKapat} aria-label={tk("kapat")} tabIndex={acik ? 0 : -1}>
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
  const t = useTranslations("otel");
  const bicim = useBicim();
  const { yaz } = useFiyat();
  const g = oda.images;
  const fazla = g.length - 3;
  const toplam = odaToplami(oda);
  const onceki = oda.pricing?.oncekiFiyat ?? toplam;
  const kampanya = oda.pricing?.kampanya ?? null;
  // Kampanyadan sonra kalan fark acentenin anlaşma indirimi.
  const acenteIndirimi = Math.max(0, onceki - (kampanya?.tutar ?? 0) - toplam);
  const ip = iptalOzeti(oda.cancellationPolicies, bicim);
  const ozellik = odaOzellikleri(oda, (o) => t(`odaOzelligi.${o}`));
  ozellik.splice(ozellik[0]?.ikon === "bed" ? 1 : 0, 0, { ikon: "guests", metin: misafir });
  const yatak = ozellik.find((o) => o.ikon === "bed")?.metin;

  return (
    <>
      <div className={s.mozaik} data-adet={Math.min(3, g.length)}>
        {g.length ? (
          g.slice(0, 3).map((u, i) => (
            <button key={u} type="button" onClick={() => onFoto(oda, i)} aria-label={t("galeri.fotograf", { sira: i + 1 })}>
              <img src={u} alt="" />
              {i === 2 && fazla > 0 && <span className={s.fazla}>+{fazla}</span>}
            </button>
          ))
        ) : (
          <div className={s.fotoYok}>
            <Nesne ad="zil" boyut={72} />
            {t("odaPenceresi.fotoYok")}
          </div>
        )}
      </div>
      <div className={s.sag}>
        <div ref={sagRef} className={s.sagIc}>
          <h2 id="oda-baslik" className="lb-y">{oda.roomName}</h2>
          <p className={s.alt}>{[yatak, misafir, oda.boardTypeName].filter(Boolean).join(" · ")}</p>
          <section>
            <h3>{t("odaPenceresi.sunulanlar")}</h3>
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
            <h3>{t("iptal.baslik")}</h3>
            <div className={s.zaman}>
              {ip.ucretsiz && (
                <div>
                  <b>{t("odaPenceresi.kadar", { tarih: ip.ucretsiz.yonelme })}</b>
                  <span>{t("odaPenceresi.ucretsizOnce", { saat: ip.ucretsiz.saat })}</span>
                </div>
              )}
              {ip.ceza && (
                <div className={s.ceza}>
                  <b>{ip.ucretsiz ? t("odaPenceresi.cezaSonrasi", { gun: ip.ceza.gun, saat: ip.ceza.saat }) : t("iptal.iadeEdilmez")}</b>
                  <span>
                    {ip.ceza.tutar >= toplam
                      ? t("odaPenceresi.iptalUcretiToplam", { tutar: yaz(ip.ceza.tutar, ip.ceza.para) })
                      : t("odaPenceresi.iptalUcreti", { tutar: yaz(ip.ceza.tutar, ip.ceza.para) })}
                  </span>
                </div>
              )}
              {!ip.ucretsiz && !ip.ceza && <p className={s.soluk}>{t("odaPenceresi.iptalSonra")}</p>}
            </div>
          </section>
          <section>
            <h3>{t("odaPenceresi.fiyat")}</h3>
            <div className={s.dokum}>
              <div>
                <span>{t("fiyat.geceCarpi", { fiyat: yaz(onceki / gece, oda.currency), gece })}</span>
                <span>{yaz(onceki, oda.currency)}</span>
              </div>
              {kampanya && (
                <div className={s.indirim}>
                  <span>{t("odaPenceresi.kampanya", { ad: kampanya.ad, yuzde: kampanya.yuzde })}</span>
                  <span>−{yaz(kampanya.tutar, oda.currency)}</span>
                </div>
              )}
              {acenteIndirimi >= 0.5 && (
                <div className={s.indirim}>
                  <span>{t("odaPenceresi.acenteIndirimi")}</span>
                  <span>−{yaz(acenteIndirimi, oda.currency)}</span>
                </div>
              )}
              <div className={s.toplam}>
                <span>{t("fiyat.toplam")}</span>
                <span>{yaz(toplam, oda.currency)}</span>
              </div>
            </div>
          </section>
        </div>
        <div className={s.altCubuk}>
          <div>
            <b className="lb-y">{yaz(toplam, oda.currency)}</b>
            <span>{t("odaPenceresi.vergilerDahil", { gece })}</span>
          </div>
          <button type="button" className={s.dugme} onClick={() => (secili ? onDevam() : onSec(oda))}>
            {secili ? t("ana.devam") : t("odaPenceresi.odayiSec")}
          </button>
        </div>
      </div>
    </>
  );
}
