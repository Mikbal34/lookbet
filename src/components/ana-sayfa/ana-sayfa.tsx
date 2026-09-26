"use client";

// Ana sayfa.
//
// Açılış tam ekran: ortada büyük logo, nesne ikonlu kategoriler ve büyük arama
// çubuğu. Aşağı kaydırınca logo küçülerek sol üste, arama küçülerek üst
// çubuğun ortasına uçar; kategoriler solar. Kaydırılmışken küçük aramaya
// tıklayınca üst çubuk açılır, arama yerinde büyür, sayfa kararır (Airbnb).
// Altta bölge bölge otel satırları, seçili kategoriye göre.
//
// Geçiş kaydırmayı birebir izlemiyor, hedefe yumuşakça yaklaşıyor (sönümleme):
// hızlı kaydırmada bile bir anda bitmiyor. Konum ve boyutlar requestAnimationFrame
// içinde doğrudan stile yazılıyor; React yeniden çizimi yok.

import { kartFotosu } from "@/lib/foto";
import { kampanyaHedefi, kampanyaNesnesi, type VitrinKampanya } from "@/components/kampanya/ortak";
import { useKampanyaMetni } from "@/components/kampanya/metin";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { AramaCubugu, type AramaKontrol } from "@/components/lb/arama/arama-cubugu";
import { MobilArama } from "@/components/lb/arama/mobil-arama";
import { aramaAdresi, BOS_ARAMA, iso, type AramaDegeri, type PanelAdi } from "@/components/lb/arama/durum";
import { AltBilgi } from "@/components/lb/alt-bilgi";
import { Ikon } from "@/components/lb/ikon";
import { Nesne } from "@/components/lb/nesne";
import { DunyaDugmesi, MenuDugmesi } from "@/components/lb/ust-araclar";
import { useFavoriler } from "@/components/lb/favoriler";
import type { AnaSayfaSatiri } from "@/lib/ana-sayfa";
import { KATEGORILER, type KategoriKodu } from "@/lib/ana-sayfa-kategoriler";
import s from "./ana-sayfa.module.css";

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function Satir({ satir, aramaEki, fav, onFav }: {
  satir: AnaSayfaSatiri; aramaEki: string; fav: Set<string>; onFav: (kod: string) => void;
}) {
  const t = useTranslations("anaSayfa");
  const tk = useTranslations("ortak");
  const baslikMetni = t(`satirlar.${satir.kod}`);
  const serit = React.useRef<HTMLUListElement>(null);
  const [uc, setUc] = React.useState({ bas: true, son: false });
  const gorunur = React.useRef<HTMLElement>(null);
  const [goruldu, setGoruldu] = React.useState(false);
  React.useEffect(() => {
    const el = gorunur.current;
    if (!el) return;
    const io = new IntersectionObserver(([g]) => g.isIntersecting && (setGoruldu(true), io.disconnect()), { rootMargin: "0px 0px -10% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const guncelle = () => {
    const e = serit.current;
    if (e) setUc({ bas: e.scrollLeft < 4, son: e.scrollLeft + e.clientWidth > e.scrollWidth - 4 });
  };
  React.useEffect(guncelle, []);
  const kaydir = (yon: number) => {
    const e = serit.current;
    if (!e) return;
    const az = matchMedia("(prefers-reduced-motion: reduce)").matches;
    e.scrollBy({ left: yon * e.clientWidth * 0.8, behavior: az ? "auto" : "smooth" });
  };
  const baslik = satir.arama ? (
    <Link href={`/search?destination=${encodeURIComponent(satir.arama)}${aramaEki}`}>
      {baslikMetni} <Ikon ad="chevron-right" boyut={16} kalinlik={2.2} />
    </Link>
  ) : (
    baslikMetni
  );
  return (
    <section ref={gorunur} className={s.bolge} data-goruldu={goruldu || undefined} aria-labelledby={`b-${satir.kod}`}>
      <div className={s.bolgeUst}>
        <h2 id={`b-${satir.kod}`}>{baslik}</h2>
        <div className={s.oklar}>
          <button type="button" className={s.ok} onClick={() => kaydir(-1)} disabled={uc.bas} aria-label={t("satir.onceki", { baslik: baslikMetni })}>
            <Ikon ad="chevron-left" boyut={16} kalinlik={2.4} />
          </button>
          <button type="button" className={s.ok} onClick={() => kaydir(1)} disabled={uc.son} aria-label={t("satir.sonraki", { baslik: baslikMetni })}>
            <Ikon ad="chevron-right" boyut={16} kalinlik={2.4} />
          </button>
        </div>
      </div>
      <ul ref={serit} className={s.serit} onScroll={guncelle}>
        {satir.oteller.map((o, i) => (
          <li key={o.kod} className={s.kart} style={{ "--s": i } as React.CSSProperties}>
            <a
              className={s.kartA}
              href={`/hotel/${o.kod}${aramaEki ? `?${aramaEki.slice(1)}` : ""}`}
              // Airbnb gibi her otel kendi sekmesinde.
              target={`otel_${o.kod}`}
            >
              <div className={s.foto}>
                {/* eslint-disable-next-line @next/next/no-img-element -- dış kaynaklı otel görseli */}
                <img {...kartFotosu(o.foto)} alt="" loading="lazy" onError={(e) => (e.currentTarget.style.visibility = "hidden")} />
              </div>
              <h3>{o.ad}</h3>
              <p>{[o.yildiz ? tk("yildizli", { sayi: o.yildiz }) : null, o.yer].filter(Boolean).join(" · ")}</p>
            </a>
            <button
              type="button"
              className={s.kalp}
              aria-pressed={fav.has(o.kod)}
              aria-label={t(fav.has(o.kod) ? "satir.favoriEklendi" : "satir.favoriEkle", { ad: o.ad })}
              onClick={() => onFav(o.kod)}
            >
              <Ikon ad="heart" boyut={26} kalinlik={1.8} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Vitrindeki kampanyalar (Yönetim › Kampanyalar), bölge satırlarının üstünde yatay şerit. */
function Kampanyalar({ kampanyalar }: { kampanyalar: VitrinKampanya[] }) {
  const t = useTranslations("anaSayfa.kampanya");
  const metin = useKampanyaMetni();
  return (
    <section className={s.kampanyalar} aria-labelledby="kampanya-baslik">
      <div className={s.bolgeUst}>
        <h2 id="kampanya-baslik" className={s.kampanyaBaslik}>
          <Link href="/kampanyalar">
            {t("baslik")} <Ikon ad="chevron-right" boyut={16} kalinlik={2.2} />
          </Link>
        </h2>
      </div>
      <ul className={s.kampanyaSerit}>
        {kampanyalar.map((k, i) => {
          const hedef = kampanyaHedefi(k);
          return (
            <li key={k.id} style={{ "--s": i } as React.CSSProperties}>
              <Link href={hedef.href} className={s.kampanya}>
                <span className={s.kampanyaNesne}><Nesne ad={kampanyaNesnesi(k)} boyut={72} /></span>
                <span className={s.kampanyaIc}>
                  <small data-yakinda={k.yakinda || undefined}>{metin.tarih(k)}</small>
                  <b>{k.ad}</b>
                  <span>{metin.aciklama(k)}</span>
                </span>
                <b className={`lb-y ${s.kampanyaYuzde}`}>{metin.yuzde(k)}</b>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function AnaSayfa({ satirlar, kampanyalar = [] }: { satirlar: AnaSayfaSatiri[]; kampanyalar?: VitrinKampanya[] }) {
  const t = useTranslations("anaSayfa");
  const router = useRouter();
  const [kategori, setKategori] = React.useState<KategoriKodu>("hepsi");
  const [oynayan, setOynayan] = React.useState<KategoriKodu | null>(null);
  const [deger, setDeger] = React.useState<AramaDegeri>(BOS_ARAMA);
  const [mobilAcik, setMobilAcik] = React.useState(false);
  const { fav, degistir: favDegistir } = useFavoriler();

  const ust = React.useRef<HTMLElement>(null);
  const logo = React.useRef<HTMLAnchorElement>(null);
  const logoYer = React.useRef<HTMLHeadingElement>(null);
  const aramaYer = React.useRef<HTMLDivElement>(null);
  const arama = React.useRef<HTMLDivElement>(null);
  const buyuk = React.useRef<HTMLDivElement>(null);
  const kucuk = React.useRef<HTMLButtonElement>(null);
  const tek = React.useRef<HTMLButtonElement>(null);
  const sekmelerEl = React.useRef<HTMLDivElement>(null);
  const gosterge = React.useRef<HTMLSpanElement>(null);
  const asagi = React.useRef<HTMLButtonElement>(null);
  const perde = React.useRef<HTMLDivElement>(null);
  const oteller = React.useRef<HTMLElement>(null);
  const kontrol = React.useRef<AramaKontrol>(null);
  const genis = React.useRef<{ ac: (alan?: PanelAdi) => void; kapat: () => void } | null>(null);
  const panelAcik = React.useRef(false);

  const secili = KATEGORILER.find((k) => k.kod === kategori)!;
  const gosterilen = satirlar.filter((r) => r.kategoriler.includes(kategori));
  const aramaEki = deger.giris && deger.cikis ? `&checkIn=${iso(deger.giris)}&checkOut=${iso(deger.cikis)}&adults=${deger.yetiskin}` : "";

  const ara = () => {
    const mobil = matchMedia("(max-width: 720px)").matches;
    if (!deger.yer.trim()) return mobil ? setMobilAcik(true) : kontrol.current?.panelAc("yer");
    if (!deger.giris || !deger.cikis) return mobil ? setMobilAcik(true) : kontrol.current?.panelAc("tarih");
    router.push(aramaAdresi(deger));
  };

  /* ── Kaydırmaya bağlı uçuş ── */
  React.useEffect(() => {
    const L = logo.current, A = arama.current, B = buyuk.current, K = kucuk.current, T = tek.current;
    const U = ust.current, S = sekmelerEl.current, D = asagi.current, P = perde.current, LY = logoYer.current, AY = aramaYer.current;
    if (!L || !A || !B || !K || !T || !U || !S || !D || !P || !LY || !AY) return;
    const az = matchMedia("(prefers-reduced-motion: reduce)");
    const mobil = matchMedia("(max-width: 720px)");

    type Olcu = {
      mobil: boolean;
      mesafe: number;
      logo: { x0: number; y0: number; x1: number; y1: number; s1: number };
      arama: { x0: number; y0: number; w0: number; h0: number; x1: number; y1: number; w1: number; h1: number };
      genis: { x: number; y: number; w: number; h: number };
    };
    let olc: Olcu | null = null;
    let anlik = 0, hedef = 0, g = 0, gHedef = 0, dongu = false;

    const hedefHesapla = () => (olc ? Math.min(1, Math.max(0, scrollY / olc.mesafe)) : 0);

    function olcul() {
      const y = scrollY, vw = document.documentElement.clientWidth;
      const lr = LY!.getBoundingClientRect(), ar = AY!.getBoundingClientRect();
      const m = mobil.matches;
      const pad = parseFloat(getComputedStyle(U!.querySelector(`.${s.ustIc}`)!).paddingLeft);
      const ustH = m ? 72 : 80;
      const logoSon = m ? 22 : 26;
      const buyukPunto = parseFloat(getComputedStyle(LY!).fontSize);
      L!.style.fontSize = `${buyukPunto}px`;
      const logoSonGen = (L!.offsetWidth * logoSon) / buyukPunto;
      const sag = U!.querySelector<HTMLElement>(`.${s.sag}`);
      const yan = Math.max(logoSonGen, sag?.offsetWidth ?? 0) + 40;
      // Mobilde logo kaydırınca kayboluyor (Airbnb gibi); arama soldan menüye kadar uzanıyor.
      const aramaSonGen = m ? vw - 2 * 16 - (sag?.offsetWidth ? sag.offsetWidth + 8 : 0) : Math.max(320, Math.min(600, vw - 2 * pad - 2 * yan));
      const aramaSonH = m ? 50 : 52;
      const gw = Math.min(860, vw - 2 * pad);
      olc = {
        mobil: m,
        mesafe: m ? 250 : 325,
        logo: { x0: lr.left, y0: lr.top + y, x1: m ? 16 : pad, y1: (ustH - logoSon) / 2, s1: logoSon / buyukPunto },
        arama: {
          x0: ar.left, y0: ar.top + y, w0: ar.width, h0: ar.height,
          x1: m ? 16 : (vw - aramaSonGen) / 2, y1: (ustH - aramaSonH) / 2, w1: aramaSonGen, h1: aramaSonH,
        },
        genis: { w: gw, h: 66, x: (vw - gw) / 2, y: ustH + 16 },
      };
      hedef = anlik = hedefHesapla();
      ciz();
    }

    function ciz() {
      if (!olc) return;
      const ham = anlik, p = ease(ham), ge = ease(g);
      const Lo = olc.logo, Ar = olc.arama, G = olc.genis;
      L!.style.transform = `translate(${lerp(Lo.x0, Lo.x1, p)}px, ${lerp(Lo.y0, Lo.y1, p)}px) scale(${lerp(1, Lo.s1, p)})`;
      if (olc.mobil) {
        L!.style.opacity = String(Math.max(0, 1 - ham * 1.8));
        L!.style.visibility = ham > 0.6 ? "hidden" : "visible";
      } else {
        L!.style.opacity = "";
        L!.style.visibility = "";
      }
      A!.style.width = `${lerp(lerp(Ar.w0, Ar.w1, p), G.w, ge)}px`;
      A!.style.height = `${lerp(lerp(Ar.h0, Ar.h1, p), G.h, ge)}px`;
      A!.style.transform = `translate(${lerp(lerp(Ar.x0, Ar.x1, p), G.x, ge)}px, ${lerp(lerp(Ar.y0, Ar.y1, p), G.y, ge)}px)`;
      const buyukO = Math.max(0, 1 - ham * 2.2, (g - 0.35) / 0.65);
      const kucukO = Math.max(0, (ham - 0.45) / 0.55) * Math.max(0, 1 - g * 2.5);
      for (const el of [B!, T!]) {
        el.style.opacity = String(buyukO);
        el.style.visibility = buyukO < 0.02 ? "hidden" : "visible";
      }
      K!.style.opacity = String(kucukO);
      K!.style.visibility = kucukO < 0.02 ? "hidden" : "visible";
      K!.style.zIndex = kucukO > 0.5 ? "2" : "0";
      B!.style.zIndex = g > 0.5 ? "3" : "";
      U!.style.setProperty("--p", String(Math.max(0, (ham - 0.5) / 0.5)));
      U!.style.setProperty("--g", String(g));
      P!.style.setProperty("--g", String(g));
      S!.style.opacity = String(Math.max(0, 1 - ham * 1.6));
      S!.style.transform = `scale(${1 - ham * 0.12})`;
      D!.style.opacity = String(Math.max(0, 1 - ham * 3));
    }

    function adim() {
      const f = hedef - anlik, gf = gHedef - g;
      anlik = Math.abs(f) < 0.0015 || az.matches ? hedef : anlik + f * 0.16;
      g = Math.abs(gf) < 0.002 || az.matches ? gHedef : g + gf * 0.2;
      ciz();
      if (anlik !== hedef || g !== gHedef) requestAnimationFrame(adim);
      else dongu = false;
    }
    const oynat = () => {
      if (!dongu) {
        dongu = true;
        requestAnimationFrame(adim);
      }
    };

    genis.current = {
      ac(alan) {
        gHedef = 1;
        U!.dataset.genis = "";
        P!.dataset.acik = "";
        oynat();
        setTimeout(() => kontrol.current?.panelAc(alan ?? "yer"), az.matches ? 0 : 260);
      },
      kapat() {
        if (!gHedef) return;
        gHedef = 0;
        delete U!.dataset.genis;
        delete P!.dataset.acik;
        kontrol.current?.panelKapat();
        oynat();
      },
    };

    // Safari: odaktaki "Nereye" kutusu çubuk küçülürken gizlenince sayfayı en
    // üste atıyor. Kaydırma başlamadan (tekerlek/dokunma) odağı bırak; yine de
    // kapanıştan hemen sonra sayfa bir anda yukarı fırlarsa eski yerine koy.
    const odakCubuktaMi = () => A.contains(document.activeElement) && document.activeElement !== document.body;
    const odagiBirak = () => {
      if ((gHedef || panelAcik.current || scrollY > 0) && odakCubuktaMi()) {
        koru = scrollY;
        koruBitis = performance.now() + 800;
        (document.activeElement as HTMLElement).blur();
      }
    };
    let koru = 0, koruBitis = 0;
    const kaydir = () => {
      const y = scrollY;
      if (performance.now() < koruBitis) {
        if (y < koru - 150) {
          scrollTo(0, koru);
          return;
        }
        koru = Math.max(koru, y);
      }
      hedef = hedefHesapla();
      if ((gHedef || hedef > 0.05) && odakCubuktaMi()) odagiBirak();
      if (gHedef) genis.current?.kapat();
      else if (hedef > 0.05 && panelAcik.current) kontrol.current?.panelKapat();
      oynat();
    };
    addEventListener("wheel", odagiBirak, { passive: true });
    addEventListener("touchmove", odagiBirak, { passive: true });
    addEventListener("scroll", kaydir, { passive: true });
    addEventListener("resize", olcul);
    document.fonts?.ready.then(olcul);
    olcul();
    return () => {
      removeEventListener("wheel", odagiBirak);
      removeEventListener("touchmove", odagiBirak);
      removeEventListener("scroll", kaydir);
      removeEventListener("resize", olcul);
      genis.current = null;
    };
  }, []);

  /* ── Kategori göstergesi (seçili sekmenin altındaki çizgi) ── */
  const gostergeYerlestir = React.useCallback(() => {
    const k = sekmelerEl.current, gg = gosterge.current;
    const et = k?.querySelector<HTMLElement>(`[aria-selected="true"] .${s.etiket}`);
    if (!k || !gg || !et) return;
    const olcek = k.getBoundingClientRect().width / k.offsetWidth || 1;
    const r = et.getBoundingClientRect(), kr = k.getBoundingClientRect();
    gg.style.width = `${r.width / olcek}px`;
    gg.style.transform = `translateX(${(r.left - kr.left) / olcek}px)`;
  }, []);
  React.useLayoutEffect(gostergeYerlestir, [kategori, gostergeYerlestir]);
  React.useEffect(() => {
    document.fonts?.ready.then(gostergeYerlestir);
    addEventListener("resize", gostergeYerlestir);
    return () => removeEventListener("resize", gostergeYerlestir);
  }, [gostergeYerlestir]);

  const kategoriSec = (k: KategoriKodu) => {
    setKategori(k);
    setOynayan(null);
    requestAnimationFrame(() => setOynayan(k));
  };

  const yukari = () => scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  const acKapat = React.useCallback((a: boolean) => {
    panelAcik.current = a;
  }, []);
  const mobilKapat = React.useCallback(() => setMobilAcik(false), []);

  return (
    <div className={`lb ${s.sayfa}`}>
      <header ref={ust} className={s.ust}>
        <div className={s.ustZemin} />
        <div className={s.ustSekmeler} role="tablist" aria-label={t("tatilTuru")}>
          {KATEGORILER.map((k) => (
            <button key={k.kod} type="button" role="tab" aria-selected={kategori === k.kod} className={s.uSekme} onClick={() => kategoriSec(k.kod)}>
              <Nesne ad={k.nesne} boyut={40} />
              <span>{t(`kategori.${k.kod}`)}</span>
            </button>
          ))}
        </div>
        <div className={s.ustIc}>
          <div className={s.sag}>
            <DunyaDugmesi className={s.dunya} />
            <MenuDugmesi />
          </div>
        </div>
      </header>

      <div ref={perde} className={s.perde} onClick={() => genis.current?.kapat()} />

      <Link ref={logo} href="/" className={`lb-y ${s.logoUcan}`} onClick={(e) => { e.preventDefault(); yukari(); }} aria-label={t("logoEtiket")}>
        LookBeds
      </Link>

      <AramaCubugu
        deger={deger}
        onDegis={setDeger}
        onAra={ara}
        kokRef={arama}
        buyukRef={buyuk}
        kucukRef={kucuk}
        tekRef={tek}
        kontrol={kontrol}
        nesne={secili.nesne}
        onKucuk={(alan) => (matchMedia("(max-width: 720px)").matches ? setMobilAcik(true) : genis.current?.ac(alan))}
        onTek={() => setMobilAcik(true)}
        onAcikDegis={acKapat}
      />

      <section className={s.acilis} aria-label={t("otelAra")}>
        <div className={s.acilisIc}>
          <h1 ref={logoYer} className={`lb-y ${s.logoYer}`}>LookBeds</h1>
          <div ref={sekmelerEl} className={s.sekmeler} role="tablist" aria-label={t("tatilTuru")}>
            {KATEGORILER.map((k, i) => (
              <button
                key={k.kod}
                type="button"
                role="tab"
                aria-selected={kategori === k.kod}
                className={s.sekme}
                data-oynuyor={oynayan === k.kod || undefined}
                style={{ "--i": i } as React.CSSProperties}
                onClick={() => kategoriSec(k.kod)}
              >
                <span className={s.nesne}><Nesne ad={k.nesne} boyut={56} /></span>
                <span className={s.etiket}>{t(`kategori.${k.kod}`)}</span>
              </button>
            ))}
            <span ref={gosterge} className={s.gosterge} />
          </div>
          <div ref={aramaYer} className={s.aramaYer} />
        </div>
        <button
          ref={asagi}
          type="button"
          className={s.asagi}
          aria-label={t("otellereIn")}
          onClick={() => {
            const t = (oteller.current?.getBoundingClientRect().top ?? 0) + scrollY - 80;
            scrollTo({ top: t, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
          }}
        >
          <Ikon ad="chevron-down" boyut={20} />
        </button>
      </section>

      <main ref={oteller} className={s.oteller} key={kategori}>
        {kategori === KATEGORILER[0].kod && kampanyalar.length > 0 && <Kampanyalar kampanyalar={kampanyalar} />}
        {gosterilen.length ? (
          gosterilen.map((r) => <Satir key={r.kod} satir={r} aramaEki={aramaEki} fav={fav} onFav={favDegistir} />)
        ) : (
          <div className={s.bos}>
            <Nesne ad="zil" boyut={96} />
            <p>{t("bos")}</p>
          </div>
        )}
      </main>

      <AltBilgi />
      <MobilArama acik={mobilAcik} deger={deger} onDegis={setDeger} onAra={() => { setMobilAcik(false); ara(); }} onKapat={mobilKapat} />
    </div>
  );
}
