"use client";

// Rezervasyon kutusundaki tarih/misafir alanı (Airbnb gibi): tıklayınca kutunun
// üstünde takvim ya da misafir paneli açılır. Değişiklik taslakta tutulur;
// tarih aralığı tamamlanınca ya da panel kapanınca adrese yazılır (odalar
// yeniden aranır). Mobilde aynı içerik alttan açılan pencerede.

import * as React from "react";
import { MisafirPaneli, Takvim } from "@/components/lb/arama/paneller";
import { iso, misafirMetni, type AramaDegeri } from "@/components/lb/arama/durum";
import { Ikon } from "@/components/lb/ikon";
import { Pencere } from "@/components/lb/pencere";
import s from "./tarih-alani.module.css";

export type TarihPaneli = "tarih" | "misafir" | null;

const ayni = (a: AramaDegeri, b: AramaDegeri) =>
  (a.giris && iso(a.giris)) === (b.giris && iso(b.giris)) &&
  (a.cikis && iso(a.cikis)) === (b.cikis && iso(b.cikis)) &&
  a.yetiskin === b.yetiskin &&
  a.cocuklar.join() === b.cocuklar.join();

const uzun = (d: Date | null) => (d ? d.toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" }) : "Tarih ekle");

export function TarihAlani({ deger, panel, onPanel, onUygula }: {
  deger: AramaDegeri;
  panel: TarihPaneli;
  onPanel: (p: TarihPaneli) => void;
  onUygula: (d: AramaDegeri) => void;
}) {
  const [taslak, setTaslak] = React.useState(deger);
  const [onceki, setOnceki] = React.useState(panel);
  // Panel her açıldığında taslak adresteki değerden başlasın.
  if (panel !== onceki) {
    setOnceki(panel);
    if (panel && !onceki) setTaslak(deger);
  }
  const kok = React.useRef<HTMLDivElement>(null);

  const kapat = React.useCallback(() => {
    onPanel(null);
    if (!ayni(taslak, deger) && (!taslak.giris || taslak.cikis)) onUygula(taslak);
  }, [onPanel, onUygula, taslak, deger]);

  React.useEffect(() => {
    if (!panel) return;
    const dis = (e: PointerEvent) => !kok.current?.contains(e.target as Node) && kapat();
    const tus = (e: KeyboardEvent) => e.key === "Escape" && kapat();
    document.addEventListener("pointerdown", dis);
    document.addEventListener("keydown", tus);
    return () => {
      document.removeEventListener("pointerdown", dis);
      document.removeEventListener("keydown", tus);
    };
  }, [panel, kapat]);

  const gorunen = panel ? taslak : deger;
  return (
    <div ref={kok} className={s.kok}>
      <div className={s.alan} data-acik={panel || undefined}>
        <button type="button" aria-expanded={panel === "tarih"} data-etkin={panel === "tarih" || undefined} onClick={() => (panel === "tarih" ? kapat() : onPanel("tarih"))}>
          <small>Giriş</small>
          {uzun(gorunen.giris)}
        </button>
        <button type="button" aria-expanded={panel === "tarih"} data-etkin={panel === "tarih" || undefined} onClick={() => (panel === "tarih" ? kapat() : onPanel("tarih"))}>
          <small>Çıkış</small>
          {uzun(gorunen.cikis)}
        </button>
        <button type="button" className={s.misafir} aria-expanded={panel === "misafir"} data-etkin={panel === "misafir" || undefined} onClick={() => (panel === "misafir" ? kapat() : onPanel("misafir"))}>
          <span>
            <small>Misafirler</small>
            {misafirMetni(gorunen)}
          </span>
          <Ikon ad={panel === "misafir" ? "chevron-up" : "chevron-down"} boyut={18} />
        </button>
      </div>

      {panel === "tarih" && (
        <div className={`${s.acilir} ${s.takvim}`} role="dialog" aria-label="Tarih seç">
          <Takvim
            giris={taslak.giris}
            cikis={taslak.cikis}
            hizli={false}
            onDegis={(g, c, bitti) => {
              const y = { ...taslak, giris: g, cikis: c };
              setTaslak(y);
              if (bitti) {
                onPanel(null);
                if (!ayni(y, deger)) onUygula(y);
              }
            }}
          />
          <div className={s.altSatir}>
            <button type="button" className={s.kapatDugme} onClick={kapat}>Kapat</button>
          </div>
        </div>
      )}
      {panel === "misafir" && (
        <div className={`${s.acilir} ${s.misafirPanel}`} role="dialog" aria-label="Misafirler">
          <MisafirPaneli yetiskin={taslak.yetiskin} cocuklar={taslak.cocuklar} onDegis={(y, c) => setTaslak({ ...taslak, yetiskin: y, cocuklar: c })} />
          <div className={s.altSatir}>
            <button type="button" className={s.kapatDugme} onClick={kapat}>Tamam</button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Mobil: tarih ve misafir tek pencerede. */
export function TarihPenceresi({ acik, deger, onKapat, onUygula }: {
  acik: boolean;
  deger: AramaDegeri;
  onKapat: () => void;
  onUygula: (d: AramaDegeri) => void;
}) {
  const [taslak, setTaslak] = React.useState(deger);
  const [onceki, setOnceki] = React.useState(acik);
  if (acik !== onceki) {
    setOnceki(acik);
    if (acik) setTaslak(deger);
  }
  const tamam = !!(taslak.giris && taslak.cikis);
  return (
    <Pencere acik={acik} onKapat={onKapat} baslik="Tarih ve misafirler">
      <Takvim giris={taslak.giris} cikis={taslak.cikis} ikiAy={false} hizli={false} onDegis={(g, c) => setTaslak({ ...taslak, giris: g, cikis: c })} />
      <div className={s.mobilMisafir}>
        <MisafirPaneli yetiskin={taslak.yetiskin} cocuklar={taslak.cocuklar} onDegis={(y, c) => setTaslak({ ...taslak, yetiskin: y, cocuklar: c })} />
      </div>
      <button
        type="button"
        className={s.kaydet}
        disabled={!tamam}
        onClick={() => {
          onKapat();
          if (!ayni(taslak, deger)) onUygula(taslak);
        }}
      >
        {tamam ? "Odaları göster" : "Giriş ve çıkış seç"}
      </button>
    </Pencere>
  );
}
