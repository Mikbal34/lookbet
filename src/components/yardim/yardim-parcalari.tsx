"use client";

// Yardım merkezinin ortak parçaları: üst çubuk, iletişim şeridi, makale geri
// bildirimi.

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Ikon } from "@/components/lb/ikon";
import { Nesne } from "@/components/lb/nesne";
import { DunyaDugmesi, MenuDugmesi } from "@/components/lb/ust-araclar";
import { DESTEK } from "./makaleler";
import s from "./yardim.module.css";

export function YardimCubugu({ araGoster }: { araGoster?: boolean }) {
  const t = useTranslations("yardim");
  return (
    <header className={s.ust}>
      <div className={s.ustIc}>
        <div className={s.marka}>
          <Link href="/" className="lb-y">LookBeds</Link>
          <Link href="/yardim" className={s.markaAlt}>{t("yardimMerkezi")}</Link>
        </div>
        {araGoster && (
          <Link href="/yardim#ara" className={s.ustAra}>
            <Ikon ad="search" boyut={18} />
            {t("yardimAra")}
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
  const t = useTranslations("yardim.iletisim");
  return (
    <section className={s.iletisim} aria-label={t("etiket")}>
      <Nesne ad="zil" boyut={64} />
      <div>
        <b>{t("baslik")}</b>
        <span>{t("metin")}</span>
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
  const t = useTranslations("yardim.geribildirim");
  const [cevap, setCevap] = React.useState<null | boolean>(null);
  if (cevap !== null) {
    return (
      <div className={s.isine}>
        {cevap ? (
          <span className={s.tesekkur}><Ikon ad="check" boyut={18} kalinlik={2.2} />{t("tesekkur")}</span>
        ) : (
          <span className={s.soluk}>{t("uzgunuz")}</span>
        )}
      </div>
    );
  }
  return (
    <div className={s.isine}>
      <b>{t("soru")}</b>
      <button type="button" onClick={() => setCevap(true)}><Ikon ad="thumbs-up" boyut={18} />{t("evet")}</button>
      <button type="button" onClick={() => setCevap(false)}><Ikon ad="thumbs-down" boyut={18} />{t("hayir")}</button>
    </div>
  );
}
