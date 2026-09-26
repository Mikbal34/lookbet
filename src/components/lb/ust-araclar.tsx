"use client";

// Üst çubuğun sağı: dil ve para birimi penceresi (dünya) + hesap menüsü.
//
// Dil seçimi çereze yazılır, sayfa yeni dille yeniden çizilir (LocaleProvider,
// i18n/request). Para birimi: fiyatlar EUR; seçilen birimde TCMB kuruyla
// yaklaşık gösterilir (lb/fiyat), ödeme EUR.

import * as React from "react";
import { Govdeye } from "./pencere";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useLocale } from "@/components/providers/locale-provider";
import { Ikon } from "./ikon";
import { Nesne } from "./nesne";
import { useGiris } from "./giris/giris-saglayici";
import s from "./ust-araclar.module.css";

// Ad ve alt satır metin anahtarları (ust.bolge.*).
const DILLER = [
  { kod: "tr", ad: "turkce", alt: "turkiye" },
  { kod: "en", ad: "ingilizce", alt: "birlesikKrallik" },
] as const;
const PARALAR = [
  { kod: "TRY", ad: "tl", alt: "TRY – ₺" },
  { kod: "EUR", ad: "euro", alt: "EUR – €" },
  { kod: "USD", ad: "dolar", alt: "USD – $" },
  { kod: "GBP", ad: "sterlin", alt: "GBP – £" },
] as const;

/** Dışarı tıklayınca ve Esc'de kapanan açılır öğe durumu. */
function useAcilir<T extends HTMLElement>() {
  const [acik, setAcik] = React.useState(false);
  const kok = React.useRef<T>(null);
  React.useEffect(() => {
    if (!acik) return;
    const tik = (e: MouseEvent) => {
      if (!kok.current?.contains(e.target as Node)) setAcik(false);
    };
    const tus = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAcik(false);
    };
    document.addEventListener("mousedown", tik);
    document.addEventListener("keydown", tus);
    return () => {
      document.removeEventListener("mousedown", tik);
      document.removeEventListener("keydown", tus);
    };
  }, [acik]);
  return { acik, setAcik, kok };
}

export function BolgePenceresi({ acik, sekme, onSekme, onKapat }: {
  acik: boolean;
  sekme: "dil" | "para";
  onSekme: (s: "dil" | "para") => void;
  onKapat: () => void;
}) {
  const { lang, currency, setLang, setCurrency } = useLocale();
  const t = useTranslations("ust.bolge");
  const tk = useTranslations("ortak");
  const kapat = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    if (!acik) return;
    const onceki = document.activeElement as HTMLElement | null;
    const t = setTimeout(() => kapat.current?.focus(), 50);
    const tus = (e: KeyboardEvent) => e.key === "Escape" && onKapat();
    document.addEventListener("keydown", tus);
    document.body.style.overflow = "hidden";
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", tus);
      document.body.style.overflow = "";
      onceki?.focus();
    };
  }, [acik, onKapat]);

  const sec = (f: () => void) => {
    f();
    setTimeout(onKapat, 180);
  };

  return (
    <Govdeye>
    <div className={`lb ${s.kap}`} data-acik={acik || undefined} onClick={(e) => e.target === e.currentTarget && onKapat()} aria-hidden={!acik}>
      <div className={s.pencere} role="dialog" aria-modal="true" aria-labelledby="bolge-baslik">
        <button ref={kapat} type="button" className={s.kapat} onClick={onKapat} aria-label={tk("kapat")}>
          <Ikon ad="close" boyut={18} />
        </button>
        <div className={s.sekmeler} role="tablist">
          {(["dil", "para"] as const).map((k) => (
            <button key={k} type="button" role="tab" aria-selected={sekme === k} className={s.sekme} onClick={() => onSekme(k)}>
              {k === "dil" ? t("sekmeDil") : t("sekmePara")}
            </button>
          ))}
        </div>
        <h2 id="bolge-baslik" className={`lb-y ${s.baslik}`}>
          {sekme === "dil" ? t("baslikDil") : t("baslikPara")}
        </h2>
        <div className={s.secenekler} key={sekme}>
          {sekme === "dil"
            ? DILLER.map((o) => (
                <button key={o.kod} type="button" className={s.secenek} aria-pressed={lang === o.kod} onClick={() => sec(() => setLang(o.kod))}>
                  <b>{t(o.ad)}</b>
                  <span>{t(o.alt)}</span>
                </button>
              ))
            : PARALAR.map((o) => (
                <button key={o.kod} type="button" className={s.secenek} aria-pressed={currency === o.kod} onClick={() => sec(() => setCurrency(o.kod))}>
                  <b>{t(o.ad)}</b>
                  <span>{o.alt}</span>
                </button>
              ))}
        </div>
        {sekme === "para" && <p className={s.not}>{t("kurNotu")}</p>}
      </div>
    </div>
    </Govdeye>
  );
}

