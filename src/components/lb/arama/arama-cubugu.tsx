"use client";

// Airbnb tarzı arama çubuğu.
//
// Üç katman aynı kutuda: büyük (Nereye · Tarihler · Misafirler · Ara), küçük
// (kaydırınca üst çubuktaki özet hap) ve tek (mobildeki "Nereye gidiyorsun?"
// satırı). Hangisinin görüneceğini ve kutunun konumunu dışarısı yönetir
// (ana sayfadaki kaydırma geçişi); çubuk kendi içinde panelleri yönetir.
//
// Alana tıklayınca çubuk griye döner, beyaz vurgu seçili alana kayar ve tek
// bir panel kutusu yeni içeriğin boyutuna yumuşakça uzayıp kısalır.

import * as React from "react";
import { Ikon } from "../ikon";
import { Nesne, type NesneAdi } from "../nesne";
import { MisafirPaneli, Takvim, YerPaneli } from "./paneller";
import { misafirMetni, tarihMetni, type AramaDegeri, type PanelAdi } from "./durum";
import s from "./arama-cubugu.module.css";

export interface AramaKontrol {
  panelAc: (ad: PanelAdi) => void;
  panelKapat: () => void;
}

export interface AramaCubuguProps {
  deger: AramaDegeri;
  onDegis: (d: AramaDegeri) => void;
  onAra: () => void;
  /** Kutunun konumunu dışarısı (kaydırma geçişi) yönetiyor. */
  kokRef: React.RefObject<HTMLDivElement | null>;
  buyukRef: React.RefObject<HTMLDivElement | null>;
  kucukRef?: React.Ref<HTMLButtonElement>;
  tekRef?: React.Ref<HTMLButtonElement>;
  kontrol?: React.Ref<AramaKontrol>;
  /** Küçük hapın solundaki nesne (seçili kategori). */
  nesne: NesneAdi;
  onKucuk: (alan?: PanelAdi) => void;
  onTek: () => void;
  onAcikDegis?: (acik: boolean) => void;
  /** Sayfa akışında dur (iç sayfaların üst çubuğu); yoksa konumu dışarısı yönetir. */
  akis?: boolean;
  className?: string;
}

