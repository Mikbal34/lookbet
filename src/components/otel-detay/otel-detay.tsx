"use client";
/* eslint-disable @next/next/no-img-element -- otel ve oda görselleri dış kaynaklı (tedarikçi) */

// Otel detay sayfası (Airbnb düzeni): başlık ve fotoğraf ızgarası, solda özet,
// öne çıkanlar, açıklama, odalar ve olanaklar; sağda yapışık rezervasyon
// kutusu. Galeri geçilince bölüm menüsü iner, rezervasyon kutusu da geçilince
// fiyat ve düğme menüye taşınır. Odalar pencerede açılır (solda oda rayı);
// seçilen oda ödeme sayfasına aynı parametrelerle gider.

import { useFiyat } from "@/components/lb/fiyat";
import { useUyruk } from "@/components/lb/uyruk";
import { sunucuMesaji } from "@/lib/utils";
import * as React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { UstCubuk } from "@/components/lb/ust-cubuk";
import { AltBilgi } from "@/components/lb/alt-bilgi";
import { Ikon } from "@/components/lb/ikon";
import { Bekleme, DonenMetin } from "@/components/lb/bekleme";
import { Nesne } from "@/components/lb/nesne";
import { Pencere } from "@/components/lb/pencere";
import { useFavoriler } from "@/components/lb/favoriler";
import { useGiris } from "@/components/lb/giris/giris-saglayici";
import { aramaAdresi, geceSayisi, iso, isoOku, type AramaDegeri } from "@/components/lb/arama/durum";
import { useBicim } from "@/i18n/use-bicim";
import type { HotelDetailResponse } from "@/lib/royal-api/types";
import { FotoTuru, Galeri, IsikKutusu, type TurBolumu } from "./galeri";
import { OdaPenceresi, odaOncekiFiyati, odaToplami, type Oda } from "./oda-penceresi";
import { TarihAlani, TarihPenceresi, useMisafirMetni, type TarihPaneli } from "./tarih-alani";
import { iptalOzeti, olanakGruplari, olanakIkonu, oneCikanlar, oneCikanOlanaklar } from "./yardimci";
import s from "./otel-detay.module.css";

const KonumHaritasi = dynamic(() => import("./konum-haritasi").then((m) => m.KonumHaritasi), {
  ssr: false,
  loading: () => <HaritaBekleme />,
});

interface OtelVerisi extends Partial<HotelDetailResponse> {
  hotelCode: string;
  location?: { name: string; parent?: { name: string } | null } | null;
}
interface OdaAramasi {
  roomSearchId: string;
  expiresAt: string;
  rooms: Oda[];
}

// Kampanya türünün açıklaması (otel.rez.kampanyaAciklama.*); bilinmeyen tür tarih indirimi sayılır.
const KAMPANYA_ACIKLAMA: Record<string, "erkenRezervasyon" | "sonDakika" | "uzunKonaklama" | "tarihAraligi" | undefined> = {
  EARLY_BOOKING: "erkenRezervasyon",
  LAST_MINUTE: "sonDakika",
  LONG_STAY: "uzunKonaklama",
  DATE_RANGE: "tarihAraligi",
};

async function otelGetir(kod: string): Promise<OtelVerisi> {
  const r = await fetch(`/api/hotels/${kod}`);
  if (!r.ok) throw new Error(r.status === 404 ? "yok" : "hata");
  return r.json();
}

async function odalariGetir(
  kod: string,
  a: { giris: string; cikis: string; yetiskin: number; cocuklar: number[]; uyruk: string; para: string },
  hata: { genel: string; cokSik: string }
): Promise<OdaAramasi> {
  const r = await fetch("/api/rooms/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      hotelCode: kod,
      checkIn: a.giris,
      checkOut: a.cikis,
      nationality: a.uyruk,
      currency: a.para,
      rooms: [{ adult: a.yetiskin, childAges: a.cocuklar.length ? a.cocuklar : undefined }],
    }),
  });
  if (!r.ok) throw new Error(await sunucuMesaji(r, hata.genel, hata.cokSik));
  return r.json();
}

// Bölüm menüsü: sayfadaki bölüm kimliği, aynı zamanda adının anahtarı (otel.bolumler.*).
const BOLUMLER = ["fotograflar", "odalar", "olanaklar", "konum", "bilinmesi"] as const;

/** Oda aramasının süresi (neredeyse) doldu mu — ödemeye geçmeden yenilemek için. */
const sureDoldu = (bitis: string) => Date.parse(bitis) - Date.now() < 60_000;
const azHareket = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const git = (id: string) => {
  const e = document.getElementById(id);
  if (e) scrollTo({ top: e.getBoundingClientRect().top + scrollY - 90, behavior: azHareket() ? "auto" : "smooth" });
};