export function DunyaDugmesi({ className }: { className?: string }) {
  const t = useTranslations("ust.bolge");
  const [acik, setAcik] = React.useState(false);
  const [sekme, setSekme] = React.useState<"dil" | "para">("dil");
  const kapat = React.useCallback(() => setAcik(false), []);
  return (
    <>
      <button type="button" className={`${s.yuvarlak} ${className ?? ""}`} onClick={() => setAcik(true)} aria-haspopup="dialog" aria-label={t("dunyaEtiket")}>
        <Ikon ad="globe" boyut={18} />
      </button>
      <BolgePenceresi acik={acik} sekme={sekme} onSekme={setSekme} onKapat={kapat} />
    </>
  );
}

function MenuBag({ href, kalin, onClick, children }: { href: string; kalin?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Link href={href} onClick={onClick} className={kalin ? s.kalin : undefined}>
      {children}
    </Link>
  );
}

export function MenuDugmesi() {
  const t = useTranslations("ust.menu");
  const { lang } = useLocale();
  const { acik, setAcik, kok } = useAcilir<HTMLDivElement>();
  const { data: oturum } = useSession();
  const giris = useGiris();
  const kapat = () => setAcik(false);
  const ilkAd = oturum?.user?.name?.split(" ")[0];
  return (
    <div className={s.menuKok} ref={kok}>
      <button type="button" className={s.menuDugme} aria-expanded={acik} aria-haspopup="true" onClick={() => setAcik((a) => !a)} aria-label={t("etiket")}>
        <Ikon ad="menu" boyut={18} />
        <span className={s.avatar}>
          {oturum?.user?.name ? oturum.user.name.trim()[0]?.toLocaleUpperCase(lang) : <Ikon ad="user" boyut={18} />}
        </span>
      </button>
      <nav className={s.acilir} data-acik={acik || undefined} aria-label={t("hesapMenusu")}>
        {oturum ? (
          <>
            <span className={s.merhaba}>{ilkAd != null ? t("merhaba", { ad: ilkAd }) : t("merhabaAdsiz")}</span>
            {oturum.user?.role === "AGENCY" ? (
              // Acente hesabının "hesabı" Partner paneli: taslaktaki menüyle aynı maddeler.
              <>
                <MenuBag href="/agency/dashboard" kalin onClick={kapat}>{t("partnerPaneli")}</MenuBag>
                <MenuBag href="/agency/reservations" onClick={kapat}>{t("rezervasyonlar")}</MenuBag>
                <MenuBag href="/agency/kazanclar" onClick={kapat}>{t("kazanclar")}</MenuBag>
                <MenuBag href="/agency/company" onClick={kapat}>{t("sirketBilgileri")}</MenuBag>
              </>
            ) : oturum.user?.role === "ADMIN" ? (
              <MenuBag href="/admin" kalin onClick={kapat}>{t("yonetimPaneli")}</MenuBag>
            ) : (
              <>
                <MenuBag href="/profile" kalin onClick={kapat}>{t("hesabim")}</MenuBag>
                <MenuBag href="/reservations" onClick={kapat}>{t("rezervasyonlarim")}</MenuBag>
              </>
            )}
            <hr />
            <MenuBag href="/yardim" onClick={kapat}>{t("yardimMerkezi")}</MenuBag>
            <button type="button" onClick={() => signOut({ callbackUrl: oturum.user?.role === "AGENCY" ? "/agency/login" : "/" })}>{t("cikis")}</button>
          </>
        ) : (
          <>
            <button type="button" className={s.kalin} onClick={() => { kapat(); giris.ac(); }}>{t("girisYap")}</button>
            <hr />
            <Link href="/agency/login" onClick={kapat} className={s.acente}>
              <span>
                <b>{t("acenteGirisi")}</b>
                <small>{t("acenteAciklama")}</small>
              </span>
              <Nesne ad="anahtar-karti" boyut={52} />
            </Link>
            <hr />
            <MenuBag href="/reservations" onClick={kapat}>{t("rezervasyonumuBul")}</MenuBag>
            <MenuBag href="/yardim" onClick={kapat}>{t("yardimMerkezi")}</MenuBag>
          </>
        )}
      </nav>
    </div>
  );
}