export function AramaCubugu({
  deger, onDegis, onAra, kokRef, buyukRef, kucukRef, tekRef, kontrol, nesne, onKucuk, onTek, onAcikDegis, akis, className,
}: AramaCubuguProps) {
  const [aktif, setAktif] = React.useState<PanelAdi | null>(null);
  const ilkAcilis = React.useRef(true);
  const kok = kokRef;
  const buyuk = buyukRef;
  const vurgu = React.useRef<HTMLSpanElement>(null);
  const panel = React.useRef<HTMLDivElement>(null);
  const icerikler = React.useRef<Record<PanelAdi, HTMLDivElement | null>>({ yer: null, tarih: null, misafir: null });
  const alanlar = React.useRef<Record<PanelAdi, HTMLElement | null>>({ yer: null, tarih: null, misafir: null });
  const yerGirdi = React.useRef<HTMLInputElement>(null);

  const ac = React.useCallback((ad: PanelAdi) => {
    setAktif((onceki) => {
      ilkAcilis.current = onceki === null;
      return ad;
    });
    if (ad === "yer") setTimeout(() => yerGirdi.current?.focus(), 30);
  }, []);
  const kapat = React.useCallback(() => setAktif(null), []);
  React.useImperativeHandle(kontrol, () => ({ panelAc: ac, panelKapat: kapat }), [ac, kapat]);
  React.useEffect(() => onAcikDegis?.(aktif !== null), [aktif, onAcikDegis]);

  // Dışarı tıklama / Esc
  React.useEffect(() => {
    if (!aktif) return;
    const tik = (e: MouseEvent) => {
      if (!kok.current?.contains(e.target as Node)) kapat();
    };
    const tus = (e: KeyboardEvent) => e.key === "Escape" && kapat();
    document.addEventListener("mousedown", tik);
    document.addEventListener("keydown", tus);
    return () => {
      document.removeEventListener("mousedown", tik);
      document.removeEventListener("keydown", tus);
    };
  }, [aktif, kapat, kok]);

  // Vurgu ve panel kutusunu seçili alana göre yerleştir; içerik boyu değişince
  // (öneriler geldi, takvim altı satıra çıktı) kutu da uzasın.
  React.useLayoutEffect(() => {
    const v = vurgu.current, p = panel.current, b = buyuk.current, k = kok.current;
    if (!v || !p || !b || !k) return;
    if (!aktif) {
      v.style.opacity = "0";
      return;
    }
    const ani = ilkAcilis.current;
    const alan = alanlar.current[aktif];
    const ic = icerikler.current[aktif];
    if (!alan || !ic) return;
    const yerlestir = () => {
      const br = b.getBoundingClientRect(), ar = alan.getBoundingClientRect();
      v.dataset.ani = ani ? "1" : "";
      v.style.width = `${ar.width}px`;
      v.style.transform = `translateX(${ar.left - br.left}px)`;
      v.style.opacity = "1";
      const W = k.offsetWidth;
      if (aktif === "tarih") ic.style.width = `${W}px`;
      const w = ic.offsetWidth, h = ic.offsetHeight;
      p.dataset.ani = ani ? "1" : "";
      p.style.width = `${w}px`;
      p.style.height = `${h}px`;
      p.style.translate = `${aktif === "misafir" ? W - w : 0}px 0`;
      if (ani) {
        void p.offsetWidth;
        p.dataset.ani = "";
        v.dataset.ani = "";
      }
    };
    yerlestir();
    ilkAcilis.current = false;
    const ro = new ResizeObserver(() => {
      const w = ic.offsetWidth, h = ic.offsetHeight;
      p.style.width = `${w}px`;
      p.style.height = `${h}px`;
    });
    ro.observe(ic);
    return () => ro.disconnect();
  }, [aktif, kok, buyuk]);

  const tarih = tarihMetni(deger);
  const misafir = misafirMetni(deger);
  return (
    <div ref={kokRef} className={`${s.arama} ${akis ? s.akis : ""} ${className ?? ""}`} data-acik={aktif ? "" : undefined} role="search">
      <div ref={buyukRef} className={`${s.katman} ${s.buyuk}`}>
        <span ref={vurgu} className={s.vurgu} />
        <div
          ref={(el) => { alanlar.current.yer = el; }}
          className={`${s.alan} ${s.alanYer}`}
          data-secili={aktif === "yer" || undefined}
          onClick={() => ac("yer")}
        >
          <label htmlFor="lb-nereye"><b>Nereye</b></label>
          <input
            id="lb-nereye"
            ref={yerGirdi}
            value={deger.yer}
            placeholder="Şehir, bölge ya da otel ara"
            autoComplete="off"
            onFocus={() => aktif !== "yer" && ac("yer")}
            onChange={(e) => onDegis({ ...deger, yer: e.target.value, yerUst: null, yerId: null })}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                ac("tarih");
              }
            }}
          />
        </div>
        <button
          ref={(el) => { alanlar.current.tarih = el; }}
          type="button"
          className={s.alan}
          data-secili={aktif === "tarih" || undefined}
          aria-expanded={aktif === "tarih"}
          onClick={() => (aktif === "tarih" ? kapat() : ac("tarih"))}
        >
          <b>Tarihler</b>
          <span data-dolu={tarih ? "" : undefined}>{tarih ?? "Giriş – çıkış ekle"}</span>
        </button>
        <button
          ref={(el) => { alanlar.current.misafir = el; }}
          type="button"
          className={s.alan}
          data-secili={aktif === "misafir" || undefined}
          aria-expanded={aktif === "misafir"}
          onClick={() => (aktif === "misafir" ? kapat() : ac("misafir"))}
        >
          <b>Misafirler</b>
          <span data-dolu="">{misafir}</span>
        </button>
        <button type="button" className={s.ara} onClick={onAra} aria-label="Otel ara">
          <Ikon ad="search" boyut={20} kalinlik={2.4} />
          <em>Ara</em>
        </button>
      </div>

      <button ref={tekRef} type="button" className={`${s.katman} ${s.tek}`} onClick={onTek}>
        <div>
          <b>{deger.yer || "Nereye gidiyorsun?"}</b>
          <small>{tarih ?? "Tarih ekle"} · {misafir}</small>
        </div>
        <i><Ikon ad="search" boyut={20} kalinlik={2.4} /></i>
      </button>

      <button ref={kucukRef} type="button" className={`${s.katman} ${s.kucuk}`} onClick={(e) => {
        const alan = (e.target as HTMLElement).closest<HTMLElement>("[data-alan]")?.dataset.alan as PanelAdi | undefined;
        onKucuk(alan);
      }} aria-label="Aramayı büyüt">
        <Nesne ad={nesne} boyut={34} />
        <span data-alan="yer">{deger.yer || "Nereye gidiyorsun?"}</span>
        <span data-alan="tarih" className={s.soluk}>{tarih ?? "Tarih ekle"}</span>
        <span data-alan="misafir" className={s.soluk}>{misafir}</span>
        <i><Ikon ad="search" boyut={16} kalinlik={2.6} /></i>
      </button>

      <div ref={panel} className={s.panel} data-acik={aktif ? "" : undefined} aria-hidden={!aktif}>
        <div ref={(el) => { icerikler.current.yer = el; }} className={`${s.icerik} ${s.iYer}`} data-aktif={aktif === "yer" || undefined}>
          <YerPaneli
            yazilan={deger.yer}
            onSec={(ad, ust, id) => {
              onDegis({ ...deger, yer: ad, yerUst: ust, yerId: id ?? null });
              ac("tarih");
            }}
          />
        </div>
        <div ref={(el) => { icerikler.current.tarih = el; }} className={`${s.icerik} ${s.iTarih}`} data-aktif={aktif === "tarih" || undefined}>
          <Takvim
            giris={deger.giris}
            cikis={deger.cikis}
            onDegis={(giris, cikis, bitti) => {
              onDegis({ ...deger, giris, cikis });
              if (bitti) setTimeout(() => ac("misafir"), 350);
            }}
          />
        </div>
        <div ref={(el) => { icerikler.current.misafir = el; }} className={`${s.icerik} ${s.iMisafir}`} data-aktif={aktif === "misafir" || undefined}>
          <MisafirPaneli yetiskin={deger.yetiskin} cocuklar={deger.cocuklar} onDegis={(yetiskin, cocuklar) => onDegis({ ...deger, yetiskin, cocuklar })} />
        </div>
      </div>
    </div>
  );
}
