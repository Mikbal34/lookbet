"use client";

// Mobil tam ekran arama (Airbnb'deki gibi): Nereye → Ne zaman → Kimler,
// bir bölüm açıkken ötekiler tek satır özet; altta "Tümünü temizle" ve "Ara".

import * as React from "react";
import { Ikon } from "../ikon";
import { MisafirPaneli, Takvim, YerPaneli } from "./paneller";
import { BOS_ARAMA, misafirMetni, tarihMetni, type AramaDegeri, type PanelAdi } from "./durum";
import s from "./mobil-arama.module.css";

export function MobilArama({ acik, deger, onDegis, onAra, onKapat }: {
  acik: boolean;
  deger: AramaDegeri;
  onDegis: (d: AramaDegeri) => void;
  onAra: () => void;
  onKapat: () => void;
}) {
  const [blok, setBlok] = React.useState<PanelAdi>("yer");
  const kapatDugme = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (!acik) return;
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => kapatDugme.current?.focus(), 60);
    const tus = (e: KeyboardEvent) => e.key === "Escape" && onKapat();
    document.addEventListener("keydown", tus);
    return () => {
      document.body.style.overflow = "";
      clearTimeout(t);
      document.removeEventListener("keydown", tus);
    };
  }, [acik, onKapat]);

  const tarih = tarihMetni(deger);
  const Blok = ({ ad, etiket, ozet, baslik, children }: {
    ad: PanelAdi; etiket: string; ozet: string; baslik: string; children: React.ReactNode;
  }) =>
    blok === ad ? (
      <section className={s.blok} data-acik="">
        <h2 className="lb-y">{baslik}</h2>
        {children}
      </section>
    ) : (
      <button type="button" className={`${s.blok} ${s.blokUst}`} onClick={() => setBlok(ad)}>
        <span>{etiket}</span>
        <b>{ozet}</b>
      </button>
    );

  return (
    <div className={s.sayfa} data-acik={acik || undefined} role="dialog" aria-modal="true" aria-label="Otel ara" aria-hidden={!acik}>
      <button ref={kapatDugme} type="button" className={s.kapat} onClick={onKapat} aria-label="Kapat">
        <Ikon ad="close" boyut={18} />
      </button>
      {Blok({
        ad: "yer",
        etiket: "Nereye",
        ozet: deger.yer || "Esnek",
        baslik: "Nereye gidiyorsun?",
        children: (
          <>
            <label className={s.girdi}>
              <Ikon ad="search" boyut={18} />
              <input
                value={deger.yer}
                placeholder="Şehir, bölge ya da otel ara"
                autoComplete="off"
                onChange={(e) => onDegis({ ...deger, yer: e.target.value, yerUst: null, yerId: null })}
                aria-label="Nereye"
              />
            </label>
            <YerPaneli
              yazilan={deger.yer}
              onSec={(ad, ust, id) => {
                onDegis({ ...deger, yer: ad, yerUst: ust, yerId: id ?? null });
                setBlok("tarih");
              }}
            />
          </>
        ),
      })}
      {Blok({
        ad: "tarih",
        etiket: "Ne zaman",
        ozet: tarih ?? "Tarih ekle",
        baslik: "Ne zaman?",
        children: (
          <Takvim
            giris={deger.giris}
            cikis={deger.cikis}
            ikiAy={false}
            onDegis={(giris, cikis, bitti) => {
              onDegis({ ...deger, giris, cikis });
              if (bitti) setTimeout(() => setBlok("misafir"), 300);
            }}
          />
        ),
      })}
      {Blok({
        ad: "misafir",
        etiket: "Kim",
        ozet: misafirMetni(deger),
        baslik: "Kimler geliyor?",
        children: (
          <MisafirPaneli yetiskin={deger.yetiskin} cocuklar={deger.cocuklar} onDegis={(yetiskin, cocuklar) => onDegis({ ...deger, yetiskin, cocuklar })} />
        ),
      })}
      <div className={s.alt}>
        <button type="button" className={s.metinDugme} onClick={() => { onDegis(BOS_ARAMA); setBlok("yer"); }}>
          Tümünü temizle
        </button>
        <button type="button" className={s.ara} onClick={onAra}>
          <Ikon ad="search" boyut={18} kalinlik={2.4} />
          Ara
        </button>
      </div>
    </div>
  );
}
