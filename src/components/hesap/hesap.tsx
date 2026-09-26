"use client";

// Hesap (Airbnb "Hesap" sayfası gibi): üstte ad ve e-posta, altında nesneli
// kartlar — kişisel bilgiler, giriş ve güvenlik, rezervasyonlar, favoriler,
// dil ve para birimi, yardım. En altta çıkış.

import * as React from "react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Ikon } from "@/components/lb/ikon";
import { Nesne, type NesneAdi } from "@/components/lb/nesne";
import { BolgePenceresi } from "@/components/lb/ust-araclar";
import { useFavoriler } from "@/components/lb/favoriler";
import { CURRENCIES, LANGUAGES, useLocale } from "@/components/providers/locale-provider";
import { useBicim } from "@/i18n/use-bicim";
import { HesapKabugu } from "./kabuk";
import { useProfil } from "./veri";
import s from "./hesap.module.css";

export function Hesap() {
  const t = useTranslations("hesap");
  const b = useBicim();
  const { status } = useSession();
  const profil = useProfil(status === "authenticated");
  const { fav } = useFavoriler();
  const { lang, currency } = useLocale();
  const [bolge, setBolge] = React.useState(false);
  const [sekme, setSekme] = React.useState<"dil" | "para">("dil");

  const p = profil.data;
  const uye = p ? new Date(p.createdAt) : null;
  const dil = LANGUAGES.find((l) => l.code === lang)?.label ?? LANGUAGES[0].label;
  const para = CURRENCIES.find((c) => c.code === currency)?.code ?? currency;

  const KARTLAR: { nesne: NesneAdi; baslik: string; aciklama: string; href?: string; tik?: () => void }[] = [
    { nesne: "pasaport", baslik: t("kisisel.baslik"), aciklama: t("ana.kisiselAciklama"), href: "/profile/kisisel" },
    { nesne: "kilit", baslik: t("guvenlik.baslik"), aciklama: t("ana.guvenlikAciklama"), href: "/profile/guvenlik" },
    { nesne: "bavul", baslik: t("ana.rezervasyonlar"), aciklama: t("ana.rezervasyonlarAciklama"), href: "/reservations" },
    { nesne: "kartpostal", baslik: t("favoriler.baslik"), aciklama: fav.size ? t("ana.favorilerSayili", { sayi: fav.size }) : t("ana.favorilerAciklama"), href: "/favoriler" },
    { nesne: "sehir", baslik: t("ana.bolge"), aciklama: `${dil} · ${para}`, tik: () => setBolge(true) },
    { nesne: "zil", baslik: t("ana.yardim"), aciklama: t("ana.yardimAciklama"), href: "/yardim" },
  ];

  return (
    <HesapKabugu>
      <div className={s.hesapBas}>
        <span className={s.buyukAvatar}>{p?.name?.trim()[0]?.toLocaleUpperCase(lang) ?? ""}</span>
        <div>
          <h1 className="lb-y">{t("ana.baslik")}</h1>
          <p>
            {p ? (
              <>
                <b>{p.name}</b>, {p.email}
                {uye && <span className={s.uye}> · {t("ana.uyeTarihi", { tarih: b.ayYil(uye) })}</span>}
              </>
            ) : (
              " "
            )}
          </p>
        </div>
      </div>
      <div className={s.izgara}>
        {KARTLAR.map((k) =>
          k.href ? (
            <Link key={k.baslik} href={k.href} className={s.kart}>
              <Nesne ad={k.nesne} boyut={52} />
              <b>{k.baslik}</b>
              <span>{k.aciklama}</span>
            </Link>
          ) : (
            <button key={k.baslik} type="button" className={s.kart} onClick={k.tik}>
              <Nesne ad={k.nesne} boyut={52} />
              <b>{k.baslik}</b>
              <span>{k.aciklama}</span>
            </button>
          )
        )}
      </div>
      <div className={s.hesapAlt}>
        <button type="button" className={s.metinDugme} onClick={() => signOut({ callbackUrl: "/" })}>
          <Ikon ad="logout" boyut={16} kalinlik={2.1} />
          {t("ana.cikis")}
        </button>
      </div>
      <BolgePenceresi acik={bolge} sekme={sekme} onSekme={setSekme} onKapat={() => setBolge(false)} />
    </HesapKabugu>
  );
}
