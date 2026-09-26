"use client";

// Arama sonuçları (Airbnb düzeni): solda kartlar, sağda yapışık harita,
// üstte filtre şeridi. Oteller akışla gelir (useOtelAramasi); filtre, sıralama
// ve sayfalama istemcide. Harita o anki sayfanın otellerini gösterir; karta
// gelince iğnesi öne çıkar.

import { useFiyat } from "@/components/lb/fiyat";
import { useUyruk } from "@/components/lb/uyruk";
import { Bekleme, DonenMetin } from "@/components/lb/bekleme";
import * as React from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { UstCubuk } from "@/components/lb/ust-cubuk";
import { OtelKarti, OtelKartiIskelet } from "@/components/lb/otel-karti";
import { AltBilgi } from "@/components/lb/alt-bilgi";
import { Ikon } from "@/components/lb/ikon";
import { Nesne } from "@/components/lb/nesne";
import { useFavoriler } from "@/components/lb/favoriler";
import { geceSayisi, iso, isoOku, type AramaDegeri } from "@/components/lb/arama/durum";
import { useOtelAramasi } from "@/lib/utils/use-otel-aramasi";
import { addRecentSearch } from "@/lib/utils/recent-searches";
import type { HotelSearchResult } from "@/lib/royal-api/types";
import { BOS_FILTRE, filtrele, filtreSayisi, type Filtre, type Siralama } from "./filtre";
import { FiltrePenceresi } from "./filtre-penceresi";
import s from "./arama-sonuclari.module.css";

// Google Maps tarayıcıda yükleniyor; ayrı parça.
const HotelMap = dynamic(() => import("@/components/hotel/hotel-map").then((m) => m.HotelMap), {
  ssr: false,
  loading: () => <HaritaYukleniyor />,
});

function HaritaYukleniyor() {
  const t = useTranslations("arama.sonuc");
  return <div className={s.haritaYukleniyor}>{t("haritaYukleniyor")}</div>;
}

const SAYFA = 18;
// Hızlı filtreler; adları arama.filtre.secenek.<k>.
const HIZLI: { k: "iptal" | "kahvalti" | "hepsiDahil" | "yildiz4" }[] = [
  { k: "iptal" },
  { k: "kahvalti" },
  { k: "hepsiDahil" },
  { k: "yildiz4" },
];

// Otomatik indirim etiketi ("%15 erken rezervasyon"): türün metin anahtarı
// (arama.kampanya.*); bilinmeyen tür "indirim".
const KAMPANYA_METNI: Partial<Record<string, "erkenRezervasyon" | "sonDakika" | "uzunKonaklama" | "donem">> = {
  EARLY_BOOKING: "erkenRezervasyon",
  LAST_MINUTE: "sonDakika",
  LONG_STAY: "uzunKonaklama",
  DATE_RANGE: "donem",
};

