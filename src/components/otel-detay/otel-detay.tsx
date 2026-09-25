"use client";
/* eslint-disable @next/next/no-img-element -- otel ve oda görselleri dış kaynaklı (tedarikçi) */

// Otel detay sayfası (Airbnb düzeni): başlık ve fotoğraf ızgarası, solda özet,
// öne çıkanlar, açıklama, odalar ve olanaklar; sağda yapışık rezervasyon
// kutusu. Galeri geçilince bölüm menüsü iner, rezervasyon kutusu da geçilince
// fiyat ve düğme menüye taşınır. Odalar pencerede açılır (solda oda rayı);
// seçilen oda ödeme sayfasına aynı parametrelerle gider.

import * as React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { UstCubuk } from "@/components/lb/ust-cubuk";
import { AltBilgi } from "@/components/lb/alt-bilgi";
import { Ikon } from "@/components/lb/ikon";
import { Nesne } from "@/components/lb/nesne";
import { Pencere } from "@/components/lb/pencere";
import { useFavoriler } from "@/components/lb/favoriler";
import { useGiris } from "@/components/lb/giris/giris-saglayici";
import { aralikMetni, aramaAdresi, geceSayisi, iso, isoOku, misafirMetni, type AramaDegeri } from "@/components/lb/arama/durum";
import type { HotelDetailResponse } from "@/lib/royal-api/types";
import { FotoTuru, Galeri, IsikKutusu, type TurBolumu } from "./galeri";
import { OdaPenceresi, odaToplami, type Oda } from "./oda-penceresi";
import { TarihAlani, TarihPenceresi, type TarihPaneli } from "./tarih-alani";
import { iptalOzeti, olanakGruplari, olanakIkonu, oneCikanlar, oneCikanOlanaklar, para } from "./yardimci";
import s from "./otel-detay.module.css";

