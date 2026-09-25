"use client";

// Üst çubuğun sağı: dil ve para birimi penceresi (dünya) + hesap menüsü.
//
// Dil ve para birimi tercih olarak saklanıyor (LocaleProvider). Tam çeviri ve
// kurla fiyat gösterimi ayrı iş; Etscore aramaları EUR ile yapılıyor (TRY
// hesabımızda tanımlı değil), TL gösterimi bizim tarafta kurla olacak.

import * as React from "react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useLocale } from "@/components/providers/locale-provider";
import { Ikon } from "./ikon";
import { Nesne } from "./nesne";
import { useGiris } from "./giris/giris-saglayici";
import s from "./ust-araclar.module.css";

const DILLER = [
  { kod: "tr", ad: "Türkçe", alt: "Türkiye" },
  { kod: "en", ad: "English", alt: "United States" },
];
const PARALAR = [
  { kod: "TRY", ad: "Türk lirası", alt: "TRY – ₺" },
  { kod: "USD", ad: "ABD doları", alt: "USD – $" },
  { kod: "EUR", ad: "Euro", alt: "EUR – €" },
];

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
    <div className={s.kap} data-acik={acik || undefined} onClick={(e) => e.target === e.currentTarget && onKapat()} aria-hidden={!acik}>
      <div className={s.pencere} role="dialog" aria-modal="true" aria-labelledby="bolge-baslik">
        <button ref={kapat} type="button" className={s.kapat} onClick={onKapat} aria-label="Kapat">
          <Ikon ad="close" boyut={18} />
        </button>
        <div className={s.sekmeler} role="tablist">
          {(["dil", "para"] as const).map((k) => (
            <button key={k} type="button" role="tab" aria-selected={sekme === k} className={s.sekme} onClick={() => onSekme(k)}>
              {k === "dil" ? "Dil ve bölge" : "Para birimi"}
            </button>
          ))}
        </div>
        <h2 id="bolge-baslik" className={`lb-y ${s.baslik}`}>
          {sekme === "dil" ? "Bir dil ve bölge seçin" : "Bir para birimi seçin"}
        </h2>
        <div className={s.secenekler} key={sekme}>
          {(sekme === "dil" ? DILLER : PARALAR).map((o) => {
            const secili = sekme === "dil" ? lang === o.kod : currency === o.kod;
            return (
              <button
                key={o.kod}
                type="button"
                className={s.secenek}
                aria-pressed={secili}
                onClick={() => sec(() => (sekme === "dil" ? setLang(o.kod) : setCurrency(o.kod)))}
              >
                <b>{o.ad}</b>
                <span>{o.alt}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function DunyaDugmesi({ className }: { className?: string }) {
  const [acik, setAcik] = React.useState(false);
  const [sekme, setSekme] = React.useState<"dil" | "para">("dil");
  const kapat = React.useCallback(() => setAcik(false), []);
  return (
    <>
      <button type="button" className={`${s.yuvarlak} ${className ?? ""}`} onClick={() => setAcik(true)} aria-haspopup="dialog" aria-label="Dil ve para birimi">
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
  const { acik, setAcik, kok } = useAcilir<HTMLDivElement>();
  const { data: oturum } = useSession();
  const giris = useGiris();
  const kapat = () => setAcik(false);
  return (
    <div className={s.menuKok} ref={kok}>
      <button type="button" className={s.menuDugme} aria-expanded={acik} aria-haspopup="true" onClick={() => setAcik((a) => !a)} aria-label="Menü">
        <Ikon ad="menu" boyut={18} />
        <span className={s.avatar}>
          {oturum?.user?.name ? oturum.user.name.trim()[0]?.toLocaleUpperCase("tr") : <Ikon ad="user" boyut={18} />}
        </span>
      </button>
      <nav className={s.acilir} data-acik={acik || undefined} aria-label="Hesap menüsü">
        {oturum ? (
          <>
            <span className={s.merhaba}>Merhaba, {oturum.user?.name?.split(" ")[0] ?? "hoş geldin"}</span>
            {oturum.user?.role === "AGENCY" ? (
              // Acente hesabının "hesabı" Partner paneli: taslaktaki menüyle aynı maddeler.
              <>
                <MenuBag href="/agency/dashboard" kalin onClick={kapat}>Partner paneli</MenuBag>
                <MenuBag href="/agency/reservations" onClick={kapat}>Rezervasyonlar</MenuBag>
                <MenuBag href="/agency/kazanclar" onClick={kapat}>Kazançlar</MenuBag>
                <MenuBag href="/agency/company" onClick={kapat}>Şirket bilgileri</MenuBag>
              </>
            ) : oturum.user?.role === "ADMIN" ? (
              <MenuBag href="/admin" kalin onClick={kapat}>Yönetim paneli</MenuBag>
            ) : (
              <>
                <MenuBag href="/profile" kalin onClick={kapat}>Hesabım</MenuBag>
                <MenuBag href="/reservations" onClick={kapat}>Rezervasyonlarım</MenuBag>
              </>
            )}
            <hr />
            <MenuBag href="/yardim" onClick={kapat}>Yardım merkezi</MenuBag>
            <button type="button" onClick={() => signOut({ callbackUrl: oturum.user?.role === "AGENCY" ? "/agency/login" : "/" })}>Çıkış yap</button>
          </>
        ) : (
          <>
            <button type="button" className={s.kalin} onClick={() => { kapat(); giris.ac(); }}>Giriş yap ya da üye ol</button>
            <hr />
            <Link href="/agency/login" onClick={kapat} className={s.acente}>
              <span>
                <b>Acente girişi</b>
                <small>Acentenize özel fiyatlar ve komisyonla rezervasyon</small>
              </span>
              <Nesne ad="anahtar-karti" boyut={52} />
            </Link>
            <hr />
            <MenuBag href="/reservations" onClick={kapat}>Rezervasyonumu bul</MenuBag>
            <MenuBag href="/yardim" onClick={kapat}>Yardım merkezi</MenuBag>
          </>
        )}
      </nav>
    </div>
  );
}
