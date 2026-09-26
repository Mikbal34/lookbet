"use client";

// Yardım Merkezi ana sayfası (Airbnb yardım merkezi gibi): büyük arama (yazdıkça
// makaleleri süzer), Misafir / Acente sekmeleri, girişliyse sıradaki
// rezervasyonla ilgili kısayollar, nesneli "Başlarken" rehberleri ve konu
// çipli sık sorulanlar. Metinler "yardim" alanından; arama geçerli dilin
// makalelerinde, o dilin küçük harf kuralıyla yapılır.

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useMessages, useTranslations } from "next-intl";
import { AltBilgi } from "@/components/lb/alt-bilgi";
import { Ikon } from "@/components/lb/ikon";
import { Nesne } from "@/components/lb/nesne";
import { aralikYerel, durumBilgisi, gunYonelmeYerel, iptalDurumu, type Rezervasyon } from "@/components/rezervasyonlar/ortak";
import { useBicim } from "@/i18n/use-bicim";
import { REHBERLER, konular, makaleleriKur, type Kitle, type Konu, type Makale } from "./makaleler";
import { IletisimSeridi, YardimCubugu } from "./yardim-parcalari";
import s from "./yardim.module.css";

const kucuk = (x: string, dil: string) => x.toLocaleLowerCase(dil);
const simdiAl = () => Date.now();

/** Başlıkta geçen önce; metinde geçen sonra. */
function ara(makaleler: Makale[], q: string, dil: string): { m: Makale; parca: string }[] {
  const k = kucuk(q.trim(), dil);
  if (!k) return [];
  return makaleler.map((m) => {
    const baslikta = kucuk(m.baslik, dil).includes(k);
    const parca = m.metin.find((p) => kucuk(p, dil).includes(k));
    return { m, puan: (baslikta ? 2 : 0) + (parca ? 1 : 0), parca: parca ?? m.metin[0] };
  })
    .filter((x) => x.puan > 0)
    .sort((a, b) => b.puan - a.puan)
    .slice(0, 8);
}

function Vurgu({ metin, q, dil }: { metin: string; q: string; dil: string }) {
  const i = kucuk(metin, dil).indexOf(kucuk(q.trim(), dil));
  if (!q.trim() || i < 0) return <>{metin}</>;
  const n = q.trim().length;
  return (
    <>
      {metin.slice(0, i)}
      <mark>{metin.slice(i, i + n)}</mark>
      {metin.slice(i + n)}
    </>
  );
}

