"use client";

// Site altı (Airbnb'deki gibi): tatil fikirleri sekmeleri, bağlantı sütunları,
// alt şerit.

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Ikon } from "./ikon";
import { useLocale } from "@/components/providers/locale-provider";
import { BolgePenceresi } from "./ust-araclar";
import s from "./alt-bilgi.module.css";

// Sekme ve otel türü adları metin dosyasında: ust.altBilgi.sekme.* ve
// ust.altBilgi.tur.*. Yer adları aramaya da gittiği için olduğu gibi;
// İngilizcede yalnız yerleşik karşılığı olan farklı yazılır.
type Sekme = "populer" | "deniz" | "termal" | "kayak" | "sehir";
type Tur = "deniz" | "herSeyDahil" | "magara" | "sehir" | "butik" | "golf" | "kayak" | "termal" | "tas" | "golKenari";
const ayniTur = (tur: Tur, yerler: string[]) => yerler.map((a): [string, Tur] => [a, tur]);

const FIKIR: Record<Sekme, [string, Tur][]> = {
  populer: [
    ["Bodrum", "deniz"], ["Antalya", "herSeyDahil"], ["Kapadokya", "magara"], ["İstanbul", "sehir"],
    ["Fethiye", "deniz"], ["Marmaris", "deniz"], ["Çeşme", "butik"], ["Kuşadası", "deniz"],
    ["Alanya", "herSeyDahil"], ["Side", "herSeyDahil"], ["Belek", "golf"], ["Kemer", "deniz"],
    ["Uludağ", "kayak"], ["Afyonkarahisar", "termal"], ["Kaş", "butik"], ["Ayvalık", "tas"], ["Sapanca", "golKenari"],
  ],
  deniz: ayniTur("deniz", ["Bodrum", "Antalya", "Fethiye", "Marmaris", "Çeşme", "Kuşadası", "Alanya", "Side", "Kemer", "Didim", "Kaş", "Dalyan", "Datça", "Ayvalık", "Akyaka", "Göcek"]),
  termal: ayniTur("termal", ["Afyonkarahisar", "Pamukkale", "Yalova", "Kızılcahamam", "Sandıklı", "Bursa", "Kozaklı", "Gönen", "Haymana", "Balçova", "Bolu", "Sındırgı"]),
  kayak: ayniTur("kayak", ["Uludağ", "Palandöken", "Kartalkaya", "Kartepe", "Erciyes", "Sarıkamış", "Davraz", "Ilgaz"]),
  sehir: ayniTur("sehir", ["İstanbul", "Ankara", "İzmir", "Bursa", "Eskişehir", "Gaziantep", "Trabzon", "Konya", "Mardin", "Antakya", "Adana", "Samsun"]),
};
const ILK = 11;
const INGILIZCE_AD: Record<string, string> = { Kapadokya: "Cappadocia" };

export function AltBilgi() {
  const t = useTranslations("ust.altBilgi");
  const tk = useTranslations("ortak");
  const [sekme, setSekme] = React.useState<Sekme>("populer");
  const [hepsi, setHepsi] = React.useState(false);
  const [pencere, setPencere] = React.useState<"dil" | "para" | null>(null);
  const { currency, lang } = useLocale();
  const kapat = React.useCallback(() => setPencere(null), []);
  const liste = FIKIR[sekme];
  const gosterilen = hepsi ? liste : liste.slice(0, ILK);

  return (
    <footer className={`lb ${s.alt}`}>
      <div className={s.dis}>
        <section aria-labelledby="fikir-baslik">
          <h2 id="fikir-baslik" className={s.baslik}>{t("fikirler")}</h2>
          <div className={s.sekmeler} role="tablist" aria-label={t("tatilTuru")}>
            {(Object.keys(FIKIR) as Sekme[]).map((k) => (
              <button key={k} type="button" role="tab" aria-selected={sekme === k} className={s.sekme} onClick={() => { setSekme(k); setHepsi(false); }}>
                {t(`sekme.${k}`)}
              </button>
            ))}
          </div>
          <ul className={s.liste} key={sekme}>
            {gosterilen.map(([ad, tur], i) => (
              <li key={ad} style={{ "--s": i } as React.CSSProperties}>
                <Link href={`/search?destination=${encodeURIComponent(ad)}`}>
                  <b>{lang === "en" ? (INGILIZCE_AD[ad] ?? ad) : ad}</b>
                  <span>{t(`tur.${tur}`)}</span>
                </Link>
              </li>
            ))}
            {liste.length > gosterilen.length && (
              <li style={{ "--s": gosterilen.length } as React.CSSProperties}>
                <button type="button" className={s.daha} onClick={() => setHepsi(true)}>
                  {tk("dahaFazla")} <Ikon ad="chevron-down" boyut={16} kalinlik={2.2} />
                </button>
              </li>
            )}
          </ul>
        </section>

        <div className={s.sutunlar}>
          <section>
            <h3>{t("destek")}</h3>
            <ul>
              <li><Link href="/yardim">{t("yardimMerkezi")}</Link></li>
              <li><Link href="/reservations">{t("rezervasyonumuBul")}</Link></li>
              <li><Link href="/yardim">{t("iptalIade")}</Link></li>
            </ul>
          </section>
          <section>
            <h3>{t("acenteler")}</h3>
            <ul>
              <li><Link href="/agency/login">{t("acenteGirisi")}</Link></li>
            </ul>
          </section>
          <section>
            <h3>LookBeds</h3>
            <ul>
              <li><Link href="/kampanyalar">{t("kampanyalar")}</Link></li>
              <li><Link href="/login">{t("girisYap")}</Link></li>
            </ul>
          </section>
        </div>

        <div className={s.taban}>
          <p>
            © {new Date().getFullYear()} LookBeds <span>·</span> <Link href="/yardim">{t("gizlilik")}</Link> <span>·</span>{" "}
            <Link href="/yardim">{t("kosullar")}</Link> <span>·</span> <Link href="/yardim">{t("kvkk")}</Link>
          </p>
          <p className={s.tabanSag}>
            <button type="button" onClick={() => setPencere("dil")}>
              <Ikon ad="globe" boyut={16} kalinlik={2} /> {t("dil")}
            </button>
            <button type="button" onClick={() => setPencere("para")}>
              {{ TRY: "₺", USD: "$", EUR: "€", GBP: "£" }[currency] ?? ""} {currency}
            </button>
          </p>
        </div>
      </div>
      <BolgePenceresi acik={pencere !== null} sekme={pencere ?? "dil"} onSekme={(k) => setPencere(k)} onKapat={kapat} />
    </footer>
  );
}
