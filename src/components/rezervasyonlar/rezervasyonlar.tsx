"use client";
/* eslint-disable @next/next/no-img-element -- otel görselleri dış kaynaklı (tedarikçi) */

// Rezervasyonlarım: Yaklaşan / Geçmiş / İptal edilen sekmeleri. Sıradaki
// konaklama büyük kartta (kalan gün, giriş-çıkış, ücretsiz iptal), diğerleri
// satır kartlarında; geçmiş konaklamalar fotoğraflı ızgarada.

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { UstCubuk } from "@/components/lb/ust-cubuk";
import { AltBilgi } from "@/components/lb/alt-bilgi";
import { Ikon } from "@/components/lb/ikon";
import { Nesne, type NesneAdi } from "@/components/lb/nesne";
import { BOS_ARAMA, aramaAdresi } from "@/components/lb/arama/durum";
import { para } from "@/components/otel-detay/yardimci";
import { aralik, durumBilgisi, geceler, gunUzun, gunOku, gunYonelme, iptalDurumu, kalanGun, misafirYazi, tutar, type Rezervasyon } from "./ortak";
import s from "./rezervasyonlar.module.css";

type Sekme = "gelecek" | "gecmis" | "iptal";
const SEKMELER: { k: Sekme; ad: string }[] = [
  { k: "gelecek", ad: "Yaklaşan" },
  { k: "gecmis", ad: "Geçmiş" },
  { k: "iptal", ad: "İptal edilen" },
];
const BOS: Record<Sekme, { nesne: NesneAdi; baslik: string; metin: string }> = {
  gelecek: { nesne: "bavul", baslik: "Henüz bir seyahat planlamadın", metin: "Bir otel seçtiğinde rezervasyonun burada görünür." },
  gecmis: { nesne: "kartpostal", baslik: "Tamamlanan konaklaman yok", metin: "Konakladığın oteller burada birikir; beğendiğine tek dokunuşla yeniden gidebilirsin." },
  iptal: { nesne: "iptal", baslik: "İptal edilen rezervasyon yok", metin: "İptal ettiğin rezervasyonlar ve iptal ücretleri burada görünür." },
};

interface Yanit {
  data: Rezervasyon[];
  sayilar?: Record<Sekme, number>;
}

const simdiAl = () => Date.now();