const KonumHaritasi = dynamic(() => import("./konum-haritasi").then((m) => m.KonumHaritasi), {
  ssr: false,
  loading: () => <div className={s.haritaYedek}>Harita yükleniyor…</div>,
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

async function otelGetir(kod: string): Promise<OtelVerisi> {
  const r = await fetch(`/api/hotels/${kod}`);
  if (!r.ok) throw new Error(r.status === 404 ? "yok" : "hata");
  return r.json();
}

async function odalariGetir(kod: string, a: { giris: string; cikis: string; yetiskin: number; cocuklar: number[]; uyruk: string; para: string }): Promise<OdaAramasi> {
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
  if (!r.ok) throw new Error("Odalar alınamadı");
  return r.json();
}

const BOLUMLER = [
  { id: "fotograflar", ad: "Fotoğraflar" },
  { id: "odalar", ad: "Odalar" },
  { id: "olanaklar", ad: "Olanaklar" },
  { id: "konum", ad: "Konum" },
  { id: "bilinmesi", ad: "Bilinmesi gerekenler" },
];

/** Oda aramasının süresi (neredeyse) doldu mu — ödemeye geçmeden yenilemek için. */
const sureDoldu = (bitis: string) => Date.parse(bitis) - Date.now() < 60_000;
const azHareket = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const git = (id: string) => {
  const e = document.getElementById(id);
  if (e) scrollTo({ top: e.getBoundingClientRect().top + scrollY - 90, behavior: azHareket() ? "auto" : "smooth" });
};

export function OtelDetay({ kod }: { kod: string }) {
  const params = useSearchParams();
  const router = useRouter();
  const { status: oturum } = useSession();
  const girisPenceresi = useGiris();
  const { fav, degistir: favDegistir } = useFavoriler();

  const giris = params.get("checkIn") ?? "";
  const cikis = params.get("checkOut") ?? "";
  const yetiskin = parseInt(params.get("adults") ?? "2", 10) || 2;
  const cocukMetni = params.get("childAges") ?? "";
  const uyruk = params.get("nationality") ?? "TR";
  const paraBirimi = params.get("currency") ?? "EUR";
  const hedef = params.get("destination") ?? "";
  const girisT = isoOku(giris);
  const cikisT = isoOku(cikis);
  const tarihVar = !!(girisT && cikisT && cikisT > girisT);
  const gece = tarihVar ? Math.max(1, geceSayisi(girisT!, cikisT!)) : 1;
  const urlDeger = React.useMemo<AramaDegeri>(
    () => ({ yer: hedef, yerUst: null, giris: isoOku(giris), cikis: isoOku(cikis), yetiskin, cocuklar: cocukMetni.split(",").filter(Boolean).map(Number) }),
    [hedef, giris, cikis, yetiskin, cocukMetni]
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
    queryFn: () => odalariGetir(kod, { giris, cikis, yetiskin, cocuklar: urlDeger.cocuklar, uyruk, para: paraBirimi }),
    enabled: tarihVar,
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
        const e = document.getElementById(b.id);
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
      bildir("Bu oda artık müsait değil, başka bir oda seçin");
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
      originalPrice: String(o.pricing?.originalPrice ?? o.totalPrice),
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
    bildir("Oda seçildi");
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
      bildir("Bağlantı kopyalandı");
    } catch {
      bildir("Bağlantı kopyalanamadı");
    }
  };
  const kaydet = () => {
    bildir(fav.has(kod) ? "Favorilerden çıkarıldı" : "Favorilere eklendi");
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
    const b: TurBolumu[] = gorseller.length ? [{ ad: "Genel bakış", gorseller }] : [];
    odalar.forEach((o) => {
      if (o.images.length && !b.some((x) => x.ad === o.roomName)) b.push({ ad: o.roomName, gorseller: o.images });
    });
    return b;
  }, [gorseller, odalar]);
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
          <h1 className="lb-y">{otelQ.error?.message === "yok" ? "Bu oteli bulamadık" : "Otel bilgisi şu an alınamadı"}</h1>
          <p>{otelQ.error?.message === "yok" ? "Bağlantı eski olabilir; aramadan tekrar bakabilirsin." : "Birazdan tekrar dene."}</p>
          {otelQ.error?.message === "yok" ? (
            <Link href="/" className={s.siyah}>Ana sayfaya dön</Link>
          ) : (
            <button type="button" className={s.siyah} onClick={() => otelQ.refetch()}>Tekrar dene</button>
          )}
        </div>
        <AltBilgi />
      </div>
    );
  }

  const yer = [otel.location?.name, otel.location?.parent?.name].filter(Boolean).join(", ") || otel.address || "";
  const ozetBolum = otel.location?.parent?.name && otel.location.name !== otel.location.parent.name ? `${otel.location.name}, ${otel.location.parent.name}` : yer;
  const olanaklar = otel.facilities ?? [];
  const oneCikan = oneCikanlar(olanaklar);
  const iptalliOdalar = odalar.filter((o) => o.cancellationPolicies?.some((p) => p.penalty === 0));
  const ilkIptal = iptalliOdalar[0] ? iptalOzeti(iptalliOdalar[0].cancellationPolicies).ucretsiz : null;
  const pansiyonlar = [...new Set(odalar.map((o) => o.boardTypeName))];
  const aciklama = (otel.description ?? "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const onemli = (otel.policies?.importantInfo ?? []).flatMap((m) => m.split(/(?<=\.)\s+(?=[A-ZÇĞİÖŞÜ])/)).map((p) => p.trim()).filter(Boolean);
  const bilgiOdasi = secili ?? enUcuz;
  const bilgiIptal = bilgiOdasi ? iptalOzeti(bilgiOdasi.cancellationPolicies) : null;
  const konum = otel.latitude && otel.longitude ? { lat: otel.latitude, lng: otel.longitude } : null;
  const tarihYazi = tarihVar ? aralikMetni(girisT!, cikisT!) : null;
  const favori = fav.has(kod);

  // Rezervasyon kutusu, bölüm menüsü ve mobil çubuğun ortak fiyat/düğme durumu.
  const fiyatOdasi = secili ?? enUcuz;
  const fiyat = fiyatOdasi ? para(odaToplami(fiyatOdasi), fiyatOdasi.currency) : null;
  const anaMetin = !tarihVar ? "Tarih seç" : secili ? "Rezervasyona devam et" : "Oda seç";
  const anaEylem = () => (!tarihVar ? tarihSec() : secili ? devam() : git("odalar"));

  const eylemler = (
    <div className={s.eylem}>
      <button type="button" onClick={paylas}>
        <Ikon ad="share" boyut={18} />
        Paylaş
      </button>
      <button type="button" onClick={kaydet} aria-pressed={favori} className={s.kaydet}>
        <Ikon ad="heart" boyut={18} />
        {favori ? "Kaydedildi" : "Kaydet"}
      </button>
    </div>
  );

  let odaGovde: React.ReactNode;
  if (!tarihVar) {
    odaGovde = (
      <div className={s.odaDurum}>
        <Nesne ad="bavul" boyut={64} />
        <div>
          <b>Fiyatları görmek için tarih seçin</b>
          <span>Seçtiğin tarihlerde müsait odaları ve toplam fiyatı gösterelim.</span>
        </div>
        <button type="button" className={s.dugme} onClick={tarihSec}>Tarih seç</button>
      </div>
    );
  } else if (odaQ.isPending) {
    odaGovde = <div className={s.odaListe} aria-busy="true" aria-label="Odalar aranıyor">{[0, 1, 2].map((i) => <div key={i} className={s.odaIskelet} />)}</div>;
  } else if (odaQ.isError) {
    odaGovde = (
      <div className={s.odaDurum}>
        <Nesne ad="zil" boyut={64} />
        <div>
          <b>Odalar şu an getirilemedi</b>
          <span>Bağlantıda bir sorun oldu; birazdan tekrar dene.</span>
        </div>
        <button type="button" className={s.ikincilKucuk} onClick={() => odaQ.refetch()}>Tekrar dene</button>
      </div>
    );
  } else if (!odalar.length) {
    odaGovde = (
      <div className={s.odaDurum}>
        <Nesne ad="zil" boyut={64} />
        <div>
          <b>Bu tarihlerde müsait oda yok</b>
          <span>Farklı tarihler ya da misafir sayısı deneyebilirsin.</span>
        </div>
        <button type="button" className={s.ikincilKucuk} onClick={tarihSec}>Tarihleri değiştir</button>
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
            {odalar.length} seçeneğin tamamını göster
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

      <nav className={s.bolumNav} data-gorunur={navGorunur || undefined} aria-label="Sayfa bölümleri" aria-hidden={!navGorunur}>
        <div className={s.dis}>
          <ul>
            {BOLUMLER.map((b, i) => (
              <li key={b.id}>
                <a
                  href={`#${b.id}`}
                  data-aktif={(navGorunur && i === aktifBolum) || undefined}
                  tabIndex={navGorunur ? 0 : -1}
                  onClick={(e) => {
                    e.preventDefault();
                    git(b.id);
                  }}
                >
                  {b.ad}
                </a>
              </li>
            ))}
          </ul>
          <div className={s.navRez} data-gorunur={(navFiyat && tarihVar && !!fiyat) || undefined}>
            <div>
              <b className="lb-y">{fiyat}</b>
              <span>{gece} gece · {tarihYazi}</span>
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
                {otel.stars ? `${otel.stars} yıldızlı otel` : "Otel"}
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
                  <button type="button" className={s.yuzen} onClick={geri} aria-label="Geri">
                    <Ikon ad="back" boyut={18} />
                  </button>
                  <div className={s.yuzenGrup}>
                    <button type="button" className={s.yuzen} onClick={paylas} aria-label="Paylaş">
                      <Ikon ad="share" boyut={18} />
                    </button>
                    <button type="button" className={`${s.yuzen} ${s.kaydet}`} onClick={kaydet} aria-pressed={favori} aria-label="Kaydet">
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
              <h2>Otel · {ozetBolum}</h2>
              <p>
                {[
                  tarihVar && odaQ.isSuccess && odalar.length ? `${odalar.length} oda seçeneği müsait` : null,
                  pansiyonlar.slice(0, 2).join(", ") || null,
                  otel.policies?.checkInFrom ? `Giriş ${otel.policies.checkInFrom}${otel.policies.checkOutUntil ? `, çıkış ${otel.policies.checkOutUntil}` : ""}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {iptalliOdalar.length > 0 && (
                <div className={s.rozetler}>
                  <span className={s.rozet}>
                    <Ikon ad="check" boyut={14} kalinlik={2.4} />
                    Ücretsiz iptal seçenekleri
                  </span>
                </div>
              )}
            </section>

            {(oneCikan.length > 0 || ilkIptal) && (
              <section className={s.oneCikan} aria-label="Öne çıkanlar">
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
                        <b>{ilkIptal.yonelme} kadar ücretsiz iptal</b>
                        <span>
                          {iptalliOdalar.length === odalar.length ? "Bu tarihlerdeki bütün odalarda geçerli." : `Ücretsiz iptalli ${iptalliOdalar.length} oda seçeneği var.`}
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
                  Devamını göster <Ikon ad="chevron-right" boyut={16} kalinlik={2.2} />
                </button>
              </section>
            )}

            <section id="odalar" className={s.odalar}>
              <div className={s.odaUst}>
                <h2>Odanızı seçin</h2>
                {tarihVar && <p>{tarihYazi} · {misafir} · fiyatlar {gece} gece için</p>}
              </div>
              {odaGovde}
            </section>

            {olanaklar.length > 0 && (
              <section id="olanaklar" className={s.olanak}>
                <h2>Bu otel size neler sunuyor?</h2>
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
                    {olanaklar.length} olanağın tümünü göster
                  </button>
                )}
              </section>
            )}
          </div>

          <aside className={s.rez} aria-label="Rezervasyon">
            {oturum === "unauthenticated" && (
              <div className={s.teklif}>
                <Nesne ad="indirim" boyut={52} />
                <div>
                  <b>Üyelere özel fırsatlar</b>
                  <span>
                    Giriş yapınca rezervasyonların ve favorilerin tek yerde.{" "}
                    <button type="button" className={s.metinDugme} onClick={() => girisPenceresi.ac()}>Giriş yap</button>
                  </span>
                </div>
              </div>
            )}
            <div ref={rezRef} className={s.rezKart}>
              <div className={s.rezFiyat}>
                {!tarihVar ? (
                  <span className={s.rezBaslik}>Fiyatları görmek için tarih seçin</span>
                ) : odaQ.isPending ? (
                  <span className={s.fiyatIskelet} aria-label="Fiyat aranıyor" />
                ) : fiyat ? (
                  <>
                    <b className="lb-y">{fiyat}</b> <span>{gece} gece için{secili ? "" : ", en uygun oda"}</span>
                  </>
                ) : (
                  <span className={s.rezBaslik}>Bu tarihlerde müsait oda yok</span>
                )}
              </div>
              <TarihAlani deger={urlDeger} panel={tarihPaneli} onPanel={setTarihPaneli} onUygula={uygula} />
              {secili && (
                <div className={s.secilen} key={secili.priceCode}>
                  <div>
                    <b>{secili.roomName}</b>
                    <span>
                      {secili.boardTypeName} · {iptalOzeti(secili.cancellationPolicies).ucretsiz ? `${iptalOzeti(secili.cancellationPolicies).ucretsiz!.yonelme} kadar ücretsiz iptal` : "İade edilmez"}
                    </span>
                  </div>
                  <button type="button" className={s.metinDugme} onClick={() => setOdaAcik(secili.priceCode)}>Değiştir</button>
                </div>
              )}
              {secili && (
                <div className={s.dokum}>
                  <div>
                    <span>{para(odaToplami(secili) / gece, secili.currency)} × {gece} gece</span>
                    <span>{para(odaToplami(secili), secili.currency)}</span>
                  </div>
                  <div className={s.toplam}>
                    <span>Toplam</span>
                    <span>{para(odaToplami(secili), secili.currency)}</span>
                  </div>
                </div>
              )}
              <div className={s.rezAlt}>
                <p>Henüz ödeme alınmaz</p>
                <button type="button" className={s.dugme} onClick={anaEylem} disabled={gidiyor || (tarihVar && !odaQ.isPending && !odalar.length)}>
                  {gidiyor ? "Hazırlanıyor…" : anaMetin}
                </button>
              </div>
            </div>
          </aside>
        </div>

        {konum && (
          <section id="konum" className={s.tam}>
            <h2>Nerede olacaksınız?</h2>
            <div className={s.harita}>
              <KonumHaritasi konum={konum} className={s.haritaIc} yedek={<div className={s.haritaYedek}>Harita şu an gösterilemiyor.</div>} />
            </div>
            <div className={s.haritaAlt}>
              <div>
                <b>{yer}</b>
                {otel.address && otel.address !== yer && <span>{otel.address}</span>}
              </div>
              <a className={s.metinDugme} href={`https://www.google.com/maps/search/?api=1&query=${konum.lat},${konum.lng}`} target="_blank" rel="noopener noreferrer">
                Google Haritalar&apos;da aç <Ikon ad="chevron-right" boyut={16} kalinlik={2.2} />
              </a>
            </div>
          </section>
        )}

        <section id="bilinmesi" className={s.tam}>
          <h2>Bilinmesi gerekenler</h2>
          <div className={s.bilinmesi}>
            <div>
              <h3>Otel kuralları</h3>
              <ul>
                {otel.policies?.checkInFrom && <li><Ikon ad="clock" boyut={20} /><span>Giriş saati: {otel.policies.checkInFrom} ve sonrası</span></li>}
                {otel.policies?.checkOutUntil && <li><Ikon ad="clock" boyut={20} /><span>Çıkış saati: en geç {otel.policies.checkOutUntil}</span></li>}
                {otel.policies?.childrenText && <li><Ikon ad="child" boyut={20} /><span>{otel.policies.childrenText}</span></li>}
                {!otel.policies?.checkInFrom && !otel.policies?.checkOutUntil && <li><Ikon ad="info" boyut={20} /><span>Giriş ve çıkış saatleri otelden teyit edilir</span></li>}
              </ul>
            </div>
            <div>
              <h3>İptal koşulları</h3>
              <ul>
                {bilgiIptal?.ucretsiz ? (
                  <li><Ikon ad="free-cancel" boyut={20} /><span>{bilgiIptal.ucretsiz.yonelme} kadar ücretsiz iptal (saat {bilgiIptal.ucretsiz.saat})</span></li>
                ) : bilgiIptal?.ceza ? (
                  <li><Ikon ad="info" boyut={20} /><span>Bu oda iade edilmez</span></li>
                ) : (
                  <li><Ikon ad="free-cancel" boyut={20} /><span>İptal koşulları odaya göre değişir; oda seçince gösterilir</span></li>
                )}
                {bilgiIptal?.ucretsiz && bilgiIptal.ceza && (
                  <li><Ikon ad="info" boyut={20} /><span>Sonrasında iptal ücreti {para(bilgiIptal.ceza.tutar, bilgiIptal.ceza.para)}</span></li>
                )}
              </ul>
            </div>
            {onemli.length > 0 && (
              <div>
                <h3>Önemli bilgiler</h3>
                <ul>
                  <li className={s.kirp}><Ikon ad="secure" boyut={20} /><span>{onemli[0]}</span></li>
                </ul>
                <button type="button" className={s.metinDugme} onClick={() => setPencere("bilgi")}>
                  Daha fazla bilgi <Ikon ad="chevron-right" boyut={16} kalinlik={2.2} />
                </button>
              </div>
            )}
          </div>
        </section>
      </main>

      <AltBilgi />

      <div className={s.mobilCubuk}>
        <div>
          {tarihVar && fiyat ? <b className="lb-y">{fiyat}</b> : <b>{tarihVar ? (odaQ.isPending ? "Fiyatlar geliyor…" : "Müsait oda yok") : "Fiyat için tarih seç"}</b>}
          <button type="button" onClick={() => setMobilTarih(true)}>
            {tarihVar ? `${gece} gece · ${tarihYazi}` : "Tarih ekle"}
          </button>
        </div>
        <button type="button" className={s.dugme} onClick={anaEylem} disabled={gidiyor || (tarihVar && !odaQ.isPending && !odalar.length)}>
          {gidiyor ? "Hazırlanıyor…" : anaMetin}
        </button>
      </div>

      <Pencere acik={pencere === "odalar"} onKapat={() => setPencere(null)} baslik={`Bütün odalar${tarihYazi ? ` · ${tarihYazi}` : ""}`} genislik={820}>
        <div className={s.odaListe}>
          {odalar.map((o) => (
            <OdaKarti key={o.priceCode} oda={o} gece={gece} misafir={misafir} secili={o.priceCode === seciliKod} liste onAc={() => { setPencere(null); setOdaAcik(o.priceCode); }} />
          ))}
        </div>
      </Pencere>
      <Pencere acik={pencere === "olanak"} onKapat={() => setPencere(null)} baslik="Bu otel size neler sunuyor?">
        <div className={s.tumOlanak}>
          {olanakGruplari(olanaklar).map(([k, v]) => (
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
      <Pencere acik={pencere === "aciklama"} onKapat={() => setPencere(null)} baslik="Otel hakkında">
        <div className={s.pencereMetin}>{aciklama.map((p, i) => <p key={i}>{p}</p>)}</div>
      </Pencere>
      <Pencere acik={pencere === "bilgi"} onKapat={() => setPencere(null)} baslik="Önemli bilgiler">
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
        ustSag={<div className={s.eylem}><button type="button" onClick={paylas}><Ikon ad="share" boyut={18} />Paylaş</button></div>}
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
  const ip = iptalOzeti(oda.cancellationPolicies);
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
            <Ikon ad="check" boyut={16} kalinlik={2.2} /> {ip.ucretsiz.yonelme} kadar ücretsiz iptal
          </span>
        ) : (
          <span>İade edilmez</span>
        )}
      </span>
      <span className={s.odaFiyat}>
        <b className="lb-y">{para(odaToplami(oda), oda.currency)}</b>
        <small>{gece} gece, toplam</small>
      </span>
    </button>
  );
}

function Iskelet() {
  return (
    <div className={`lb ${s.sayfa}`} aria-busy="true" aria-label="Otel yükleniyor">
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