export function YardimAna() {
  const t = useTranslations("yardim");
  // Sıradaki rezervasyon satırı: durum adları ve "… kadar ücretsiz iptal" rezervasyon alanından.
  const tRez = useTranslations("rezervasyon");
  const bicim = useBicim();
  const metinler = useMessages().yardim.makale;
  const makaleler = React.useMemo(() => makaleleriKur(metinler), [metinler]);
  const router = useRouter();
  const p = useSearchParams();
  const kitle: Kitle = p.get("kitle") === "acente" ? "acente" : "misafir";
  const { data: oturum } = useSession();
  const [simdi] = React.useState(simdiAl);
  const [konu, setKonu] = React.useState<Konu | null>(null);
  const [q, setQ] = React.useState("");
  const [acikListe, setAcikListe] = React.useState(false);
  const [secili, setSecili] = React.useState(-1);
  const araKok = React.useRef<HTMLDivElement>(null);
  const girdi = React.useRef<HTMLInputElement>(null);

  const kitleKonulari = konular(kitle);
  const aktifKonu = konu && kitleKonulari.includes(konu) ? konu : kitleKonulari[0];
  const sonuc = React.useMemo(() => ara(makaleler, q, bicim.dil), [makaleler, q, bicim.dil]);

  // Üst çubuktaki "Yardım ara" buraya #ara ile gelir.
  React.useEffect(() => {
    if (location.hash === "#ara") girdi.current?.focus();
  }, []);
  React.useEffect(() => {
    if (!acikListe) return;
    const dis = (e: PointerEvent) => !araKok.current?.contains(e.target as Node) && setAcikListe(false);
    document.addEventListener("pointerdown", dis);
    return () => document.removeEventListener("pointerdown", dis);
  }, [acikListe]);

  // Girişli müşteriye sıradaki rezervasyonu göster.
  const musteri = oturum?.user?.role === "CUSTOMER";
  const rez = useQuery({
    queryKey: ["rezervasyonlar", "gelecek"],
    queryFn: async () => {
      const r = await fetch("/api/reservations?zaman=gelecek&limit=5");
      if (!r.ok) throw new Error("hata");
      return (await r.json()) as { data: Rezervasyon[] };
    },
    enabled: musteri && kitle === "misafir",
    staleTime: 60_000,
  });
  const siradaki = rez.data?.data[0] ?? null;
  const ad = oturum?.user?.name?.split(" ")[0];

  const kitleSec = (k: Kitle) => router.replace(k === "acente" ? "/yardim?kitle=acente" : "/yardim", { scroll: false });

  return (
    <div className={`lb ${s.sayfa}`}>
      <YardimCubugu />
      <main className={s.dis}>
        <section className={s.kahraman}>
          <h1 className="lb-y">{ad ? t("ana.merhabaAd", { ad }) : t("ana.merhaba")}</h1>
          <div className={s.araKap} ref={araKok} id="ara">
            <label className={s.ara}>
              <Ikon ad="search" boyut={20} />
              <input
                ref={girdi}
                type="search"
                role="combobox"
                aria-autocomplete="list"
                value={q}
                placeholder={t("ana.araYer")}
                aria-label={t("ana.araEtiket")}
                aria-expanded={acikListe && !!q.trim()}
                aria-controls="yardim-oneriler"
                autoComplete="off"
                onChange={(e) => {
                  setQ(e.target.value);
                  setAcikListe(true);
                  setSecili(-1);
                }}
                onFocus={() => setAcikListe(true)}
                onKeyDown={(e) => {
                  if (!sonuc.length) return;
                  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                    e.preventDefault();
                    setSecili((i) => (i + (e.key === "ArrowDown" ? 1 : -1) + sonuc.length) % sonuc.length);
                  }
                  if (e.key === "Enter") {
                    e.preventDefault();
                    router.push(`/yardim/${sonuc[Math.max(0, secili)].m.id}`);
                  }
                  if (e.key === "Escape") setAcikListe(false);
                }}
              />
              <i><Ikon ad="search" boyut={18} kalinlik={2.4} /></i>
            </label>
            {acikListe && q.trim() && (
              <div className={s.oneriler} id="yardim-oneriler" role="listbox">
                {sonuc.length ? (
                  sonuc.map(({ m, parca }, i) => (
                    <Link key={m.id} href={`/yardim/${m.id}`} role="option" aria-selected={i === secili}>
                      <b><Vurgu metin={m.baslik} q={q} dil={bicim.dil} /></b>
                      <span>
                        {t(`kitle.${m.kitle}`)} · <Vurgu metin={parca.length > 110 ? `${parca.slice(0, 110)}…` : parca} q={q} dil={bicim.dil} />
                      </span>
                    </Link>
                  ))
                ) : (
                  <div className={s.yok}>{t("ana.sonucYok", { q: q.trim() })}</div>
                )}
              </div>
            )}
          </div>
        </section>

        <nav className={s.sekmeler} aria-label={t("ana.kimIcin")}>
          {(["misafir", "acente"] as const).map((k) => (
            <button key={k} type="button" aria-current={kitle === k ? "page" : undefined} onClick={() => kitleSec(k)}>
              {t(`kitle.${k}`)}
            </button>
          ))}
        </nav>

        {kitle === "misafir" && siradaki && (
          <section className={s.bolum} aria-labelledby="rez-baslik">
            <h2 id="rez-baslik">{t("ana.rezBaslik")}</h2>
            <div className={s.rezKart}>
              <div>
                <b>{siradaki.hotelName ?? siradaki.hotelCode}</b>
                <span>
                  {[
                    aralikYerel(bicim, siradaki),
                    tRez(`durum.${durumBilgisi(siradaki, simdi).kod}`),
                    (() => {
                      const son = iptalDurumu(siradaki, simdi).ucretsizSon;
                      return son ? tRez("ucretsizIptal", { tarih: gunYonelmeYerel(bicim, son) }) : null;
                    })(),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </div>
              <div className={s.rezYollar}>
                <Link className={`${s.dugme} ${s.cerceve}`} href="/yardim/iptal">{t("ana.iptalEtmek")}</Link>
                <Link className={`${s.dugme} ${s.siyah}`} href={`/reservations/${siradaki.id}`}>{t("ana.ayrintilar")}</Link>
              </div>
            </div>
          </section>
        )}

        <section className={s.bolum} aria-labelledby="rehber-baslik">
          <h2 id="rehber-baslik">{t("ana.baslarken")}</h2>
          <div className={s.rehberler}>
            {REHBERLER[kitle].map((r) => (
              <Link key={r.makale} className={s.rehber} href={`/yardim/${r.makale}`}>
                <Nesne ad={r.nesne} boyut={56} />
                <b>{t(`rehber.${r.anahtar}.baslik`)}</b>
                <span>{t(`rehber.${r.anahtar}.aciklama`)}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className={s.bolum} aria-labelledby="sss-baslik">
          <h2 id="sss-baslik">{t("ana.sss")}</h2>
          <div className={s.cipler} role="group" aria-label={t("ana.konu")}>
            {kitleKonulari.map((k) => (
              <button key={k} type="button" className={s.cip} aria-pressed={k === aktifKonu} onClick={() => setKonu(k)}>{t(`konu.${k}`)}</button>
            ))}
          </div>
          <div className={s.makaleler}>
            {makaleler.filter((m) => m.kitle === kitle && m.konu === aktifKonu).map((m) => (
              <Link key={m.id} href={`/yardim/${m.id}`}>
                {m.baslik}
                <Ikon ad="chevron-right" boyut={16} />
              </Link>
            ))}
          </div>
        </section>

        <IletisimSeridi />
      </main>
      <AltBilgi />
    </div>
  );
}
