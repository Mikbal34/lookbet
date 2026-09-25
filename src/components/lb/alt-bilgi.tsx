"use client";

// Site altı (Airbnb'deki gibi): tatil fikirleri sekmeleri, bağlantı sütunları,
// alt şerit.

import * as React from "react";
import Link from "next/link";
import { Ikon } from "./ikon";
import { useLocale } from "@/components/providers/locale-provider";
import { BolgePenceresi } from "./ust-araclar";
import s from "./alt-bilgi.module.css";

const FIKIR: Record<string, { ad: string; liste: [string, string][] }> = {
  populer: {
    ad: "Popüler",
    liste: [
      ["Bodrum", "Deniz otelleri"], ["Antalya", "Her şey dahil oteller"], ["Kapadokya", "Mağara oteller"], ["İstanbul", "Şehir otelleri"],
      ["Fethiye", "Deniz otelleri"], ["Marmaris", "Deniz otelleri"], ["Çeşme", "Butik oteller"], ["Kuşadası", "Deniz otelleri"],
      ["Alanya", "Her şey dahil oteller"], ["Side", "Her şey dahil oteller"], ["Belek", "Golf ve tatil köyleri"], ["Kemer", "Deniz otelleri"],
      ["Uludağ", "Kayak otelleri"], ["Afyonkarahisar", "Termal oteller"], ["Kaş", "Butik oteller"], ["Ayvalık", "Taş oteller"], ["Sapanca", "Göl kenarı oteller"],
    ],
  },
  deniz: { ad: "Deniz", liste: ["Bodrum", "Antalya", "Fethiye", "Marmaris", "Çeşme", "Kuşadası", "Alanya", "Side", "Kemer", "Didim", "Kaş", "Dalyan", "Datça", "Ayvalık", "Akyaka", "Göcek"].map((a) => [a, "Deniz otelleri"]) },
  termal: { ad: "Termal", liste: ["Afyonkarahisar", "Pamukkale", "Yalova", "Kızılcahamam", "Sandıklı", "Bursa", "Kozaklı", "Gönen", "Haymana", "Balçova", "Bolu", "Sındırgı"].map((a) => [a, "Termal oteller"]) },
  kayak: { ad: "Kayak", liste: ["Uludağ", "Palandöken", "Kartalkaya", "Kartepe", "Erciyes", "Sarıkamış", "Davraz", "Ilgaz"].map((a) => [a, "Kayak otelleri"]) },
  sehir: { ad: "Şehir", liste: ["İstanbul", "Ankara", "İzmir", "Bursa", "Eskişehir", "Gaziantep", "Trabzon", "Konya", "Mardin", "Antakya", "Adana", "Samsun"].map((a) => [a, "Şehir otelleri"]) },
};
const ILK = 11;

export function AltBilgi() {
  const [sekme, setSekme] = React.useState("populer");
  const [hepsi, setHepsi] = React.useState(false);
  const [pencere, setPencere] = React.useState<"dil" | "para" | null>(null);
  const { lang, currency } = useLocale();
  const kapat = React.useCallback(() => setPencere(null), []);
  const liste = FIKIR[sekme].liste;
  const gosterilen = hepsi ? liste : liste.slice(0, ILK);

  return (
    <footer className={`lb ${s.alt}`}>
      <div className={s.dis}>
        <section aria-labelledby="fikir-baslik">
          <h2 id="fikir-baslik" className={s.baslik}>Sonraki tatilin için fikirler</h2>
          <div className={s.sekmeler} role="tablist" aria-label="Tatil türü">
            {Object.entries(FIKIR).map(([k, v]) => (
              <button key={k} type="button" role="tab" aria-selected={sekme === k} className={s.sekme} onClick={() => { setSekme(k); setHepsi(false); }}>
                {v.ad}
              </button>
            ))}
          </div>
          <ul className={s.liste} key={sekme}>
            {gosterilen.map(([ad, tur], i) => (
              <li key={ad} style={{ "--s": i } as React.CSSProperties}>
                <Link href={`/search?destination=${encodeURIComponent(ad)}`}>
                  <b>{ad}</b>
                  <span>{tur}</span>
                </Link>
              </li>
            ))}
            {liste.length > gosterilen.length && (
              <li style={{ "--s": gosterilen.length } as React.CSSProperties}>
                <button type="button" className={s.daha} onClick={() => setHepsi(true)}>
                  Daha fazla göster <Ikon ad="chevron-down" boyut={16} kalinlik={2.2} />
                </button>
              </li>
            )}
          </ul>
        </section>

        <div className={s.sutunlar}>
          <section>
            <h3>Destek</h3>
            <ul>
              <li><Link href="/yardim">Yardım merkezi</Link></li>
              <li><Link href="/reservations">Rezervasyonumu bul</Link></li>
              <li><Link href="/yardim">İptal ve iade seçenekleri</Link></li>
            </ul>
          </section>
          <section>
            <h3>Acenteler</h3>
            <ul>
              <li><Link href="/agency/login">Acente girişi</Link></li>
            </ul>
          </section>
          <section>
            <h3>LookBeds</h3>
            <ul>
              <li><Link href="/kampanyalar">Kampanyalar</Link></li>
              <li><Link href="/login">Giriş yap ya da üye ol</Link></li>
            </ul>
          </section>
        </div>

        <div className={s.taban}>
          <p>
            © {new Date().getFullYear()} LookBeds <span>·</span> <Link href="/yardim">Gizlilik</Link> <span>·</span>{" "}
            <Link href="/yardim">Kullanım koşulları</Link> <span>·</span> <Link href="/yardim">KVKK</Link>
          </p>
          <p className={s.tabanSag}>
            <button type="button" onClick={() => setPencere("dil")}>
              <Ikon ad="globe" boyut={16} kalinlik={2} /> {lang === "en" ? "English (US)" : "Türkçe (TR)"}
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
