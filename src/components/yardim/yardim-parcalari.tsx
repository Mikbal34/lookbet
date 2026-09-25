"use client";

// Yardım merkezinin ortak parçaları: üst çubuk, iletişim şeridi, makale geri
// bildirimi.

import * as React from "react";
import Link from "next/link";
import { Ikon } from "@/components/lb/ikon";
import { Nesne } from "@/components/lb/nesne";
import { DunyaDugmesi, MenuDugmesi } from "@/components/lb/ust-araclar";
import { DESTEK } from "./makaleler";
import s from "./yardim.module.css";

export function YardimCubugu({ araGoster }: { araGoster?: boolean }) {
  return (
    <header className={s.ust}>
      <div className={s.ustIc}>
        <div className={s.marka}>
          <Link href="/" className="lb-y">LookBeds</Link>
          <Link href="/yardim" className={s.markaAlt}>Yardım Merkezi</Link>
        </div>
        {araGoster && (
          <Link href="/yardim#ara" className={s.ustAra}>
            <Ikon ad="search" boyut={18} />
            Yardım ara
          </Link>
        )}
        <div className={s.ustSag}>
          <DunyaDugmesi />
          <MenuDugmesi />
        </div>
      </div>
    </header>
  );
}

export function IletisimSeridi() {
  return (
    <section className={s.iletisim} aria-label="Bize ulaş">
      <Nesne ad="zil" boyut={64} />
      <div>
        <b>Aradığını bulamadın mı?</b>
        <span>Destek ekibimize yaz ya da ara; rezervasyon numaranı hazır tut.</span>
      </div>
      <div className={s.iletisimYollar}>
        <a className={s.dugme} href={`mailto:${DESTEK.eposta}`}>
          <Ikon ad="mail" boyut={18} />
          {DESTEK.eposta}
        </a>
        <a className={`${s.dugme} ${s.koyu}`} href={DESTEK.telefonHref}>
          <Ikon ad="phone" boyut={18} />
          {DESTEK.telefon}
        </a>
      </div>
    </section>
  );
}

/** "Bu makale işine yaradı mı?" — şimdilik yalnız ekranda teşekkür eder, kaydedilmez. */
export function Geribildirim() {
  const [cevap, setCevap] = React.useState<null | boolean>(null);
  if (cevap !== null) {
    return (
      <div className={s.isine}>
        {cevap ? (
          <span className={s.tesekkur}><Ikon ad="check" boyut={18} kalinlik={2.2} />Teşekkürler!</span>
        ) : (
          <span className={s.soluk}>Üzgünüz. Destek ekibine yazarsan yardımcı olalım.</span>
        )}
      </div>
    );
  }
  return (
    <div className={s.isine}>
      <b>Bu makale işine yaradı mı?</b>
      <button type="button" onClick={() => setCevap(true)}><Ikon ad="thumbs-up" boyut={18} />Evet</button>
      <button type="button" onClick={() => setCevap(false)}><Ikon ad="thumbs-down" boyut={18} />Hayır</button>
    </div>
  );
}