export function Rezervasyonlar() {
  const router = useRouter();
  const params = useSearchParams();
  const sekme = (SEKMELER.find((x) => x.k === params.get("sekme"))?.k ?? "gelecek") as Sekme;
  const [simdi] = React.useState(simdiAl);
  const [arama, setArama] = React.useState(BOS_ARAMA);

  const q = useQuery<Yanit>({
    queryKey: ["rezervasyonlar", sekme],
    queryFn: async () => {
      const r = await fetch(`/api/reservations?zaman=${sekme}&limit=50`);
      if (!r.ok) throw new Error("Rezervasyonlar alınamadı");
      return r.json();
    },
    staleTime: 60_000,
  });
  const [sayilar, setSayilar] = React.useState<Record<Sekme, number> | null>(null);
  if (q.data?.sayilar && q.data.sayilar !== sayilar) setSayilar(q.data.sayilar);

  const sekmeSec = (k: Sekme) => router.replace(k === "gelecek" ? "/reservations" : `/reservations?sekme=${k}`, { scroll: false });

  /* Sekme göstergesi seçili düğmenin altına kayar. */
  const sekmeKok = React.useRef<HTMLDivElement>(null);
  const [gosterge, setGosterge] = React.useState<{ x: number; w: number } | null>(null);
  React.useLayoutEffect(() => {
    const olc = () => {
      const b = sekmeKok.current?.querySelector<HTMLElement>('[aria-selected="true"]');
      if (b) setGosterge({ x: b.offsetLeft, w: b.offsetWidth });
    };
    olc();
    addEventListener("resize", olc);
    return () => removeEventListener("resize", olc);
  }, [sekme, sayilar]);

  const liste = q.data?.data ?? [];
  let govde: React.ReactNode;
  if (q.isPending) {
    govde = (
      <div className={s.satirlar} aria-busy="true" aria-label="Rezervasyonlar yükleniyor">
        {sekme === "gelecek" && <div className={`${s.iskelet} ${s.iskeletBuyuk}`} />}
        {[0, 1].map((i) => <div key={i} className={s.iskelet} />)}
      </div>
    );
  } else if (q.isError) {
    govde = (
      <div className={s.bos}>
        <Nesne ad="zil" boyut={96} />
        <h2 className="lb-y">Rezervasyonlar şu an alınamadı</h2>
        <p>Bağlantıda bir sorun oldu; birazdan tekrar dene.</p>
        <button type="button" className={`${s.dugme} ${s.siyah}`} onClick={() => q.refetch()}>Tekrar dene</button>
      </div>
    );
  } else if (!liste.length) {
    const b = BOS[sekme];
    govde = (
      <div className={s.bos}>
        <Nesne ad={b.nesne} boyut={110} />
        <h2 className="lb-y">{b.baslik}</h2>
        <p>{b.metin}</p>
        {sekme !== "iptal" && <Link href="/" className={`${s.dugme} ${s.turuncu}`}>Otel ara</Link>}
      </div>
    );
  } else if (sekme === "gelecek") {
    const [ilk, ...diger] = liste;
    govde = (
      <>
        <SahneKart r={ilk} simdi={simdi} />
        {diger.length > 0 && (
          <>
            <h2 className={s.altBaslik}>Sonraki konaklamalar</h2>
            <div className={s.satirlar}>{diger.map((r) => <SatirKart key={r.id} r={r} simdi={simdi} />)}</div>
          </>
        )}
      </>
    );
  } else if (sekme === "gecmis") {
    govde = <div className={s.izgara}>{liste.map((r) => <GecmisKart key={r.id} r={r} />)}</div>;
  } else {
    govde = <div className={s.satirlar}>{liste.map((r) => <SatirKart key={r.id} r={r} simdi={simdi} soluk />)}</div>;
  }

  return (
    <div className={`lb ${s.sayfa}`}>
      <UstCubuk deger={arama} onDegis={setArama} onAra={() => router.push(aramaAdresi(arama))} />
      <main className={s.dis}>
        <div className={s.listeBas}>
          <h1 className="lb-y">Rezervasyonlarım</h1>
          <div ref={sekmeKok} className={s.sekmeler} role="tablist" aria-label="Rezervasyonlar">
            {gosterge && <span className={s.gosterge} style={{ width: gosterge.w, transform: `translateX(${gosterge.x - 4}px)` }} aria-hidden="true" />}
            {SEKMELER.map((x, i) => (
              <button
                key={x.k}
                type="button"
                role="tab"
                id={`sekme-${x.k}`}
                aria-selected={sekme === x.k}
                aria-controls="rez-panel"
                tabIndex={sekme === x.k ? 0 : -1}
                onClick={() => sekmeSec(x.k)}
                onKeyDown={(e) => {
                  if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
                  const y = SEKMELER[(i + (e.key === "ArrowRight" ? 1 : -1) + SEKMELER.length) % SEKMELER.length];
                  sekmeSec(y.k);
                  sekmeKok.current?.querySelector<HTMLElement>(`#sekme-${y.k}`)?.focus();
                }}
              >
                {x.ad}
                {sayilar && <span>{sayilar[x.k]}</span>}
              </button>
            ))}
          </div>
        </div>
        <div className={s.panel} id="rez-panel" role="tabpanel" aria-labelledby={`sekme-${sekme}`}>
          {govde}
          {sekme === "gelecek" && !q.isPending && (
            <div className={s.yardim}>
              <Nesne ad="zil" boyut={52} />
              <div>
                <b>Bir sorun mu var?</b>
                <span>Tarih değişikliği, özel istek ya da iptal için yardım merkezine bakabilirsin.</span>
              </div>
              <Link href="/yardim" className={`${s.dugme} ${s.cerceve}`}>Yardım merkezi</Link>
            </div>
          )}
        </div>
      </main>
      <AltBilgi />
    </div>
  );
}

function Rozet({ r, simdi }: { r: Rezervasyon; simdi: number }) {
  const d = durumBilgisi(r, simdi);
  return <span className={s.rozet} data-renk={d.renk}>{d.ad}</span>;
}

function Foto({ r }: { r: Rezervasyon }) {
  return r.hotel?.image ? <img src={r.hotel.image} alt="" loading="lazy" /> : <Nesne ad="zil" boyut={48} />;
}

