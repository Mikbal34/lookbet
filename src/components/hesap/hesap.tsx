"use client";

// Hesap (Airbnb "Hesap" sayfası gibi): üstte ad ve e-posta, altında nesneli
// kartlar — kişisel bilgiler, giriş ve güvenlik, rezervasyonlar, favoriler,
// dil ve para birimi, yardım. En altta çıkış.

import * as React from "react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { Ikon } from "@/components/lb/ikon";
import { Nesne, type NesneAdi } from "@/components/lb/nesne";
import { BolgePenceresi } from "@/components/lb/ust-araclar";
import { useFavoriler } from "@/components/lb/favoriler";
import { AYLAR } from "@/components/lb/arama/durum";
import { CURRENCIES, LANGUAGES, useLocale } from "@/components/providers/locale-provider";
import { HesapKabugu } from "./kabuk";
import { useProfil } from "./veri";
import s from "./hesap.module.css";

export function Hesap() {
  const { status } = useSession();
  const profil = useProfil(status === "authenticated");
  const { fav } = useFavoriler();
  const { lang, currency } = useLocale();
  const [bolge, setBolge] = React.useState(false);
  const [sekme, setSekme] = React.useState<"dil" | "para">("dil");

  const p = profil.data;
  const uye = p ? new Date(p.createdAt) : null;
  const dil = LANGUAGES.find((l) => l.code === lang)?.label ?? "Türkçe";
  const para = CURRENCIES.find((c) => c.code === currency)?.code ?? currency;

  const KARTLAR: { nesne: NesneAdi; baslik: string; aciklama: string; href?: string; tik?: () => void }[] = [
    { nesne: "pasaport", baslik: "Kişisel bilgiler", aciklama: "Ad, telefon, doğum tarihi, uyruk ve kayıtlı misafirler", href: "/profile/kisisel" },
    { nesne: "kilit", baslik: "Giriş ve güvenlik", aciklama: "Giriş yöntemin ve hesabın", href: "/profile/guvenlik" },
    { nesne: "bavul", baslik: "Rezervasyonlarım", aciklama: "Yaklaşan ve geçmiş konaklamaların", href: "/reservations" },
    { nesne: "kartpostal", baslik: "Favoriler", aciklama: fav.size ? `Kalbe bastığın ${fav.size} otel` : "Kalbe bastığın oteller", href: "/favoriler" },
    { nesne: "sehir", baslik: "Dil ve para birimi", aciklama: `${dil} · ${para}`, tik: () => setBolge(true) },
    { nesne: "zil", baslik: "Yardım merkezi", aciklama: "Sık sorulanlar ve destek", href: "/yardim" },
  ];

  return (
    <HesapKabugu>
      <div className={s.hesapBas}>
        <span className={s.buyukAvatar}>{p?.name?.trim()[0]?.toLocaleUpperCase("tr") ?? ""}</span>
        <div>
          <h1 className="lb-y">Hesap</h1>
          <p>
            {p ? (
              <>
                <b>{p.name}</b>, {p.email}
                {uye && <span className={s.uye}> · {AYLAR[uye.getMonth()]} {uye.getFullYear()}&apos;den beri üye</span>}
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
          Çıkış yap
        </button>
      </div>
      <BolgePenceresi acik={bolge} sekme={sekme} onSekme={setSekme} onKapat={() => setBolge(false)} />
    </HesapKabugu>
  );
}