export function OtelDetay({ kod }: { kod: string }) {
  const t = useTranslations("otel");
  const tk = useTranslations("ortak");
  const bicim = useBicim();
  const misafirMetni = useMisafirMetni();
  // Fiyatlar seçilen para biriminde (TCMB kuruyla yaklaşık; bkz. lb/fiyat).
  const { yaz } = useFiyat();
  const params = useSearchParams();
  const router = useRouter();
  const { status: oturum } = useSession();
  const girisPenceresi = useGiris();
  const { fav, degistir: favDegistir } = useFavoriler();

  const giris = params.get("checkIn") ?? "";
  const cikis = params.get("checkOut") ?? "";
  const yetiskin = parseInt(params.get("adults") ?? "2", 10) || 2;
  const cocukMetni = params.get("childAges") ?? "";
  const { uyruk, hazir: uyrukHazir } = useUyruk(params.get("nationality"));
  const paraBirimi = params.get("currency") ?? "EUR";
  const hedef = params.get("destination") ?? "";
  const konumId = params.get("konum");
  const girisT = isoOku(giris);
  const cikisT = isoOku(cikis);
  const tarihVar = !!(girisT && cikisT && cikisT > girisT);
  const gece = tarihVar ? Math.max(1, geceSayisi(girisT!, cikisT!)) : 1;
  const urlDeger = React.useMemo<AramaDegeri>(
    () => ({ yer: hedef, yerUst: null, yerId: konumId, giris: isoOku(giris), cikis: isoOku(cikis), yetiskin, cocuklar: cocukMetni.split(",").filter(Boolean).map(Number) }),
    [hedef, konumId, giris, cikis, yetiskin, cocukMetni]
  );
  const misafir = misafirMetni(urlDeger);

  // Üst çubuktaki arama kendi taslağını tutar; adres değişince ondan başlar.
  const [ustDeger, setUstDeger] = React.useState(urlDeger);
  const [oncekiUrl, setOncekiUrl] = React.useState(urlDeger);
  if (oncekiUrl !== urlDeger) {
    setOncekiUrl(urlDeger);
    setUstDeger(urlDeger);
  }

  const otelQ = useQuery({
    queryKey: ["otel-detay", kod],
    queryFn: () => otelGetir(kod),
    staleTime: 10 * 60_000,
    // Olmayan otel için tekrar denemeye gerek yok.
    retry: (n, e) => e.message !== "yok" && n < 1,
  });
  const odaQ = useQuery({
    queryKey: ["odalar", kod, giris, cikis, yetiskin, cocukMetni, uyruk, paraBirimi],
    queryFn: () => odalariGetir(kod, { giris, cikis, yetiskin, cocuklar: urlDeger.cocuklar, uyruk, para: paraBirimi }, { genel: t("odalar.hata"), cokSik: tk("cokSik") }),
    enabled: tarihVar && uyrukHazir,
    staleTime: 5 * 60_000,
    retry: 1,
  });
  const otel = otelQ.data;
  const odalar = React.useMemo(() => [...(odaQ.data?.rooms ?? [])].sort((a, b) => odaToplami(a) - odaToplami(b)), [odaQ.data]);
  const enUcuz = odalar[0] ?? null;

  const [seciliKod, setSeciliKod] = React.useState<string | null>(null);
  const secili = odalar.find((o) => o.priceCode === seciliKod) ?? null;
  const [odaAcik, setOdaAcik] = React.useState<string | null>(null);
  const [pencere, setPencere] = React.useState<null | "odalar" | "olanak" | "aciklama" | "bilgi">(null);
  const [turAcik, setTurAcik] = React.useState(false);
  const [isik, setIsik] = React.useState<{ b: number; j: number } | null>(null);
  const [tarihPaneli, setTarihPaneli] = React.useState<TarihPaneli>(null);
  const [mobilTarih, setMobilTarih] = React.useState(false);
  const [bildiri, setBildiri] = React.useState<string | null>(null);
  const bildiriZaman = React.useRef<ReturnType<typeof setTimeout>>(undefined);
  const bildir = (m: string) => {
    setBildiri(m);
    clearTimeout(bildiriZaman.current);
    bildiriZaman.current = setTimeout(() => setBildiri(null), 2200);
  };

  /* ── Bölüm menüsü ── */
  const galeriRef = React.useRef<HTMLDivElement>(null);
  const rezRef = React.useRef<HTMLDivElement>(null);
  const [navGorunur, setNavGorunur] = React.useState(false);
  const [navFiyat, setNavFiyat] = React.useState(false);
  const [aktifBolum, setAktifBolum] = React.useState(0);
  const yuklendi = !!otel;
  React.useEffect(() => {
    if (!yuklendi) return;
    const gecti = (e: IntersectionObserverEntry) => !e.isIntersecting && e.boundingClientRect.top < 0;
    const g = new IntersectionObserver(([e]) => setNavGorunur(gecti(e)));
    const r = new IntersectionObserver(([e]) => setNavFiyat(gecti(e)));
    if (galeriRef.current) g.observe(galeriRef.current);
    if (rezRef.current) r.observe(rezRef.current);
    const kaydir = () => {
      let a = 0;
      BOLUMLER.forEach((b, i) => {
        const e = document.getElementById(b);
        if (e && e.getBoundingClientRect().top < 140) a = i;
      });
      setAktifBolum(a);
    };
    addEventListener("scroll", kaydir, { passive: true });
    return () => {
      g.disconnect();
      r.disconnect();
      removeEventListener("scroll", kaydir);
    };
  }, [yuklendi]);

  /* ── Eylemler ── */
  const uygula = (d: AramaDegeri) => {
    const p = new URLSearchParams(params.toString());
    if (d.giris && d.cikis) {
      p.set("checkIn", iso(d.giris));
      p.set("checkOut", iso(d.cikis));
    } else {
      p.delete("checkIn");
      p.delete("checkOut");
    }
    p.set("adults", String(d.yetiskin));
    if (d.cocuklar.length) p.set("childAges", d.cocuklar.join(","));
    else p.delete("childAges");
    setSeciliKod(null);
    router.replace(`/hotel/${kod}?${p.toString()}`, { scroll: false });
  };
  const tarihSec = () => {
    if (matchMedia("(max-width: 860px)").matches) return setMobilTarih(true);
    git("odalar");
    setTimeout(() => setTarihPaneli("tarih"), azHareket() ? 0 : 350);
  };
  const [gidiyor, setGidiyor] = React.useState(false);
  const devam = async (oda: Oda | null = secili) => {
    if (!oda || !odaQ.data || gidiyor) return;
    setGidiyor(true);
    let arama: OdaAramasi | undefined = odaQ.data;
    let o: Oda | undefined = oda;
    // Oda araması süresi dolduysa yeniden ara, aynı odayı yeni kayıttan bul.
    if (sureDoldu(arama.expiresAt)) {
      arama = (await odaQ.refetch()).data;
      o = arama?.rooms.find((x) => x.roomCode === oda.roomCode && x.boardType === oda.boardType && x.roomName === oda.roomName);
    }
    if (!arama || !o) {
      setGidiyor(false);
      setSeciliKod(null);
      bildir(t("bildiri.odaKalmadi"));
      return;
    }
    const qs = new URLSearchParams({
      roomSearchId: arama.roomSearchId,
      priceCode: o.priceCode,
      hotelCode: kod,
      hotelName: otel?.name ?? "",
      roomName: o.roomName,
      boardType: o.boardType,
      boardTypeName: o.boardTypeName,
      checkIn: giris,
      checkOut: cikis,
      adults: String(yetiskin),
      childAges: cocukMetni,
      nationality: uyruk,
      currency: o.currency || paraBirimi,
      totalPrice: String(odaToplami(o)),
      // Kampanyadan önceki fiyat (üstü çizili) ve kampanya. Net fiyat sayfaya
      // hiç gelmez; kupon ve rezervasyon fiyat kodunun sunucu kaydından hesaplar.
      originalPrice: String(o.pricing?.oncekiFiyat ?? odaToplami(o)),
      ...(o.pricing?.kampanya ? { kampanya: o.pricing.kampanya.ad, kampanyaYuzde: String(o.pricing.kampanya.yuzde) } : {}),
    });
    if (o.cancellationPolicies?.length) qs.set("cancellationPolicy", JSON.stringify(o.cancellationPolicies));
    // Ödeme girişli; girişsizse pencere açılsın, giriş bitince ödemeye geçilsin.
    if (oturum !== "authenticated") {
      setGidiyor(false);
      return girisPenceresi.ac(`/booking?${qs.toString()}`);
    }
    router.push(`/booking?${qs.toString()}`);
  };
  const odaSec = (o: Oda) => {
    setSeciliKod(o.priceCode);
    setOdaAcik(null);
    bildir(t("bildiri.odaSecildi"));
  };
  const paylas = async () => {
    const url = location.href;
    if (navigator.share && matchMedia("(pointer: coarse)").matches) {
      try {
        await navigator.share({ title: otel?.name, url });
      } catch {}
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      bildir(t("bildiri.baglantiKopyalandi"));
    } catch {
      bildir(t("bildiri.baglantiKopyalanamadi"));
    }
  };
  const kaydet = () => {
    bildir(fav.has(kod) ? t("bildiri.favoridenCikarildi") : t("bildiri.favoriyeEklendi"));
    favDegistir(kod);
  };
  const geri = () => {
    if (history.length > 1 && document.referrer.startsWith(location.origin)) history.back();
    else router.push(hedef ? aramaAdresi(urlDeger) : "/");
  };

  /* ── Türetilenler ── */
  const gorseller = React.useMemo(() => {
    const g = [...(otel?.images ?? [])].sort((a, b) => Number(b.isMain) - Number(a.isMain)).map((i) => i.url);
    return [...new Set(g)];
  }, [otel?.images]);
  const turBolumleri = React.useMemo<TurBolumu[]>(() => {
    const b: TurBolumu[] = gorseller.length ? [{ ad: t("galeri.genelBakis"), gorseller }] : [];
    odalar.forEach((o) => {
      if (o.images.length && !b.some((x) => x.ad === o.roomName)) b.push({ ad: o.roomName, gorseller: o.images });
    });
    return b;
  }, [gorseller, odalar, t]);
  const odaFoto = (o: Oda, j: number) => {
    const b = turBolumleri.findIndex((x) => x.ad === o.roomName);
    if (b >= 0) setIsik({ b, j });
  };

  if (otelQ.isPending) return <Iskelet />;
  if (otelQ.isError || !otel) {
    return (
      <div className={`lb ${s.sayfa}`}>
        <div className={s.ust}>
          <UstCubuk deger={ustDeger} onDegis={setUstDeger} onAra={() => router.push(aramaAdresi(ustDeger))} />
        </div>
        <div className={s.durum}>
          <Nesne ad="zil" boyut={110} />
          <h1 className="lb-y">{otelQ.error?.message === "yok" ? t("hata.yokBaslik") : t("hata.baslik")}</h1>
          <p>{otelQ.error?.message === "yok" ? t("hata.yokMetin") : t("hata.metin")}</p>
          {otelQ.error?.message === "yok" ? (
            <Link href="/" className={s.siyah}>{t("hata.anaSayfa")}</Link>
          ) : (
            <button type="button" className={s.siyah} onClick={() => otelQ.refetch()}>{tk("tekrarDene")}</button>
          )}
        </div>
        <AltBilgi />
      </div>
    );
  }

  const yer = [otel.location?.name, otel.location?.parent?.name].filter(Boolean).join(", ") || otel.address || "";
  const ozetBolum = otel.location?.parent?.name && otel.location.name !== otel.location.parent.name ? `${otel.location.name}, ${otel.location.parent.name}` : yer;
  const olanaklar = otel.facilities ?? [];
  const oneCikan = oneCikanlar(olanaklar, (tur) => t(`oneCikan.${tur}`));
  const iptalliOdalar = odalar.filter((o) => o.cancellationPolicies?.some((p) => p.penalty === 0));
  const ilkIptal = iptalliOdalar[0] ? iptalOzeti(iptalliOdalar[0].cancellationPolicies, bicim).ucretsiz : null;
  const pansiyonlar = [...new Set(odalar.map((o) => o.boardTypeName))];
  const aciklama = (otel.description ?? "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const onemli = (otel.policies?.importantInfo ?? []).flatMap((m) => m.split(/(?<=\.)\s+(?=[A-ZÇĞİÖŞÜ])/)).map((p) => p.trim()).filter(Boolean);
  const bilgiOdasi = secili ?? enUcuz;
  const bilgiIptal = bilgiOdasi ? iptalOzeti(bilgiOdasi.cancellationPolicies, bicim) : null;
  const konum = otel.latitude && otel.longitude ? { lat: otel.latitude, lng: otel.longitude } : null;
  const tarihYazi = tarihVar ? bicim.aralik(girisT!, cikisT!) : null;
  const favori = fav.has(kod);

  // Rezervasyon kutusu, bölüm menüsü ve mobil çubuğun ortak fiyat/düğme durumu.
  const fiyatOdasi = secili ?? enUcuz;
  const fiyat = fiyatOdasi ? yaz(odaToplami(fiyatOdasi), fiyatOdasi.currency) : null;
  const oncekiFiyat = fiyatOdasi && odaOncekiFiyati(fiyatOdasi) ? yaz(odaOncekiFiyati(fiyatOdasi)!, fiyatOdasi.currency) : null;
  const kampanya = fiyatOdasi?.pricing?.kampanya ?? null;
  const anaMetin = !tarihVar ? t("ana.tarihSec") : secili ? t("ana.devam") : t("ana.odaSec");
  const anaEylem = () => (!tarihVar ? tarihSec() : secili ? devam() : git("odalar"));

  const eylemler = (
    <div className={s.eylem}>
      <button type="button" onClick={paylas}>
        <Ikon ad="share" boyut={18} />
        {t("eylem.paylas")}
      </button>
      <button type="button" onClick={kaydet} aria-pressed={favori} className={s.kaydet}>
        <Ikon ad="heart" boyut={18} />
        {favori ? t("eylem.kaydedildi") : t("eylem.kaydet")}
      </button>
    </div>
  );

  let odaGovde: React.ReactNode;
  if (!tarihVar) {
    odaGovde = (
      <div className={s.odaDurum}>
        <Nesne ad="bavul" boyut={64} />
        <div>
          <b>{t("odalar.tarihYok")}</b>
          <span>{t("odalar.tarihYokMetin")}</span>
        </div>
        <button type="button" className={s.dugme} onClick={tarihSec}>{t("ana.tarihSec")}</button>
      </div>
    );
  } else if (odaQ.isPending) {
    odaGovde = (
      <div className={s.odaListe} aria-busy="true">
        <div className={s.odaBekle}>
          <Bekleme tur="takvim" boyut={64} etiket={null} />
          <div>
            <b>{t("odalar.soruluyor")}</b>
            <DonenMetin metinler={[t("odalar.araniyor"), t("odalar.fiyatlarGeliyor")]} aralik={3000} />
          </div>
        </div>
        {[0, 1].map((i) => <div key={i} className={s.odaIskelet} />)}
      </div>
    );
  } else if (odaQ.isError) {
    odaGovde = (
      <div className={s.odaDurum}>
        <Nesne ad="zil" boyut={64} />
        <div>
          <b>{t("odalar.hataBaslik")}</b>
          <span>{odaQ.error?.message || t("odalar.hata")}</span>
        </div>
        <button type="button" className={s.ikincilKucuk} onClick={() => odaQ.refetch()}>{tk("tekrarDene")}</button>
      </div>
    );
  } else if (!odalar.length) {
    odaGovde = (
      <div className={s.odaDurum}>
        <Nesne ad="zil" boyut={64} />
        <div>
          <b>{t("odalar.yok")}</b>
          <span>{t("odalar.yokMetin")}</span>
        </div>
        <button type="button" className={s.ikincilKucuk} onClick={tarihSec}>{t("odalar.tarihDegistir")}</button>
      </div>
    );
  } else {
    odaGovde = (
      <>
        <div className={s.odaListe}>
          {odalar.slice(0, 4).map((o) => (
            <OdaKarti key={o.priceCode} oda={o} gece={gece} misafir={misafir} secili={o.priceCode === seciliKod} onAc={() => setOdaAcik(o.priceCode)} />
          ))}
        </div>
        {odalar.length > 4 && (
          <button type="button" className={s.ikincil} onClick={() => setPencere("odalar")}>
            {t("odalar.tumu", { sayi: odalar.length })}
          </button>
        )}
      </>
    );
  }

  return (
    <div className={`lb ${s.sayfa}`}>
      <div className={s.ust}>
        <UstCubuk deger={ustDeger} onDegis={setUstDeger} onAra={() => router.push(aramaAdresi(ustDeger))} />
      </div>

      <nav className={s.bolumNav} data-gorunur={navGorunur || undefined} aria-label={t("bolumler.etiket")} aria-hidden={!navGorunur}>
        <div className={s.dis}>
          <ul>
            {BOLUMLER.map((b, i) => (
              <li key={b}>
                <a
                  href={`#${b}`}
                  data-aktif={(navGorunur && i === aktifBolum) || undefined}
                  tabIndex={navGorunur ? 0 : -1}
                  onClick={(e) => {
                    e.preventDefault();
                    git(b);
                  }}
                >
                  {t(`bolumler.${b}`)}
                </a>
              </li>
            ))}
          </ul>
          <div className={s.navRez} data-gorunur={(navFiyat && tarihVar && !!fiyat) || undefined}>
            <div>
              <b className="lb-y">{fiyat}</b>
              <span>{t("geceTarih", { gece, tarih: tarihYazi ?? "" })}</span>
            </div>
            <button type="button" className={s.dugme} onClick={anaEylem} tabIndex={navFiyat ? 0 : -1}>{anaMetin}</button>
          </div>
        </div>
      </nav>

      <main className={s.ana}>
        <div className={s.bas}>
          <div className={s.baslik}>
            <div>
              <h1 className="lb-y">{otel.name}</h1>
              <p>
                {otel.stars ? t("baslik.yildizliOtel", { sayi: otel.stars }) : t("baslik.otel")}
                {yer && ` · ${yer}`}
              </p>
            </div>
            {eylemler}
          </div>
          <div ref={galeriRef} className={s.galeri}>
            <Galeri
              gorseller={gorseller}
              onAc={() => setTurAcik(true)}
              ustDugmeler={
                <>
                  <button type="button" className={s.yuzen} onClick={geri} aria-label={tk("geri")}>
                    <Ikon ad="back" boyut={18} />
                  </button>
                  <div className={s.yuzenGrup}>
                    <button type="button" className={s.yuzen} onClick={paylas} aria-label={t("eylem.paylas")}>
                      <Ikon ad="share" boyut={18} />
                    </button>
                    <button type="button" className={`${s.yuzen} ${s.kaydet}`} onClick={kaydet} aria-pressed={favori} aria-label={t("eylem.kaydet")}>
                      <Ikon ad="heart" boyut={18} />
                    </button>
                  </div>
                </>
              }
            />
          </div>
        </div>

        <div className={s.govde}>
          <div className={s.sol}>
            <section className={s.ozet}>
              <h2>{t("ozet.baslik", { yer: ozetBolum })}</h2>
              <p>
                {[
                  tarihVar && odaQ.isSuccess && odalar.length ? t("ozet.musaitOda", { sayi: odalar.length }) : null,
                  pansiyonlar.slice(0, 2).join(", ") || null,
                  otel.policies?.checkInFrom
                    ? otel.policies.checkOutUntil
                      ? t("ozet.girisCikis", { giris: otel.policies.checkInFrom, cikis: otel.policies.checkOutUntil })
                      : t("ozet.giris", { giris: otel.policies.checkInFrom })
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {iptalliOdalar.length > 0 && (
                <div className={s.rozetler}>
                  <span className={s.rozet}>
                    <Ikon ad="check" boyut={14} kalinlik={2.4} />
                    {t("ozet.ucretsizIptal")}
                  </span>
                </div>
              )}
            </section>

            {(oneCikan.length > 0 || ilkIptal) && (
              <section className={s.oneCikan} aria-label={t("oneCikan.etiket")}>
                <ul>
                  {oneCikan.map((o) => (
                    <li key={o.baslik}>
                      <Nesne ad={o.nesne} boyut={44} />
                      <div>
                        <b>{o.baslik}</b>
                        <span>{o.aciklama}</span>
                      </div>
                    </li>
                  ))}
                  {ilkIptal && (
                    <li>
                      <Nesne ad="iptal" boyut={44} />
                      <div>
                        <b>{t("iptal.ucretsizKadar", { tarih: ilkIptal.yonelme })}</b>
                        <span>
                          {iptalliOdalar.length === odalar.length ? t("oneCikan.iptalHepsi") : t("oneCikan.iptalBazi", { sayi: iptalliOdalar.length })}
                        </span>
                      </div>
                    </li>
                  )}
                </ul>
              </section>
            )}

            {aciklama.length > 0 && (
              <section className={s.aciklama}>
                <div className={s.metin}>
                  {aciklama.map((p, i) => <p key={i}>{p}</p>)}
                </div>
                <button type="button" className={s.metinDugme} onClick={() => setPencere("aciklama")}>
                  {t("aciklama.devami")} <Ikon ad="chevron-right" boyut={16} kalinlik={2.2} />
                </button>
              </section>
            )}

            <section id="odalar" className={s.odalar}>
              <div className={s.odaUst}>
                <h2>{t("odalar.baslik")}</h2>
                {tarihVar && <p>{t("odalar.altBaslik", { tarih: tarihYazi ?? "", misafir, gece })}</p>}
              </div>
              {odaGovde}
            </section>

            {olanaklar.length > 0 && (
              <section id="olanaklar" className={s.olanak}>
                <h2>{t("olanaklar.baslik")}</h2>
                <ul>
                  {oneCikanOlanaklar(olanaklar).map((o) => (
                    <li key={o.id}>
                      <Ikon ad={olanakIkonu(o.name)} boyut={24} />
                      <span>{o.name.trim()}</span>
                    </li>
                  ))}
                </ul>
                {olanaklar.length > 10 && (
                  <button type="button" className={s.ikincil} onClick={() => setPencere("olanak")}>
                    {t("olanaklar.tumu", { sayi: olanaklar.length })}
                  </button>
                )}
              </section>
            )}
          </div>

          <aside className={s.rez} aria-label={t("rez.etiket")}>
            {oturum === "unauthenticated" && (
              <div className={s.teklif}>
                <Nesne ad="indirim" boyut={52} />
                <div>
                  <b>{t("rez.teklifBaslik")}</b>
                  <span>
                    {t("rez.teklifMetin")}{" "}
                    <button type="button" className={s.metinDugme} onClick={() => girisPenceresi.ac()}>{t("rez.girisYap")}</button>
                  </span>
                </div>
              </div>
            )}
            <div ref={rezRef} className={s.rezKart}>
              <div className={s.rezFiyat}>
                {!tarihVar ? (
                  <span className={s.rezBaslik}>{t("odalar.tarihYok")}</span>
                ) : odaQ.isPending ? (
                  <span className={s.fiyatBekle}>
                    <Bekleme tur="takvim" boyut={40} etiket={null} />
                    <span>{t("rez.fiyatlarGeliyor")}</span>
                  </span>
                ) : fiyat ? (
                  <>
                    {oncekiFiyat && <s className={s.onceki}>{oncekiFiyat}</s>}
                    <b className="lb-y">{fiyat}</b> <span>{secili ? t("rez.geceIcin", { gece }) : t("rez.geceIcinEnUygun", { gece })}</span>
                  </>
                ) : (
                  <span className={s.rezBaslik}>{t("odalar.yok")}</span>
                )}
              </div>
              {kampanya && tarihVar && !odaQ.isPending && (
                <div className={s.kampanya}>
                  <Ikon ad="discount" boyut={20} kalinlik={2} />
                  <div>
                    <b>{t("rez.kampanya", { ad: kampanya.ad, yuzde: kampanya.yuzde })}</b>
                    <span>{t(`rez.kampanyaAciklama.${KAMPANYA_ACIKLAMA[kampanya.tur] ?? "tarihAraligi"}`)}</span>
                  </div>
                </div>
              )}
              <TarihAlani deger={urlDeger} panel={tarihPaneli} onPanel={setTarihPaneli} onUygula={uygula} />
              {secili && (
                <div className={s.secilen} key={secili.priceCode}>
                  <div>
                    <b>{secili.roomName}</b>
                    <span>
                      {secili.boardTypeName} · {iptalOzeti(secili.cancellationPolicies, bicim).ucretsiz ? t("iptal.ucretsizKadar", { tarih: iptalOzeti(secili.cancellationPolicies, bicim).ucretsiz!.yonelme }) : t("iptal.iadeEdilmez")}
                    </span>
                  </div>
                  <button type="button" className={s.metinDugme} onClick={() => setOdaAcik(secili.priceCode)}>{t("rez.degistir")}</button>
                </div>
              )}
              {secili && (
                <div className={s.dokum}>
                  <div>
                    <span>{t("fiyat.geceCarpi", { fiyat: yaz((odaOncekiFiyati(secili) ?? odaToplami(secili)) / gece, secili.currency), gece })}</span>
                    <span>{yaz(odaOncekiFiyati(secili) ?? odaToplami(secili), secili.currency)}</span>
                  </div>
                  {secili.pricing?.kampanya && (
                    <div className={s.dokumIndirim}>
                      <span>{secili.pricing.kampanya.ad}</span>
                      <span>−{yaz(secili.pricing.kampanya.tutar, secili.currency)}</span>
                    </div>
                  )}
                  <div className={s.toplam}>
                    <span>{t("fiyat.toplam")}</span>
                    <span>{yaz(odaToplami(secili), secili.currency)}</span>
                  </div>
                </div>
              )}
              <div className={s.rezAlt}>
                <p>{t("rez.odemeYok")}</p>
                <button type="button" className={s.dugme} onClick={anaEylem} disabled={gidiyor || (tarihVar && !odaQ.isPending && !odalar.length)}>
                  {gidiyor ? t("ana.hazirlaniyor") : anaMetin}
                </button>
              </div>
            </div>
          </aside>
        </div>

        {konum && (
          <section id="konum" className={s.tam}>
            <h2>{t("konum.baslik")}</h2>
            <div className={s.harita}>
              <KonumHaritasi konum={konum} className={s.haritaIc} yedek={<div className={s.haritaYedek}>{t("konum.haritaYok")}</div>} />
            </div>
            <div className={s.haritaAlt}>
              <div>
                <b>{yer}</b>
                {otel.address && otel.address !== yer && <span>{otel.address}</span>}
              </div>
              <a className={s.metinDugme} href={`https://www.google.com/maps/search/?api=1&query=${konum.lat},${konum.lng}`} target="_blank" rel="noopener noreferrer">
                {t("konum.googleHaritalar")} <Ikon ad="chevron-right" boyut={16} kalinlik={2.2} />
              </a>
            </div>
          </section>
        )}

        <section id="bilinmesi" className={s.tam}>
          <h2>{t("bilinmesi.baslik")}</h2>
          <div className={s.bilinmesi}>
            <div>
              <h3>{t("bilinmesi.kurallar")}</h3>
              <ul>
                {otel.policies?.checkInFrom && <li><Ikon ad="clock" boyut={20} /><span>{t("bilinmesi.girisSaati", { saat: otel.policies.checkInFrom })}</span></li>}
                {otel.policies?.checkOutUntil && <li><Ikon ad="clock" boyut={20} /><span>{t("bilinmesi.cikisSaati", { saat: otel.policies.checkOutUntil })}</span></li>}
                {otel.policies?.childrenText && <li><Ikon ad="child" boyut={20} /><span>{otel.policies.childrenText}</span></li>}
                {!otel.policies?.checkInFrom && !otel.policies?.checkOutUntil && <li><Ikon ad="info" boyut={20} /><span>{t("bilinmesi.saatlerTeyit")}</span></li>}
              </ul>
            </div>
            <div>
              <h3>{t("iptal.baslik")}</h3>
              <ul>
                {bilgiIptal?.ucretsiz ? (
                  <li><Ikon ad="free-cancel" boyut={20} /><span>{t("bilinmesi.ucretsizIptalSaat", { tarih: bilgiIptal.ucretsiz.yonelme, saat: bilgiIptal.ucretsiz.saat })}</span></li>
                ) : bilgiIptal?.ceza ? (
                  <li><Ikon ad="info" boyut={20} /><span>{t("bilinmesi.iadeEdilmez")}</span></li>
                ) : (
                  <li><Ikon ad="free-cancel" boyut={20} /><span>{t("bilinmesi.odayaGore")}</span></li>
                )}
                {bilgiIptal?.ucretsiz && bilgiIptal.ceza && (
                  <li><Ikon ad="info" boyut={20} /><span>{t("bilinmesi.sonraUcret", { tutar: yaz(bilgiIptal.ceza.tutar, bilgiIptal.ceza.para) })}</span></li>
                )}
              </ul>
            </div>
            {onemli.length > 0 && (
              <div>
                <h3>{t("bilinmesi.onemli")}</h3>
                <ul>
                  <li className={s.kirp}><Ikon ad="secure" boyut={20} /><span>{onemli[0]}</span></li>
                </ul>
                <button type="button" className={s.metinDugme} onClick={() => setPencere("bilgi")}>
                  {t("bilinmesi.dahaFazla")} <Ikon ad="chevron-right" boyut={16} kalinlik={2.2} />
                </button>
              </div>
            )}
          </div>
        </section>
      </main>

      <AltBilgi />

      <div className={s.mobilCubuk}>
        <div>
          {tarihVar && fiyat ? <b className="lb-y">{fiyat}</b> : <b>{tarihVar ? (odaQ.isPending ? t("mobil.fiyatlarGeliyor") : t("mobil.odaYok")) : t("mobil.tarihSec")}</b>}
          <button type="button" onClick={() => setMobilTarih(true)}>
            {tarihVar ? t("geceTarih", { gece, tarih: tarihYazi ?? "" }) : t("mobil.tarihEkle")}
          </button>
        </div>
        <button type="button" className={s.dugme} onClick={anaEylem} disabled={gidiyor || (tarihVar && !odaQ.isPending && !odalar.length)}>
          {gidiyor ? t("ana.hazirlaniyor") : anaMetin}
        </button>
      </div>

      <Pencere acik={pencere === "odalar"} onKapat={() => setPencere(null)} baslik={tarihYazi ? t("odalar.pencereTarih", { tarih: tarihYazi }) : t("odalar.pencere")} genislik={820}>
        <div className={s.odaListe}>
          {odalar.map((o) => (
            <OdaKarti key={o.priceCode} oda={o} gece={gece} misafir={misafir} secili={o.priceCode === seciliKod} liste onAc={() => { setPencere(null); setOdaAcik(o.priceCode); }} />
          ))}
        </div>
      </Pencere>
      <Pencere acik={pencere === "olanak"} onKapat={() => setPencere(null)} baslik={t("olanaklar.baslik")}>
        <div className={s.tumOlanak}>
          {olanakGruplari(olanaklar, (g) => t(`olanakGrubu.${g}`)).map(([k, v]) => (
            <section key={k}>
              <h3>{k}</h3>
              <ul>
                {v.map((o) => (
                  <li key={o.id}>
                    <Ikon ad={olanakIkonu(o.name)} boyut={24} />
                    <span>{o.name.trim()}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </Pencere>
      <Pencere acik={pencere === "aciklama"} onKapat={() => setPencere(null)} baslik={t("aciklama.pencere")}>
        <div className={s.pencereMetin}>{aciklama.map((p, i) => <p key={i}>{p}</p>)}</div>
      </Pencere>
      <Pencere acik={pencere === "bilgi"} onKapat={() => setPencere(null)} baslik={t("bilinmesi.onemli")}>
        <div className={s.pencereMetin}>{onemli.map((p, i) => <p key={i}>{p}</p>)}</div>
      </Pencere>

      <OdaPenceresi
        baslangic={odaAcik}
        odalar={odalar}
        gece={gece}
        misafir={misafir}
        seciliKod={seciliKod}
        onSec={odaSec}
        onDevam={() => {
          setOdaAcik(null);
          devam();
        }}
        onKapat={() => setOdaAcik(null)}
        onFoto={odaFoto}
      />
      <FotoTuru
        acik={turAcik}
        onKapat={() => setTurAcik(false)}
        bolumler={turBolumleri}
        onFoto={(b, j) => setIsik({ b, j })}
        ustSag={<div className={s.eylem}><button type="button" onClick={paylas}><Ikon ad="share" boyut={18} />{t("eylem.paylas")}</button></div>}
      />
      <IsikKutusu konum={isik} bolumler={turBolumleri} onKapat={() => setIsik(null)} onDegis={(j) => setIsik((k) => (k ? { ...k, j } : k))} />
      <TarihPenceresi acik={mobilTarih} deger={urlDeger} onKapat={() => setMobilTarih(false)} onUygula={uygula} />

      {bildiri && <div className={s.bildiri} role="status">{bildiri}</div>}
    </div>
  );
}

function OdaKarti({ oda, gece, misafir, secili, liste, onAc }: {
  oda: Oda;
  gece: number;
  misafir: string;
  secili: boolean;
  liste?: boolean;
  onAc: () => void;
}) {
  const t = useTranslations("otel");
  const bicim = useBicim();
  const { yaz } = useFiyat();
  const ip = iptalOzeti(oda.cancellationPolicies, bicim);
  const yatak = oda.attributes?.find((a) => a.categoryName === "Yatak")?.name;
  return (
    <button type="button" className={s.oda} data-liste={liste || undefined} data-secili={secili || undefined} onClick={onAc}>
      <span className={s.odaFoto}>
        {oda.images[0] ? <img src={oda.images[0]} alt="" loading="lazy" /> : <Nesne ad="zil" boyut={40} />}
        {oda.images.length > 0 && (
          <small>
            <Ikon ad="photos" boyut={12} kalinlik={2.2} /> {oda.images.length}
          </small>
        )}
      </span>
      <span className={s.odaBilgi}>
        <b>{oda.roomName}</b>
        <span>{[yatak, misafir, oda.boardTypeName].filter(Boolean).join(" · ")}</span>
        {ip.ucretsiz ? (
          <span className={s.yesil}>
            <Ikon ad="check" boyut={16} kalinlik={2.2} /> {t("iptal.ucretsizKadar", { tarih: ip.ucretsiz.yonelme })}
          </span>
        ) : (
          <span>{t("iptal.iadeEdilmez")}</span>
        )}
      </span>
      <span className={s.odaFiyat}>
        {odaOncekiFiyati(oda) && <s>{yaz(odaOncekiFiyati(oda)!, oda.currency)}</s>}
        <b className="lb-y">{yaz(odaToplami(oda), oda.currency)}</b>
        <small>{t("odalar.geceToplam", { gece })}</small>
      </span>
    </button>
  );
}

function HaritaBekleme() {
  const t = useTranslations("otel");
  return <div className={s.haritaYedek}>{t("konum.haritaYukleniyor")}</div>;
}

function Iskelet() {
  const t = useTranslations("otel");
  return (
    <div className={`lb ${s.sayfa}`} aria-busy="true" aria-label={t("yukleniyor")}>
      <div className={s.ana}>
        <div className={s.iskeletBaslik}><i /><i /></div>
        <div className={s.iskeletGaleri} />
        <div className={s.govde}>
          <div className={s.iskeletSatirlar}><i /><i /><i /><i /></div>
          <div className={s.iskeletKart} />
        </div>
      </div>
    </div>
  );
}
