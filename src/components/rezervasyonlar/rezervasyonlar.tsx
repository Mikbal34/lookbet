"use client";
/* eslint-disable @next/next/no-img-element -- otel görselleri dış kaynaklı (tedarikçi) */

// Rezervasyonlarım: Yaklaşan / Geçmiş / İptal edilen sekmeleri. Sıradaki
// konaklama büyük kartta (kalan gün, giriş-çıkış, ücretsiz iptal), diğerleri
// satır kartlarında; geçmiş konaklamalar fotoğraflı ızgarada. Her sekme
// sayfa sayfa gelir ("Daha fazla göster").

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { UstCubuk } from "@/components/lb/ust-cubuk";
import { AltBilgi } from "@/components/lb/alt-bilgi";
import { Ikon } from "@/components/lb/ikon";
import { Nesne, type NesneAdi } from "@/components/lb/nesne";
import { BOS_ARAMA, aramaAdresi } from "@/components/lb/arama/durum";
import { useBicim } from "@/i18n/use-bicim";
import {
  aralikYerel, durumBilgisi, geceler, gunOku, gunUzunYerel, gunYonelmeYerel, iptalDurumu, kalanGun, misafirYerel, tutar, type Rezervasyon,
} from "./ortak";
import s from "./rezervasyonlar.module.css";

type Sekme = "gelecek" | "gecmis" | "iptal";
/** Sekme adları: rezervasyon.liste.sekme.<k>. */
const SEKMELER: { k: Sekme }[] = [{ k: "gelecek" }, { k: "gecmis" }, { k: "iptal" }];
/** Boş sekme görseli; metinler rezervasyon.liste.bos.<sekme>. */
const BOS_NESNE: Record<Sekme, NesneAdi> = { gelecek: "bavul", gecmis: "kartpostal", iptal: "iptal" };

interface Yanit {
  data: Rezervasyon[];
  sayilar?: Record<Sekme, number>;
  pagination: { total: number; page: number; limit: number; totalPages: number };
}

/** Sekme başına sayfa (ızgaranın 2 ve 3 sütununa bölünür). */
const SAYFA = 24;
const simdiAl = () => Date.now();

/** Sayfa sınırında aynı kayıt iki kez gelebilir (sıra anahtarı eşitse): yinelenenleri at. */
function tekil(liste: Rezervasyon[]) {
  const gorulen = new Set<string>();
  return liste.filter((r) => {
    if (gorulen.has(r.id)) return false;
    gorulen.add(r.id);
    return true;
  });
}

