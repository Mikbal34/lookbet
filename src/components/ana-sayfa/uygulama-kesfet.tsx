"use client";

// Uygulamada ana sayfa (Keşfet, Airbnb uygulaması gibi): büyük açılış yok;
// üstte arama hapı ve kategoriler yapışık, altta kampanyalar ve bölge
// satırları. Logo uygulamanın açılış ekranında.

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { UstCubuk } from "@/components/lb/ust-cubuk";
import { Nesne } from "@/components/lb/nesne";
import { aramaAdresi, BOS_ARAMA, iso, type AramaDegeri } from "@/components/lb/arama/durum";
import { useFavoriler } from "@/components/lb/favoriler";
import type { VitrinKampanya } from "@/components/kampanya/ortak";
import type { AnaSayfaSatiri } from "@/lib/ana-sayfa";
import { KATEGORILER, type KategoriKodu } from "@/lib/ana-sayfa-kategoriler";
import { Kampanyalar, Satir } from "./ana-sayfa";
import s from "./ana-sayfa.module.css";

export function UygulamaKesfet({ satirlar, kampanyalar = [] }: { satirlar: AnaSayfaSatiri[]; kampanyalar?: VitrinKampanya[] }) {
  const t = useTranslations("anaSayfa");
  const router = useRouter();
  const [kategori, setKategori] = React.useState<KategoriKodu>("hepsi");
  const [deger, setDeger] = React.useState<AramaDegeri>(BOS_ARAMA);
  const { fav, degistir } = useFavoriler();

  const secili = KATEGORILER.find((k) => k.kod === kategori)!;
  const gosterilen = satirlar.filter((r) => r.kategoriler.includes(kategori));
  const aramaEki = deger.giris && deger.cikis ? `&checkIn=${iso(deger.giris)}&checkOut=${iso(deger.cikis)}&adults=${deger.yetiskin}` : "";

  const kategoriler = (
    <div className={s.uygKategoriler} role="tablist" aria-label={t("tatilTuru")}>
      {KATEGORILER.map((k) => (
        <button key={k.kod} type="button" role="tab" aria-selected={kategori === k.kod} onClick={() => setKategori(k.kod)}>
          <Nesne ad={k.nesne} boyut={40} />
          <span>{t(`kategori.${k.kod}`)}</span>
        </button>
      ))}
    </div>
  );

  return (
    <div className={`lb ${s.sayfa}`}>
      <UstCubuk deger={deger} onDegis={setDeger} onAra={() => router.push(aramaAdresi(deger))} nesne={secili.nesne} alt={kategoriler} />
      <main className={`${s.oteller} ${s.uygOteller}`} key={kategori}>
        {kategori === KATEGORILER[0].kod && kampanyalar.length > 0 && <Kampanyalar kampanyalar={kampanyalar} />}
        {gosterilen.length ? (
          gosterilen.map((r) => <Satir key={r.kod} satir={r} aramaEki={aramaEki} fav={fav} onFav={degistir} />)
        ) : (
          <div className={s.bos}>
            <Nesne ad="zil" boyut={96} />
            <p>{t("bos")}</p>
          </div>
        )}
      </main>
    </div>
  );
}