export function AramaSonuclari({ params }: { params: URLSearchParams }) {
  const t = useTranslations("arama");
  const tk = useTranslations("ortak");
  const router = useRouter();
  const { fav, degistir: favDegistir } = useFavoriler();

  const hedef = params.get("destination") ?? "";
  const konum = params.get("konum");
  const giris = params.get("checkIn") ?? "";
  const cikis = params.get("checkOut") ?? "";
  const yetiskin = parseInt(params.get("adults") ?? "2", 10) || 2;
  const cocukMetni = params.get("childAges") ?? "";
  const cocuklar = cocukMetni.split(",").filter(Boolean).map(Number);
  const { uyruk, hazir: uyrukHazir } = useUyruk(params.get("nationality"));
  const paraBirimi = params.get("currency") ?? "EUR";
  const { yaz } = useFiyat();

  const payload = React.useMemo(() => {
    const yaslar = cocukMetni.split(",").filter(Boolean).map(Number);
    return {
      destination: hedef,
      ...(konum ? { locationId: konum } : {}),
      checkIn: giris,
      checkOut: cikis,
      nationality: uyruk,
      currency: paraBirimi,
      rooms: [{ adult: yetiskin, childAges: yaslar.length ? yaslar : undefined }],
    };
  }, [hedef, konum, giris, cikis, uyruk, paraBirimi, yetiskin, cocukMetni]);
  const etkin = !!(hedef && giris && cikis) && uyrukHazir;
  const arama = useOtelAramasi(payload, etkin);

  const [deger, setDeger] = React.useState<AramaDegeri>(() => ({
    yer: hedef, yerUst: null, yerId: konum, giris: isoOku(giris), cikis: isoOku(cikis), yetiskin, cocuklar,
  }));
  const [filtre, setFiltre] = React.useState<Filtre>(BOS_FILTRE);
  const [sira, setSira] = React.useState<Siralama>("oneri");
  const [sayfa, setSayfa] = React.useState(1);
  const [aktifKod, setAktifKod] = React.useState<string | null>(null);
  const [filtreAcik, setFiltreAcik] = React.useState(false);
  const [genisHarita, setGenisHarita] = React.useState(false);
  const [mobilHarita, setMobilHarita] = React.useState(false);
  const listeUst = React.useRef<HTMLDivElement>(null);

  const gece = giris && cikis ? Math.max(1, geceSayisi(isoOku(giris)!, isoOku(cikis)!)) : 1;
  const liste = React.useMemo(() => filtrele(arama.hotels, filtre, sira), [arama.hotels, filtre, sira]);
  const sayfaSayisi = Math.max(1, Math.ceil(liste.length / SAYFA));
  const buSayfa = Math.min(sayfa, sayfaSayisi);
  const gosterilen = liste.slice((buSayfa - 1) * SAYFA, buSayfa * SAYFA);
  const pansiyonlar = React.useMemo(() => [...new Set(arama.hotels.flatMap((h) => h.boardTypes))].sort((a, b) => a.localeCompare(b, "tr")), [arama.hotels]);
  const aramaEki = params.toString();

  // Seçilen para biriminde (TCMB kuruyla yaklaşık; bkz. lb/fiyat).
  const toplamYaz = React.useCallback((h: HotelSearchResult) => yaz(h.minPrice * gece, h.currency || "EUR"), [yaz, gece]);

  const git = (yeni: Record<string, string | null>) => {
    const p = new URLSearchParams(params.toString());
    Object.entries(yeni).forEach(([k, v]) => (v === null ? p.delete(k) : p.set(k, v)));
    router.push(`/search?${p.toString()}`);
  };
  const ara = () => {
    if (!deger.yer.trim() || !deger.giris || !deger.cikis) return;
    addRecentSearch({ destination: deger.yer, checkIn: iso(deger.giris), checkOut: iso(deger.cikis), adults: deger.yetiskin });
    git({
      destination: deger.yer.trim(), checkIn: iso(deger.giris), checkOut: iso(deger.cikis),
      adults: String(deger.yetiskin), childAges: deger.cocuklar.length ? deger.cocuklar.join(",") : null,
    });
  };
  const filtreDegis = (f: Filtre) => {
    setFiltre(f);
    setSayfa(1);
  };
  const sayfaDegis = (n: number) => {
    setSayfa(n);
    const y = (listeUst.current?.getBoundingClientRect().top ?? 0) + scrollY - 160;
    scrollTo({ top: Math.max(0, y), behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };

  const filtreSayac = filtreSayisi(filtre);

  let govde: React.ReactNode;
  if (!etkin) {
    govde = (
      <div className={s.durum}>
        <Nesne ad="bavul" boyut={110} />
        <h2 className="lb-y">{t("nereyeGidiyorsun")}</h2>
        <p>{t("sonuc.bosMetin")}</p>
      </div>
    );
  } else if (arama.ilkYukleme) {
    govde = (
      <>
        <div className={s.bekleme}>
          <Bekleme tur="bavul" boyut={76} etiket={null} />
          <div>
            <b>{t("sonuc.araniyor")}</b>
            <DonenMetin metinler={[t("sonuc.soruluyor", { yer: hedef }), t("sonuc.karsilastiriliyor"), t("sonuc.neredeyseHazir")]} />
          </div>
        </div>
        <ul className={s.kartlar} aria-busy="true" aria-label={t("sonuc.yukleniyor")}>{Array.from({ length: 6 }, (_, i) => <OtelKartiIskelet key={i} />)}</ul>
      </>
    );
  } else if (arama.durum === "hata" && arama.hotels.length === 0) {
    govde = (
      <div className={s.durum}>
        <Nesne ad="zil" boyut={110} />
        <h2 className="lb-y">{t("sonuc.hataBaslik")}</h2>
        <p>{arama.hata ?? t("sonuc.hataMetin")}</p>
        <button type="button" className={s.siyah} onClick={() => router.refresh()}>{tk("tekrarDene")}</button>
      </div>
    );
  } else if (liste.length === 0 && !arama.devamEdiyor) {
    govde = (
      <div className={s.durum}>
        <Nesne ad="zil" boyut={110} />
        <h2 className="lb-y">{arama.hotels.length ? t("sonuc.filtreBos") : t("sonuc.tarihBos")}</h2>
        <p>{arama.hotels.length ? t("sonuc.filtreBosMetin") : t("sonuc.tarihBosMetin")}</p>
        {arama.hotels.length > 0 && <button type="button" className={s.siyah} onClick={() => filtreDegis(BOS_FILTRE)}>{t("sonuc.filtreleriTemizle")}</button>}
      </div>
    );
  } else {
    govde = (
      <>
        <ul className={s.kartlar}>
          {gosterilen.map((h, i) => (
            <OtelKarti
              key={h.hotelCode}
              sira={i}
              otel={{
                kod: h.hotelCode, ad: h.hotelName, foto: h.thumbnailImage, yildiz: h.stars, yer: hedef,
                pansiyon: h.boardTypes[0] ?? null, iptal: !!h.freeCancellation,
                fiyat: h.minPrice > 0
                  ? { tutar: toplamYaz(h), aciklama: t("sonuc.geceIcin", { sayi: gece }), onceki: h.oncekiFiyat ? toplamYaz({ ...h, minPrice: h.oncekiFiyat }) : null }
                  : null,
                indirim: h.kampanya ? t(`kampanya.${KAMPANYA_METNI[h.kampanya.tur] ?? "indirim"}`, { yuzde: h.kampanya.yuzde }) : null,
              }}
              href={`/hotel/${h.hotelCode}?${aramaEki}`}
              favori={fav.has(h.hotelCode)}
              onFavori={() => favDegistir(h.hotelCode)}
              onUzerinde={(g) => setAktifKod(g ? h.hotelCode : null)}
            />
          ))}
        </ul>
        {sayfaSayisi > 1 && (
          <nav className={s.sayfalama} aria-label={t("sonuc.sayfalar")}>
            <button type="button" onClick={() => sayfaDegis(buSayfa - 1)} disabled={buSayfa === 1} aria-label={t("sonuc.oncekiSayfa")}>
              <Ikon ad="chevron-left" boyut={16} kalinlik={2.2} />
            </button>
            {Array.from({ length: sayfaSayisi }, (_, i) => (
              <button key={i} type="button" onClick={() => sayfaDegis(i + 1)} aria-current={i + 1 === buSayfa ? "page" : undefined}>
                {i + 1}
              </button>
            ))}
            <button type="button" onClick={() => sayfaDegis(buSayfa + 1)} disabled={buSayfa === sayfaSayisi} aria-label={t("sonuc.sonrakiSayfa")}>
              <Ikon ad="chevron-right" boyut={16} kalinlik={2.2} />
            </button>
          </nav>
        )}
      </>
    );
  }

  const seritAlt = (
    <div className={s.serit} role="toolbar" aria-label={t("filtre.filtreler")}>
      <button type="button" className={`${s.cip} ${s.filtreCip}`} onClick={() => setFiltreAcik(true)}>
        <Ikon ad="filter" boyut={16} kalinlik={2.2} />
        {t("filtre.filtreler")}
        {filtreSayac > 0 && <span className={s.rozet}>{filtreSayac}</span>}
      </button>
      <span className={s.ayrac} />
      {HIZLI.map((h) => (
        <button key={h.k} type="button" className={s.cip} aria-pressed={filtre[h.k]} onClick={() => filtreDegis({ ...filtre, [h.k]: !filtre[h.k] })}>
          {t(`filtre.secenek.${h.k}`)}
        </button>
      ))}
    </div>
  );

  return (
    <div className={`lb ${s.sayfa}`}>
      <UstCubuk deger={deger} onDegis={setDeger} onAra={ara} alt={seritAlt} />

      <div className={s.duzen} data-genis={genisHarita || undefined} data-mobil-harita={mobilHarita || undefined}>
        <section className={s.liste} aria-labelledby="sonuc-baslik">
          <div ref={listeUst} className={s.listeUst}>
            <h1 id="sonuc-baslik">
              {hedef
                ? etkin && !arama.ilkYukleme
                  ? t.rich(arama.devamEdiyor ? "sonuc.baslikDevam" : "sonuc.baslik", { yer: hedef, sayi: liste.length, b: (c) => <b>{c}</b> })
                  : t("sonuc.baslikBekliyor", { yer: hedef })
                : t("otelAra")}
            </h1>
            <div className={s.listeSag}>
              <span className={s.dahil}><Nesne ad="indirim" boyut={26} />{t("sonuc.vergiDahil")}</span>
              <label className={s.sirala}>
                <span className={s.gizli}>{t("sonuc.sirala")}</span>
                <select value={sira} onChange={(e) => { setSira(e.target.value as Siralama); setSayfa(1); }}>
                  <option value="oneri">{t("sonuc.siralama.oneri")}</option>
                  <option value="ucuz">{t("sonuc.siralama.ucuz")}</option>
                  <option value="pahali">{t("sonuc.siralama.pahali")}</option>
                  <option value="yildiz">{t("sonuc.siralama.yildiz")}</option>
                </select>
                <Ikon ad="chevron-down" boyut={16} />
              </label>
            </div>
          </div>
          {arama.devamEdiyor && (
            <div className={s.ilerleme} role="status" aria-live="polite">
              <i />
              <span>{t("sonuc.dahaFazlaAraniyor")}</span>
            </div>
          )}
          {govde}
        </section>

        <aside className={s.haritaKap} aria-label={t("sonuc.harita")}>
          <div className={s.harita}>
            {etkin && gosterilen.length > 0 ? (
              <HotelMap hotels={gosterilen} searchParams={aramaEki} aktifKod={aktifKod} fiyatYaz={toplamYaz} className={s.haritaIc} />
            ) : (
              <div className={s.haritaYukleniyor}>{arama.ilkYukleme ? t("sonuc.otellerGeliyor") : t("sonuc.haritadaOtelYok")}</div>
            )}
            <button type="button" className={s.genislet} aria-pressed={genisHarita} onClick={() => setGenisHarita((g) => !g)}>
              <Ikon ad={genisHarita ? "list" : "map"} boyut={16} kalinlik={2.2} />
              {genisHarita ? t("sonuc.listeyiGoster") : t("sonuc.haritayiBuyut")}
            </button>
          </div>
        </aside>
      </div>

      <button type="button" className={s.haritaDugme} onClick={() => { setMobilHarita((m) => !m); scrollTo({ top: 0 }); }}>
        <Ikon ad={mobilHarita ? "list" : "map"} boyut={16} kalinlik={2.2} />
        {mobilHarita ? t("sonuc.liste") : t("sonuc.harita")}
      </button>

      <FiltrePenceresi
        acik={filtreAcik}
        filtre={filtre}
        oteller={arama.hotels}
        pansiyonlar={pansiyonlar}
        uyruk={uyruk}
        paraBirimi={arama.hotels[0]?.currency || paraBirimi}
        onKapat={() => setFiltreAcik(false)}
        onUygula={(f, u) => {
          setFiltreAcik(false);
          filtreDegis(f);
          if (u !== uyruk) git({ nationality: u });
        }}
      />

      <AltBilgi />
    </div>
  );
}
