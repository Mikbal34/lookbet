"use client";

// Yardım Merkezi ana sayfası (Airbnb yardım merkezi gibi): büyük arama (yazdıkça
// makaleleri süzer), Misafir / Acente sekmeleri, girişliyse sıradaki
// rezervasyonla ilgili kısayollar, nesneli "Başlarken" rehberleri ve konu
// çipli sık sorulanlar.

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { AltBilgi } from "@/components/lb/alt-bilgi";
import { Ikon } from "@/components/lb/ikon";
import { Nesne } from "@/components/lb/nesne";
import { aralik, durumBilgisi, gunYonelme, iptalDurumu, type Rezervasyon } from "@/components/rezervasyonlar/ortak";
import { MAKALELER, REHBERLER, konular, type Kitle, type Makale } from "./makaleler";
import { IletisimSeridi, YardimCubugu } from "./yardim-parcalari";
import s from "./yardim.module.css";

const tr = (x: string) => x.toLocaleLowerCase("tr");
const simdiAl = () => Date.now();

/** Başlıkta geçen önce; metinde geçen sonra. */
function ara(q: string): { m: Makale; parca: string }[] {
  const k = tr(q.trim());
  if (!k) return [];
  return MAKALELER.map((m) => {
    const baslikta = tr(m.baslik).includes(k);
    const parca = m.metin.find((p) => tr(p).includes(k));
    return { m, puan: (baslikta ? 2 : 0) + (parca ? 1 : 0), parca: parca ?? m.metin[0] };
  })
    .filter((x) => x.puan > 0)
    .sort((a, b) => b.puan - a.puan)
    .slice(0, 8);
}

function Vurgu({ metin, q }: { metin: string; q: string }) {
  const i = tr(metin).indexOf(tr(q.trim()));
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
  const router = useRouter();
  const p = useSearchParams();
  const kitle: Kitle = p.get("kitle") === "acente" ? "acente" : "misafir";
  const { data: oturum } = useSession();
  const [simdi] = React.useState(simdiAl);
  const [konu, setKonu] = React.useState<string | null>(null);
  const [q, setQ] = React.useState("");
  const [acikListe, setAcikListe] = React.useState(false);
  const [secili, setSecili] = React.useState(-1);
  const araKok = React.useRef<HTMLDivElement>(null);
  const girdi = React.useRef<HTMLInputElement>(null);

  const kitleKonulari = konular(kitle);
  const aktifKonu = konu && kitleKonulari.includes(konu) ? konu : kitleKonulari[0];
  const sonuc = React.useMemo(() => ara(q), [q]);

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
          <h1 className="lb-y">{ad ? `Merhaba ${ad}, nasıl yardımcı olabiliriz?` : "Merhaba, nasıl yardımcı olabiliriz?"}</h1>
          <div className={s.araKap} ref={araKok} id="ara">
            <label className={s.ara}>
              <Ikon ad="search" boyut={20} />
              <input
                ref={girdi}
                type="search"
                role="combobox"
                aria-autocomplete="list"
                value={q}
                placeholder="Soru ya da konu yaz: iptal, giriş kodu, fatura…"
                aria-label="Yardım makalelerinde ara"
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
                      <b><Vurgu metin={m.baslik} q={q} /></b>
                      <span>
                        {m.kitle === "misafir" ? "Misafir" : "Acente"} · <Vurgu metin={parca.length > 110 ? `${parca.slice(0, 110)}…` : parca} q={q} />
                      </span>
                    </Link>
                  ))
                ) : (
                  <div className={s.yok}>&quot;{q.trim()}&quot; için makale bulamadık. Başka bir kelime dene ya da destek ekibine yaz.</div>
                )}
              </div>
            )}
          </div>
        </section>

        <nav className={s.sekmeler} aria-label="Kimin için">
          {(["misafir", "acente"] as const).map((k) => (
            <button key={k} type="button" aria-current={kitle === k ? "page" : undefined} onClick={() => kitleSec(k)}>
              {k === "misafir" ? "Misafir" : "Acente"}
            </button>
          ))}
        </nav>

        {kitle === "misafir" && siradaki && (
          <section className={s.bolum} aria-labelledby="rez-baslik">
            <h2 id="rez-baslik">Rezervasyonunla ilgili yardım</h2>
            <div className={s.rezKart}>
              <div>
                <b>{siradaki.hotelName ?? siradaki.hotelCode}</b>
                <span>
                  {[
                    aralik(siradaki),
                    durumBilgisi(siradaki, simdi).ad,
                    (() => {
                      const son = iptalDurumu(siradaki, simdi).ucretsizSon;
                      return son ? `${gunYonelme(son)} kadar ücretsiz iptal` : null;
                    })(),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </div>
              <div className={s.rezYollar}>
                <Link className={`${s.dugme} ${s.cerceve}`} href="/yardim/iptal">İptal etmek istiyorum</Link>
                <Link className={`${s.dugme} ${s.siyah}`} href={`/reservations/${siradaki.id}`}>Ayrıntılar</Link>
              </div>
            </div>
          </section>
        )}

        <section className={s.bolum} aria-labelledby="rehber-baslik">
          <h2 id="rehber-baslik">Başlarken</h2>
          <div className={s.rehberler}>
            {REHBERLER[kitle].map((r) => (
              <Link key={r.makale} className={s.rehber} href={`/yardim/${r.makale}`}>
                <Nesne ad={r.nesne} boyut={56} />
                <b>{r.baslik}</b>
                <span>{r.aciklama}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className={s.bolum} aria-labelledby="sss-baslik">
          <h2 id="sss-baslik">Sık sorulanlar</h2>
          <div className={s.cipler} role="group" aria-label="Konu">
            {kitleKonulari.map((k) => (
              <button key={k} type="button" className={s.cip} aria-pressed={k === aktifKonu} onClick={() => setKonu(k)}>{k}</button>
            ))}
          </div>
          <div className={s.makaleler}>
            {MAKALELER.filter((m) => m.kitle === kitle && m.konu === aktifKonu).map((m) => (
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
