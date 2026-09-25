"use client";

// LookBeds Partner üst çubuğu (Airbnb ev sahibi paneli gibi): solda marka,
// ortada Bugün · Rezervasyonlar · Kazançlar, sağda "Otel ara" ve hesap menüsü.
// Mobilde sekmeler ekranın altına iner.

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Ikon } from "@/components/lb/ikon";
import s from "./partner.module.css";

const SEKMELER = [
  { href: "/agency/dashboard", ad: "Bugün" },
  { href: "/agency/reservations", ad: "Rezervasyonlar" },
  { href: "/agency/kazanclar", ad: "Kazançlar" },
];

export function PartnerCubugu() {
  const yol = usePathname();
  const { data: oturum } = useSession();
  const [acik, setAcik] = React.useState(false);
  const kok = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!acik) return;
    const dis = (e: PointerEvent) => !kok.current?.contains(e.target as Node) && setAcik(false);
    const tus = (e: KeyboardEvent) => e.key === "Escape" && setAcik(false);
    document.addEventListener("pointerdown", dis);
    document.addEventListener("keydown", tus);
    return () => {
      document.removeEventListener("pointerdown", dis);
      document.removeEventListener("keydown", tus);
    };
  }, [acik]);

  const ad = oturum?.user?.name ?? "";
  const bas = ad
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toLocaleUpperCase("tr"))
    .join("");
  const kapat = () => setAcik(false);

  return (
    <header className={s.ust}>
      <div className={s.ustIc}>
        <Link href="/agency/dashboard" className={s.marka}>
          <span className="lb-y">LookBeds</span>
          <small>Partner</small>
        </Link>
        <nav className={s.sekmeler} aria-label="Panel">
          {SEKMELER.map((k) => (
            <Link key={k.href} href={k.href} aria-current={yol?.startsWith(k.href) ? "page" : undefined}>
              {k.ad}
            </Link>
          ))}
        </nav>
        <div className={s.sag}>
          <Link href="/" className={s.araDugme}>
            <Ikon ad="search" boyut={16} kalinlik={2.6} />
            <span>Otel ara</span>
          </Link>
          <div className={s.menuKok} ref={kok}>
            <button type="button" className={s.menuDugme} aria-expanded={acik} aria-haspopup="true" onClick={() => setAcik((a) => !a)} aria-label="Hesap menüsü">
              <Ikon ad="menu" boyut={18} />
              <span className={s.avatar}>{bas || <Ikon ad="user" boyut={16} />}</span>
            </button>
            <nav className={s.acilir} data-acik={acik || undefined} aria-label="Hesap menüsü">
              <div className={s.kimlik}>
                <b>{ad || "Acente hesabı"}</b>
                <span>{oturum?.user?.email}</span>
              </div>
              <hr />
              <Link href="/agency/company" onClick={kapat}><Ikon ad="hotel" boyut={18} />Şirket bilgileri</Link>
              <Link href="/agency/kazanclar" onClick={kapat}><Ikon ad="wallet" boyut={18} />Kazançlar</Link>
              <Link href="/agency/reservations" onClick={kapat}><Ikon ad="calendar" boyut={18} />Rezervasyonlar</Link>
              <hr />
              <Link href="/yardim?kitle=acente" onClick={kapat}><Ikon ad="help" boyut={18} />Yardım ve destek</Link>
              <button type="button" onClick={() => signOut({ callbackUrl: "/agency/login" })}><Ikon ad="logout" boyut={18} />Çıkış yap</button>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}