export function Rezervasyonlar() {
  const t = useTranslations("rezervasyon");
  const tk = useTranslations("ortak");
  const router = useRouter();
  const params = useSearchParams();
  const sekme = (SEKMELER.find((x) => x.k === params.get("sekme"))?.k ?? "gelecek") as Sekme;
  const [simdi] = React.useState(simdiAl);
  const [arama, setArama] = React.useState(BOS_ARAMA);

  const q = useInfiniteQuery({
    // "liste": yardım sayfasının ["rezervasyonlar", "gelecek"] sorgusu (5 kayıt, sayfasız) ayrı kalsın;
    // iptal sonrası ["rezervasyonlar"] ikisini de tazeler.
    queryKey: ["rezervasyonlar", "liste", sekme],
    queryFn: async ({ pageParam }): Promise<Yanit> => {
      const r = await fetch(`/api/reservations?zaman=${sekme}&limit=${SAYFA}&page=${pageParam}`);
      if (!r.ok) throw new Error("Rezervasyonlar alınamadı");
      return r.json();
    },
    initialPageParam: 1,
    getNextPageParam: (son) => (son.pagination.page < son.pagination.totalPages ? son.pagination.page + 1 : undefined),
    staleTime: 60_000,
  });
  // Sekme sayıları her sayfada gelir; sekme değişirken eskisi görünsün.
  const [sayilar, setSayilar] = React.useState<Record<Sekme, number> | null>(null);
  const sonSayilar = q.data?.pages.at(-1)?.sayilar;
  if (sonSayilar && sonSayilar !== sayilar) setSayilar(sonSayilar);

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

  const liste = React.useMemo(() => tekil(q.data?.pages.flatMap((p) => p.data) ?? []), [q.data]);
  let govde: React.ReactNode;
  if (q.isPending) {
    govde = (
      <div className={s.satirlar} aria-busy="true" aria-label={t("liste.yukleniyor")}>
        {sekme === "gelecek" && <div className={`${s.iskelet} ${s.iskeletBuyuk}`} />}
        {[0, 1].map((i) => <div key={i} className={s.iskelet} />)}
      </div>
    );
  } else if (!q.data) {
    // İlk yükleme hatası; devam sayfası hatasında liste yerinde kalır.
    govde = (
      <div className={s.bos}>
        <Nesne ad="zil" boyut={96} />
        <h2 className="lb-y">{t("liste.hata")}</h2>
        <p>{t("baglantiHatasi")}</p>
        <button type="button" className={`${s.dugme} ${s.siyah}`} onClick={() => q.refetch()}>{tk("tekrarDene")}</button>
      </div>
    );
  } else if (!liste.length) {
    govde = (
      <div className={s.bos}>
        <Nesne ad={BOS_NESNE[sekme]} boyut={110} />
        <h2 className="lb-y">{t(`liste.bos.${sekme}.baslik`)}</h2>
        <p>{t(`liste.bos.${sekme}.metin`)}</p>
        {sekme !== "iptal" && <Link href="/" className={`${s.dugme} ${s.turuncu}`}>{t("liste.otelAra")}</Link>}
      </div>
    );
  } else if (sekme === "gelecek") {
    const [ilk, ...diger] = liste;
    govde = (
      <>
        <SahneKart r={ilk} simdi={simdi} />
        {diger.length > 0 && (
          <>
            <h2 className={s.altBaslik}>{t("liste.sonrakiler")}</h2>
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
          <h1 className="lb-y">{t("baslik")}</h1>
          <div ref={sekmeKok} className={s.sekmeler} role="tablist" aria-label={t("liste.sekmeler")}>
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
                {t(`liste.sekme.${x.k}`)}
                {sayilar && <span>{sayilar[x.k]}</span>}
              </button>
            ))}
          </div>
        </div>
        <div className={s.panel} id="rez-panel" role="tabpanel" aria-labelledby={`sekme-${sekme}`}>
          {govde}
          {q.data && q.hasNextPage && (
            <div className={s.dahaFazla}>
              <button
                type="button"
                className={`${s.dugme} ${s.cerceve}`}
                disabled={q.isFetchingNextPage}
                aria-busy={q.isFetchingNextPage || undefined}
                onClick={() => q.fetchNextPage()}
              >
                {q.isFetchingNextPage ? tk("yukleniyor") : tk("dahaFazla")}
              </button>
              {q.isFetchNextPageError && <small role="alert">{t("liste.devamHata")}</small>}
            </div>
          )}
          {sekme === "gelecek" && !q.isPending && (
            <div className={s.yardim}>
              <Nesne ad="zil" boyut={52} />
              <div>
                <b>{t("liste.yardimBaslik")}</b>
                <span>{t("liste.yardimMetin")}</span>
              </div>
              <Link href="/yardim" className={`${s.dugme} ${s.cerceve}`}>{t("yardimMerkezi")}</Link>
            </div>
          )}
        </div>
      </main>
      <AltBilgi />
    </div>
  );
}

function Rozet({ r, simdi }: { r: Rezervasyon; simdi: number }) {
  const t = useTranslations("rezervasyon");
  const d = durumBilgisi(r, simdi);
  return <span className={s.rozet} data-renk={d.renk}>{t(`durum.${d.kod}`)}</span>;
}

function Foto({ r }: { r: Rezervasyon }) {
  return r.hotel?.image ? <img src={r.hotel.image} alt="" loading="lazy" /> : <Nesne ad="zil" boyut={48} />;
}

