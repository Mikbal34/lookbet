"use client";

// Hesap sayfalarının kabuğu: üst çubuk, alt bilgi ve oturum denetimi.
// Girişsizse giriş penceresini önerir; acente ve yönetici kendi paneline gider.

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { UstCubuk } from "@/components/lb/ust-cubuk";
import { AltBilgi } from "@/components/lb/alt-bilgi";
import { Ikon } from "@/components/lb/ikon";
import { Nesne } from "@/components/lb/nesne";
import { BOS_ARAMA, aramaAdresi } from "@/components/lb/arama/durum";
import { useGiris } from "@/components/lb/giris/giris-saglayici";
import { BolgePenceresi } from "@/components/lb/ust-araclar";
import { useUygulama } from "@/components/lb/uygulama";
import { CURRENCIES, LANGUAGES, useLocale } from "@/components/providers/locale-provider";
import s from "./hesap.module.css";

/** Uygulamada girişsiz Profil sekmesi: alt bilgi olmadığı için dil, para birimi ve yardım da burada. */
function GirissizAyarlar() {
  const t = useTranslations("hesap");
  const { lang, currency } = useLocale();
  const [bolge, setBolge] = React.useState(false);
  const [sekme, setSekme] = React.useState<"dil" | "para">("dil");
  const dil = LANGUAGES.find((l) => l.code === lang)?.label ?? LANGUAGES[0].label;
  const para = CURRENCIES.find((c) => c.code === currency)?.code ?? currency;
  return (
    <>
      <div className={s.izgara}>
        <button type="button" className={s.kart} onClick={() => setBolge(true)}>
          <Nesne ad="sehir" boyut={52} />
          <b>{t("ana.bolge")}</b>
          <span>{dil} · {para}</span>
        </button>
        <Link href="/yardim" className={s.kart}>
          <Nesne ad="zil" boyut={52} />
          <b>{t("ana.yardim")}</b>
          <span>{t("ana.yardimAciklama")}</span>
        </Link>
      </div>
      <BolgePenceresi acik={bolge} sekme={sekme} onSekme={setSekme} onKapat={() => setBolge(false)} />
    </>
  );
}

export function HesapKabugu({ kirinti, herkeseAcik, children }: {
  /** Alt sayfalarda "Hesap › …" yolu. */
  kirinti?: string;
  /** Favoriler gibi girişsiz de açılan sayfalar. */
  herkeseAcik?: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const t = useTranslations("hesap");
  const { data: oturum, status } = useSession();
  const giris = useGiris();
  const uygulama = useUygulama();
  const [arama, setArama] = React.useState(BOS_ARAMA);
  const rol = oturum?.user?.role;
  const panel = herkeseAcik ? null : rol === "AGENCY" ? "/agency/company" : rol === "ADMIN" ? "/admin" : null;
  React.useEffect(() => {
    if (panel) router.replace(panel);
  }, [panel, router]);

  let govde: React.ReactNode = children;
  if (herkeseAcik) {
    govde = children;
  } else if (status === "loading" || panel) {
    govde = <div className={s.iskelet} aria-busy="true" aria-label={t("kabuk.yukleniyor")} />;
  } else if (status === "unauthenticated") {
    govde = (
      <>
        <div className={`${s.bos} ${uygulama ? s.bosUygulama : ""}`}>
          <Nesne ad="kapi" boyut={110} />
          <h1 className="lb-y">{t("kabuk.girisBaslik")}</h1>
          <p>{t("kabuk.girisMetin")}</p>
          <button type="button" className={`${s.dugme} ${s.turuncu}`} onClick={() => giris.ac()}>{t("kabuk.girisDugme")}</button>
        </div>
        {uygulama && <GirissizAyarlar />}
      </>
    );
  }

  return (
    <div className={`lb ${s.sayfa}`}>
      <UstCubuk deger={arama} onDegis={setArama} onAra={() => router.push(aramaAdresi(arama))} />
      <main className={s.dis}>
        {kirinti && status === "authenticated" && !panel && rol === "CUSTOMER" && (
          <nav className={s.kirinti} aria-label={t("kabuk.kirinti")}>
            <Link href="/profile">{t("ana.baslik")}</Link>
            <Ikon ad="chevron-right" boyut={14} />
            <span>{kirinti}</span>
          </nav>
        )}
        {govde}
      </main>
      <AltBilgi />
    </div>
  );
}