function SahneKart({ r, simdi }: { r: Rezervasyon; simdi: number }) {
  const kalan = kalanGun(r, simdi);
  const ip = iptalDurumu(r, simdi);
  const misafir = misafirYazi(r);
  return (
    <article className={s.sahne}>
      <Link href={`/reservations/${r.id}`} className={s.sahneFoto} aria-label={`${r.hotelName ?? "Otel"} rezervasyon ayrıntıları`}>
        <Foto r={r} />
        <Rozet r={r} simdi={simdi} />
      </Link>
      <div className={s.sahneIc}>
        <p className={s.kalan}>
          <Nesne ad="anahtar-karti" boyut={40} />
          <span>{kalan > 0 ? <><b className="lb-y">{kalan} gün</b> kaldı</> : kalan === 0 ? <b className="lb-y">Giriş bugün</b> : <b className="lb-y">Konaklaman sürüyor</b>}</span>
        </p>
        <h2 className="lb-y"><Link href={`/reservations/${r.id}`}>{r.hotelName ?? r.hotelCode}</Link></h2>
        {(r.hotel?.stars || r.hotel?.place) && (
          <p className={s.soluk}>{[r.hotel?.stars ? `${r.hotel.stars} yıldızlı` : null, r.hotel?.place].filter(Boolean).join(" · ")}</p>
        )}
        <div className={s.girisCikis}>
          <div>
            <small>Giriş</small>
            <b>{gunUzun(gunOku(r.checkIn))}</b>
          </div>
          <Ikon ad="arrow-right" boyut={20} className={s.ok} />
          <div>
            <small>Çıkış</small>
            <b>{gunUzun(gunOku(r.checkOut))}</b>
          </div>
        </div>
        <p className={s.odaSatir}>
          <Ikon ad="bed" boyut={16} kalinlik={2.1} />
          {[r.roomType, r.boardTypeName, misafir].filter(Boolean).join(" · ")}
        </p>
        {ip.ucretsizSon && (
          <p className={s.yesilSatir}>
            <Ikon ad="check" boyut={16} kalinlik={2.1} />
            {gunYonelme(ip.ucretsizSon)} kadar ücretsiz iptal
          </p>
        )}
        <div className={s.sahneAlt}>
          <Link href={`/reservations/${r.id}`} className={`${s.dugme} ${s.siyah}`}>Ayrıntılar</Link>
          {r.bookingNumber && <Kopyala etiket="Rezervasyon no" deger={r.bookingNumber} />}
        </div>
      </div>
    </article>
  );
}

function SatirKart({ r, simdi, soluk }: { r: Rezervasyon; simdi: number; soluk?: boolean }) {
  const kalan = kalanGun(r, simdi);
  const alt = soluk
    ? [r.status === "CANCELLED" ? `${gunKisaTarih(r.updatedAt)} tarihinde iptal edildi` : "Rezervasyon tamamlanamadı", r.cancellationFee != null ? `iptal ücreti ${para(r.cancellationFee, r.cancellationFeeCurrency || r.currency)}` : null]
        .filter(Boolean)
        .join(" · ")
    : [r.roomType, misafirYazi(r)].filter(Boolean).join(" · ");
  return (
    <Link href={`/reservations/${r.id}`} className={s.satir} data-soluk={soluk || undefined}>
      <span className={s.satirFoto}><Foto r={r} /></span>
      <span className={s.satirIc}>
        <b>{r.hotelName ?? r.hotelCode}</b>
        <span>{aralik(r)} · {geceler(r)} gece</span>
        {alt && <span>{alt}</span>}
      </span>
      <span className={s.satirSag}>
        <Rozet r={r} simdi={simdi} />
        {!soluk && kalan > 0 && <span>{kalan} gün sonra</span>}
      </span>
      <Ikon ad="chevron-right" boyut={20} className={s.okIkon} />
    </Link>
  );
}

function GecmisKart({ r }: { r: Rezervasyon }) {
  return (
    <article className={s.gecmis}>
      <Link href={`/reservations/${r.id}`} className={s.gecmisFoto}><Foto r={r} /></Link>
      <div>
        <h3><Link href={`/reservations/${r.id}`}>{r.hotelName ?? r.hotelCode}</Link></h3>
        {r.hotel?.place && <p>{r.hotel.place}</p>}
        <p>{aralik(r)} · {geceler(r)} gece</p>
      </div>
      <div className={s.gecmisAlt}>
        <Link href={`/hotel/${r.hotelCode}`} className={s.metinDugme}>Tekrar rezervasyon yap</Link>
        <span>{para(tutar(r), r.currency)}</span>
      </div>
    </article>
  );
}

const gunKisaTarih = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
};

export function Kopyala({ etiket, deger }: { etiket: string; deger: string }) {
  const [tamam, setTamam] = React.useState(false);
  return (
    <span className={s.kopya}>
      {etiket && `${etiket} `}
      <b>{deger}</b>
      <button
        type="button"
        aria-label={`${etiket || "Numarayı"} kopyala`}
        onClick={async (e) => {
          e.preventDefault();
          try {
            await navigator.clipboard.writeText(deger);
            setTamam(true);
            setTimeout(() => setTamam(false), 1600);
          } catch {}
        }}
      >
        <Ikon ad={tamam ? "check" : "document"} boyut={16} kalinlik={2.1} />
      </button>
    </span>
  );
}
