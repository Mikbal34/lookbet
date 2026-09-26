"use client";
/* eslint-disable @next/next/no-img-element -- otel görselleri dış kaynaklı (tedarikçi) */

// Partner · Bugün (Airbnb ev sahibi "Bugün" sekmesi gibi): selamlama, müşteri
// için otel arama çubuğu, rezervasyon çipleri (bugün giriş · konaklayan ·
// yaklaşan · ücretsiz iptali bitmek üzere) ve kartlar, altta bu ayın özeti.

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AramaCubugu, type AramaKontrol } from "@/components/lb/arama/arama-cubugu";
import { MobilArama } from "@/components/lb/arama/mobil-arama";
import { BOS_ARAMA, aramaAdresi, AYLAR } from "@/components/lb/arama/durum";
import { Ikon } from "@/components/lb/ikon";
import { Nesne, type NesneAdi } from "@/components/lb/nesne";
import { para } from "@/components/otel-detay/yardimci";
import { aralik, durumBilgisi, geceler, gunOku, kalanGun, type Rezervasyon } from "@/components/rezervasyonlar/ortak";
import { grup, iptalKalan, misafirAdi, type Grup } from "./ortak";
import { RezPenceresi } from "./rez-penceresi";
import { useKazanc, useSirket, rezervasyonlariGetir } from "./veri";
import s from "./partner.module.css";

type Cip = "bugun" | "konakliyor" | "yaklasan" | "iptal";
const CIPLER: { k: Cip; ad: string }[] = [
  { k: "bugun", ad: "Bugün giriş" },
  { k: "konakliyor", ad: "Şu an konaklayan" },
  { k: "yaklasan", ad: "Yaklaşan" },
  { k: "iptal", ad: "İptal süresi dolmak üzere" },
];
const BOS: Record<Cip, { nesne: NesneAdi; baslik: string }> = {
  bugun: { nesne: "kapi", baslik: "Bugün giriş yapan misafirin yok" },
  konakliyor: { nesne: "zil", baslik: "Şu an konaklayan misafirin yok" },
  yaklasan: { nesne: "bavul", baslik: "Yaklaşan rezervasyonun yok" },
  iptal: { nesne: "iptal", baslik: "Ücretsiz iptali bitmek üzere olan rezervasyon yok" },
};
const simdiAl = () => Date.now();
const selam = (t: number) => {
  const s = new Date(t).getHours();
  return s < 5 ? "İyi geceler" : s < 12 ? "Günaydın" : s < 18 ? "İyi günler" : "İyi akşamlar";
};