function SahneKart({ r, simdi }: { r: Rezervasyon; simdi: number }) {
  const t = useTranslations("rezervasyon");
  const tk = useTranslations("ortak");
  const b = useBicim();
  const kalan = kalanGun(r, simdi);
  const ip = iptalDurumu(r, simdi);
  const misafir = misafirYerel(t, r);
  return (
    <article className={s.sahne}>
      <Link href={`/reservations/${r.id}`} className={s.sahneFoto} aria-label={t("liste.ayrintiEtiket", { otel: r.hotelName ?? t("otel") })}>
        <Foto r={r} />
        <Rozet r={r} simdi={simdi} />
      </Link>
      <div className={s.sahneIc}>
        <p className={s.kalan}>
          <Nesne ad="anahtar-karti" boyut={40} />
          <span>{kalan > 0 ? t.rich("kalan.gun", { sayi: kalan, b: (c) => <b className="lb-y">{c}</b> }) : kalan === 0 ? <b className="lb-y">{t("kalan.bugun")}</b> : <b className="lb-y">{t("kalan.suruyor")}</b>}</span>
        </p>
        <h2 className="lb-y"><Link href={`/reservations/${r.id}`}>{r.hotelName ?? r.hotelCode}</Link></h2>
        {(r.hotel?.stars || r.hotel?.place) && (
          <p className={s.soluk}>{[r.hotel?.stars ? tk("yildizli", { sayi: r.hotel.stars }) : null, r.hotel?.place].filter(Boolean).join(" · ")}</p>
        )}
        <div className={s.girisCikis}>
          <div>
            <small>{t("giris")}</small>
            <b>{gunUzunYerel(b, gunOku(r.checkIn))}</b>
          </div>
          <Ikon ad="arrow-right" boyut={20} className={s.ok} />
          <div>
            <small>{t("cikis")}</small>
            <b>{gunUzunYerel(b, gunOku(r.checkOut))}</b>
          </div>
        </div>
        <p className={s.odaSatir}>
          <Ikon ad="bed" boyut={16} kalinlik={2.1} />
          {[r.roomType, r.boardTypeName, misafir].filter(Boolean).join(" · ")}
        </p>
        {ip.ucretsizSon && (
          <p className={s.yesilSatir}>
            <Ikon ad="check" boyut={16} kalinlik={2.1} />
            {t("ucretsizIptal", { tarih: gunYonelmeYerel(b, ip.ucretsizSon) })}
          </p>
        )}
        <div className={s.sahneAlt}>
          <Link href={`/reservations/${r.id}`} className={`${s.dugme} ${s.siyah}`}>{t("liste.ayrintilar")}</Link>
          {r.bookingNumber && <Kopyala etiket={t("rezervasyonNo")} deger={r.bookingNumber} />}
        </div>
      </div>
    </article>
  );
}

function SatirKart({ r, simdi, soluk }: { r: Rezervasyon; simdi: number; soluk?: boolean }) {
  const t = useTranslations("rezervasyon");
  const tk = useTranslations("ortak");
  const b = useBicim();
  const kalan = kalanGun(r, simdi);
  const alt = soluk
    ? [
        r.status === "CANCELLED" ? t("liste.iptalTarihi", { tarih: b.gunAyYil(new Date(r.updatedAt)) }) : t("liste.tamamlanamadi"),
        r.cancellationFee != null ? t("liste.iptalUcreti", { tutar: b.para(r.cancellationFee, r.cancellationFeeCurrency || r.currency) }) : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : [r.roomType, misafirYerel(t, r)].filter(Boolean).join(" · ");
  return (
    <Link href={`/reservations/${r.id}`} className={s.satir} data-soluk={soluk || undefined}>
      <span className={s.satirFoto}><Foto r={r} /></span>
      <span className={s.satirIc}>
        <b>{r.hotelName ?? r.hotelCode}</b>
        <span>{aralikYerel(b, r)} · {tk("gece", { sayi: geceler(r) })}</span>
        {alt && <span>{alt}</span>}
      </span>
      <span className={s.satirSag}>
        <Rozet r={r} simdi={simdi} />
        {!soluk && kalan > 0 && <span>{t("liste.gunSonra", { sayi: kalan })}</span>}
      </span>
      <Ikon ad="chevron-right" boyut={20} className={s.okIkon} />
    </Link>
  );
}

function GecmisKart({ r }: { r: Rezervasyon }) {
  const t = useTranslations("rezervasyon");
  const tk = useTranslations("ortak");
  const b = useBicim();
  return (
    <article className={s.gecmis}>
      <Link href={`/reservations/${r.id}`} className={s.gecmisFoto}><Foto r={r} /></Link>
      <div>
        <h3><Link href={`/reservations/${r.id}`}>{r.hotelName ?? r.hotelCode}</Link></h3>
        {r.hotel?.place && <p>{r.hotel.place}</p>}
        <p>{aralikYerel(b, r)} · {tk("gece", { sayi: geceler(r) })}</p>
      </div>
      <div className={s.gecmisAlt}>
        <Link href={`/hotel/${r.hotelCode}`} className={s.metinDugme}>{t("tekrarRezervasyon")}</Link>
        <span>{b.para(tutar(r), r.currency)}</span>
      </div>
    </article>
  );
}

export function Kopyala({ etiket, deger }: { etiket: string; deger: string }) {
  const t = useTranslations("rezervasyon");
  const [tamam, setTamam] = React.useState(false);
  return (
    <span className={s.kopya}>
      {etiket && `${etiket} `}
      <b>{deger}</b>
      <button
        type="button"
        aria-label={etiket ? t("kopyala", { etiket }) : t("numarayiKopyala")}
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