export function Bugun() {
  const router = useRouter();
  const istemci = useQueryClient();
  const [simdi] = React.useState(simdiAl);
  const [cip, setCip] = React.useState<Cip>("bugun");
  const [secili, setSecili] = React.useState<Rezervasyon | null>(null);
  const sirket = useSirket();
  const kazanc = useKazanc();
  const q = useQuery({ queryKey: ["partner-rez", "gelecek"], queryFn: () => rezervasyonlariGetir("gelecek") });

  // Arama çubuğu (ana sayfadakiyle aynı bileşen, akışta).
  const [arama, setArama] = React.useState(BOS_ARAMA);
  const [mobilAcik, setMobilAcik] = React.useState(false);
  const kok = React.useRef<HTMLDivElement | null>(null);
  const buyuk = React.useRef<HTMLDivElement | null>(null);
  const kontrol = React.useRef<AramaKontrol>(null);
  const ara = () => {
    setMobilAcik(false);
    if (arama.yer.trim()) router.push(aramaAdresi(arama));
    else kontrol.current?.panelAc("yer");
  };

  const liste = React.useMemo(() => q.data ?? [], [q.data]);
  const gruplu = React.useMemo(() => {
    const g: Record<Cip, Rezervasyon[]> = { bugun: [], konakliyor: [], yaklasan: [], iptal: [] };
    for (const r of liste) {
      const x = grup(r, simdi);
      if (x === "bugun") g.bugun.push(r);
      if (x === "konakliyor" || x === "ayriliyor") g.konakliyor.push(r);
      if (x === "yaklasan") g.yaklasan.push(r);
      const k = iptalKalan(r, simdi);
      if (x === "yaklasan" && k !== null && k <= 2) g.iptal.push(r);
    }
    return g;
  }, [liste, simdi]);
  const gosterilen = gruplu[cip];

  const ay = kazanc.data?.aylar.at(-1);
  const gecenAy = kazanc.data?.aylar.at(-2);
  const pb = kazanc.data?.paraBirimi ?? "EUR";
  const bugunAy = new Date(simdi);

  return (
    <div className={s.dis}>
      <section className={s.selam}>
        <div>
          <h1 className="lb-y">{selam(simdi)}{sirket.data?.companyName ? `, ${sirket.data.companyName}` : ""}</h1>
          <p>
            {new Date(simdi).toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" })}
            {q.isSuccess && ` · bugün ${gruplu.bugun.length} misafirin giriş yapıyor`}
          </p>
        </div>
        <div className={s.bolgeler} aria-hidden="true">
          <Nesne ad="bodrum" boyut={72} />
          <Nesne ad="kapadokya" boyut={72} />
          <Nesne ad="antalya" boyut={72} />
        </div>
      </section>

      <section className={s.aramaBolum} aria-label="Müşterin için otel ara">
        <b>Müşterin için otel ara</b>
        <span>Acente fiyatların ve komisyonunla</span>
        <div className={s.aramaKap}>
          <AramaCubugu
            akis
            deger={arama}
            onDegis={setArama}
            onAra={ara}
            kokRef={kok}
            buyukRef={buyuk}
            kontrol={kontrol}
            nesne="anahtar-karti"
            onKucuk={() => {}}
            onTek={() => setMobilAcik(true)}
          />
        </div>
        <MobilArama acik={mobilAcik} deger={arama} onDegis={setArama} onAra={ara} onKapat={() => setMobilAcik(false)} />
      </section>

      <section>
        <div className={s.bolumBas}>
          <h2>Rezervasyonların</h2>
          <div className={s.cipler} role="group" aria-label="Rezervasyon filtresi">
            {CIPLER.map((c) => (
              <button
                key={c.k}
                type="button"
                className={s.cip}
                aria-pressed={cip === c.k}
                data-uyari={(c.k === "iptal" && gruplu.iptal.length > 0) || undefined}
                onClick={() => setCip(c.k)}
              >
                {c.ad}
                {q.isSuccess && ` (${gruplu[c.k].length})`}
              </button>
            ))}
          </div>
        </div>
        {q.isPending ? (
          <div className={s.kartlar}>{[0, 1, 2].map((i) => <div key={i} className={s.iskeletKart} />)}</div>
        ) : q.isError ? (
          <Bos nesne="zil" baslik="Rezervasyonlar şu an alınamadı" metin="Birazdan tekrar dene." />
        ) : gosterilen.length ? (
          <div className={s.kartlar}>
            {gosterilen.map((r, i) => (
              <RezKart key={r.id} r={r} simdi={simdi} sira={i} onAc={() => setSecili(r)} />
            ))}
          </div>
        ) : (
          <Bos nesne={BOS[cip].nesne} baslik={BOS[cip].baslik} metin="Yukarıdan müşterin için otel arayıp rezervasyon yapabilirsin." />
        )}
      </section>

      <section>
        <div className={s.bolumBas}>
          <h2>{AYLAR[bugunAy.getMonth()]} ayı</h2>
          <Link href="/agency/kazanclar" className={s.metinDugme}>Tüm kazançlar</Link>
        </div>
        <div className={s.ozet}>
          <Link href="/agency/kazanclar">
            <span>Komisyon (tahmini)</span>
            <b className="lb-y">{ay ? para(ay.komisyon, pb) : "—"}</b>
            <small>{gecenAy ? `Geçen ay ${para(gecenAy.komisyon, pb)}` : " "}</small>
          </Link>
          <Link href="/agency/reservations">
            <span>Satış</span>
            <b className="lb-y">{ay ? para(ay.satis, pb) : "—"}</b>
            {/* Kazançlar'la aynı taban: girişi bu ayda olan onaylı rezervasyonlar (checkIn). */}
            <small>Girişi bu ayda, onaylı</small>
          </Link>
          <Link href="/agency/reservations">
            <span>Rezervasyon</span>
            <b className="lb-y">{ay ? ay.adet : "—"}</b>
            <small>Bu ay girişli, onaylı</small>
          </Link>
        </div>
      </section>

      <RezPenceresi
        r={secili}
        simdi={simdi}
        oran={kazanc.data?.komisyonOrani ?? null}
        onKapat={() => setSecili(null)}
        onIptal={() => {
          // Ayrıntı kapanır; iptal sonucu penceresi açık kalır.
          setSecili(null);
          istemci.invalidateQueries({ queryKey: ["partner-rez"] });
          istemci.invalidateQueries({ queryKey: ["partner-kazanc"] });
        }}
      />
    </div>
  );
}

export function RezKart({ r, simdi, sira, onAc }: { r: Rezervasyon; simdi: number; sira: number; onAc: () => void }) {
  const g: Grup = grup(r, simdi);
  const kalan = kalanGun(r, simdi);
  const cikisa = Math.round((gunOku(r.checkOut).getTime() - new Date(new Date(simdi).toDateString()).getTime()) / 864e5);
  const etiket =
    g === "bugun" ? "Bugün giriş yapıyor"
      : g === "ayriliyor" ? "Bugün çıkış yapıyor"
        : g === "konakliyor" ? `Konaklıyor · ${cikisa} gece kaldı`
          : g === "yaklasan" ? `${kalan} gün sonra giriş`
            : "";
  const ik = iptalKalan(r, simdi);
  const d = durumBilgisi(r, simdi);
  return (
    <article className={s.rkart} style={{ "--s": sira } as React.CSSProperties}>
      <button type="button" className={s.rkartTik} onClick={onAc} aria-label={`${misafirAdi(r)}, ${r.hotelName ?? ""} ayrıntıları`} />
      <div className={s.rkartUst}>
        <div>
          <span className={s.etiket}>{etiket}</span>
          <h3>{misafirAdi(r)}</h3>
        </div>
        <span className={s.rkartFoto}>{r.hotel?.image ? <img src={r.hotel.image} alt="" loading="lazy" /> : <Nesne ad="zil" boyut={36} />}</span>
      </div>
      <p className={s.rkartOtel}>{r.hotelName ?? r.hotelCode}</p>
      <p className={s.soluk}>{aralik(r)} · {geceler(r)} gece</p>
      {r.status !== "CONFIRMED" && <span className={s.rozet} data-renk={d.renk}>{d.ad}</span>}
      {g === "yaklasan" && ik !== null && ik <= 2 && (
        <span className={s.uyari}>
          <Ikon ad="warning" boyut={14} kalinlik={2.2} />
          Ücretsiz iptal {ik === 0 ? "bugün" : `${ik} gün sonra`} bitiyor
        </span>
      )}
      <div className={s.rkartAlt}>
        <span className={s.metinDugme}>Ayrıntılar</span>
        <span className={s.soluk}>{r.bookingNumber ?? ""}</span>
      </div>
    </article>
  );
}

export function Bos({ nesne, baslik, metin }: { nesne: NesneAdi; baslik: string; metin?: string }) {
  return (
    <div className={s.bos}>
      <Nesne ad={nesne} boyut={80} />
      <b>{baslik}</b>
      {metin && <span>{metin}</span>}
    </div>
  );
}
