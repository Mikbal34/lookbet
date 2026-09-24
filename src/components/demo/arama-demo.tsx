"use client";

// Arama demosu — önizleme: /onizleme/arama.
//
// İlk ekranda yalnızca logo ve arama çubuğu. "Nereye"ye yazdıkça kendi
// konum ağacımızdan öneriler geliyor; bir konum seçilince arka plana o
// bölgedeki bir otelin fotoğrafı yumuşak bir geçişle (belirerek ve hafifçe
// yaklaşarak) geliyor, çubuğun altında da o konumun kısa bilgileri beliriyor:
// kaç otel var, kaçı fiyat veriyor, en çok otelin olduğu bölgeler.
//
// Fotoğraf yüklenmeden geçiş başlamıyor (önce indiriliyor), yoksa kullanıcı
// boş bir katmanın belirmesini görürdü. Önceki fotoğraf yenisi tamamen
// görünene kadar altta kalıyor; iki konum arasında geçiş siyaha düşmüyor.

import * as React from "react";
import { useRouter } from "next/navigation";
import { LbAra, LbKonum, LbMisafir } from "@/components/ui/icons";
import { DateRangeField } from "@/components/search/date-range-field";
import { GuestSelector, type GuestValue } from "@/components/search/guest-selector";
import { addRecentSearch } from "@/lib/utils/recent-searches";
import { cn } from "@/lib/utils/cn";
import type { KonumOnerisi, KonumOzeti } from "@/lib/konum-ozet";

const GECIS_MS = 1400;

const cellLabel =
  "flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[1.2px] text-muted";

const sayi = (n: number) => n.toLocaleString("tr-TR");

interface Katman {
  url: string;
  otel: string;
  anahtar: number;
}

/** Görseli önceden indirir; kırıksa false. */
function onYukle(url: string): Promise<boolean> {
  return new Promise((coz) => {
    const img = new Image();
    img.onload = () => coz(true);
    img.onerror = () => coz(false);
    img.src = url;
  });
}

export function AramaDemo() {
  const router = useRouter();
  const [yazilan, setYazilan] = React.useState("");
  const [oneriler, setOneriler] = React.useState<KonumOnerisi[]>([]);
  const [listeAcik, setListeAcik] = React.useState(false);
  const [aktifOneri, setAktifOneri] = React.useState(-1);
  const [secilen, setSecilen] = React.useState<KonumOnerisi | null>(null);
  const [ozet, setOzet] = React.useState<KonumOzeti | null>(null);
  const [katmanlar, setKatmanlar] = React.useState<Katman[]>([]);
  const [checkIn, setCheckIn] = React.useState("");
  const [checkOut, setCheckOut] = React.useState("");
  const [guests, setGuests] = React.useState<GuestValue>({ adult: 2, childAges: [] });
  const [hata, setHata] = React.useState<string | null>(null);
  const sayac = React.useRef(0);
  const sonSecim = React.useRef<string | null>(null);

  // Öneriler: yazmayı bıraktıktan 150 ms sonra; eski yanıt yenisini ezmesin.
  React.useEffect(() => {
    const q = yazilan.trim();
    if (q.length < 2 || q === secilen?.ad) {
      setOneriler([]);
      return;
    }
    const iptal = new AbortController();
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/konum/oneri?q=${encodeURIComponent(q)}`, { signal: iptal.signal });
        const d = (await r.json()) as { oneriler: KonumOnerisi[] };
        setOneriler(d.oneriler);
        setAktifOneri(d.oneriler.length ? 0 : -1);
        setListeAcik(true);
      } catch {
        /* iptal edildi ya da ağ hatası: öneri göstermemek yeterli */
      }
    }, 150);
    return () => {
      clearTimeout(t);
      iptal.abort();
    };
  }, [yazilan, secilen?.ad]);

  const sec = async (o: KonumOnerisi) => {
    setSecilen(o);
    setYazilan(o.ad);
    setListeAcik(false);
    setHata(null);
    sonSecim.current = o.id;

    const r = await fetch(`/api/konum/ozet?id=${encodeURIComponent(o.id)}`);
    if (!r.ok || sonSecim.current !== o.id) return;
    const d = (await r.json()) as KonumOzeti;

    // İlk açılan fotoğrafı bul; hiçbiri açılmazsa arka plan olduğu gibi kalır.
    let gorsel: KonumOzeti["gorseller"][number] | null = null;
    for (const g of d.gorseller) {
      if (await onYukle(g.url)) {
        gorsel = g;
        break;
      }
    }
    if (sonSecim.current !== o.id) return; // bu arada başka konum seçildi

    setOzet(d);
    if (gorsel) {
      const yeni = { url: gorsel.url, otel: gorsel.otel, anahtar: ++sayac.current };
      setKatmanlar((k) => [...k.slice(-1), yeni]);
      // Geçiş bitince alttaki eski katmanı at.
      setTimeout(() => setKatmanlar((k) => k.filter((x) => x.anahtar >= yeni.anahtar)), GECIS_MS + 100);
    }
  };

  const tusla = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!listeAcik || oneriler.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setAktifOneri((i) => (i + 1) % oneriler.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setAktifOneri((i) => (i - 1 + oneriler.length) % oneriler.length);
    } else if (e.key === "Enter" && aktifOneri >= 0) {
      e.preventDefault();
      void sec(oneriler[aktifOneri]);
    } else if (e.key === "Escape") {
      setListeAcik(false);
    }
  };

  const ara = (e: React.FormEvent) => {
    e.preventDefault();
    const hedef = (secilen?.ad ?? yazilan).trim();
    if (!hedef) return setHata("Nereye gideceğini yaz.");
    if (!checkIn || !checkOut) return setHata("Giriş ve çıkış tarihini seç.");
    addRecentSearch({ destination: hedef, checkIn, checkOut, adults: guests.adult });
    const p = new URLSearchParams({
      destination: hedef,
      checkIn,
      checkOut,
      adults: String(guests.adult),
      nationality: "TR",
      currency: "EUR",
    });
    if (guests.childAges.length) p.set("childAges", guests.childAges.join(","));
    router.push(`/search?${p.toString()}`);
  };

  const ustKatman = katmanlar[katmanlar.length - 1];

  return (
    <main className="relative min-h-dvh overflow-hidden bg-navy-deep text-white">
      {/* ── Arka plan fotoğrafları ─────────────────────────────────── */}
      <div className="absolute inset-0" aria-hidden="true">
        {katmanlar.map((k) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={k.anahtar}
            src={k.url}
            alt=""
            className={cn(
              "absolute inset-0 h-full w-full object-cover",
              k === ustKatman && "demo-gorsel-giris"
            )}
          />
        ))}
        {/* Okunabilirlik: üstte logo ve çubuk, altta bilgiler için koyulaşma;
            bilgiler solda durduğu için soldan da hafif bir gölge. */}
        <div
          className={cn(
            "absolute inset-0 transition-opacity duration-700",
            katmanlar.length ? "opacity-100" : "opacity-0"
          )}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-navy-deep/75 via-navy-deep/45 to-navy-deep/90" />
          <div className="absolute inset-0 bg-gradient-to-r from-navy-deep/60 via-navy-deep/20 to-transparent" />
        </div>
      </div>

      <div className="relative z-10 mx-auto flex max-w-[1040px] flex-col px-6 pb-16 pt-[18vh]">
        {/* ── Logo ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-center gap-3.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/lookbeds-logo.svg" alt="" className="h-14 w-14 rounded-xl" />
          <span className="text-[40px] font-extrabold tracking-[-0.02em]">LookBeds</span>
        </div>

        {/* ── Arama çubuğu ─────────────────────────────────────────── */}
        <form
          onSubmit={ara}
          noValidate
          aria-label="Otel ara"
          className="relative mt-10 flex items-stretch rounded-xl bg-paper text-ink shadow-[0_24px_60px_-20px_rgb(0_0_0/0.6)]"
        >
          <div className="relative min-w-0 flex-[1.4] border-r border-line px-5 py-2.5">
            <label htmlFor="demo-nereye" className={cellLabel}>
              <LbKonum size={14} />
              Nereye
            </label>
            <input
              id="demo-nereye"
              role="combobox"
              aria-expanded={listeAcik && oneriler.length > 0}
              aria-controls="demo-oneriler"
              aria-autocomplete="list"
              aria-activedescendant={aktifOneri >= 0 ? `demo-oneri-${aktifOneri}` : undefined}
              value={yazilan}
              onChange={(e) => {
                setYazilan(e.target.value);
                if (secilen && e.target.value !== secilen.ad) setSecilen(null);
                setHata(null);
              }}
              onFocus={() => oneriler.length && setListeAcik(true)}
              onBlur={() => setListeAcik(false)}
              onKeyDown={tusla}
              placeholder="Şehir, bölge ya da otel"
              autoComplete="off"
              autoFocus
              className="mt-1 w-full border-none bg-transparent text-[16px] font-semibold text-ink outline-none placeholder:font-normal placeholder:text-muted/70"
            />

            {listeAcik && oneriler.length > 0 && (
              <ul
                id="demo-oneriler"
                role="listbox"
                aria-label="Konum önerileri"
                className="absolute left-0 top-[calc(100%+10px)] z-30 w-[420px] overflow-hidden rounded-xl border border-line bg-paper py-1.5 shadow-[0_18px_40px_-16px_rgb(11_13_20/0.45)]"
              >
                {oneriler.map((o, i) => (
                  <li
                    key={o.id}
                    id={`demo-oneri-${i}`}
                    role="option"
                    aria-selected={i === aktifOneri}
                    // mousedown: input blur'undan önce seçilsin.
                    onMouseDown={(e) => {
                      e.preventDefault();
                      void sec(o);
                    }}
                    onMouseEnter={() => setAktifOneri(i)}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 px-4 py-2.5",
                      i === aktifOneri && "bg-chip-blue"
                    )}
                  >
                    <LbKonum size={18} className="shrink-0 text-navy" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-bold text-ink">{o.ad}</span>
                      {o.ust && <span className="block truncate text-[12.5px] text-muted">{o.ust}</span>}
                    </span>
                    <span className="shrink-0 text-[12.5px] font-semibold text-muted">{sayi(o.otel)} otel</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <DateRangeField
            checkIn={checkIn}
            checkOut={checkOut}
            onChange={(ci, co) => {
              setCheckIn(ci);
              setCheckOut(co);
              setHata(null);
            }}
          />

          <div className="min-w-0 flex-1 px-5 py-2.5">
            <div className={cellLabel}>
              <LbMisafir size={14} />
              Kişi
            </div>
            <div className="mt-1">
              <GuestSelector value={guests} onChange={setGuests} />
            </div>
          </div>

          <button
            type="submit"
            className="m-1.5 flex items-center gap-2 rounded-lg bg-gold px-7 text-[16px] font-extrabold text-ink hover:bg-gold-dark"
          >
            <LbAra size={18} />
            Ara
          </button>
        </form>

        {hata && (
          <p role="alert" className="mt-3 text-center text-[14px] font-semibold text-gold">
            {hata}
          </p>
        )}

        {/* ── Seçilen konumun bilgileri ────────────────────────────── */}
        <div aria-live="polite">
          {ozet && (
            <section key={ozet.id} className="demo-bilgi mt-14" aria-label={`${ozet.ad} hakkında`}>
              {ozet.zincir.length > 0 && (
                <p className="text-[14px] font-semibold text-white/70">{ozet.zincir.join(" · ")}</p>
              )}
              <h2 className="mt-1 text-[48px] font-extrabold leading-none tracking-[-0.02em]">{ozet.ad}</h2>

              <dl className="mt-6 flex flex-wrap gap-x-12 gap-y-4">
                <div>
                  <dt className="text-[13px] font-semibold text-white/65">Otel</dt>
                  <dd className="mt-0.5 text-[30px] font-extrabold leading-tight">{sayi(ozet.toplam)}</dd>
                </div>
                {ozet.fiyatli > 0 && (
                  <div>
                    <dt className="text-[13px] font-semibold text-white/65">Fiyat veren</dt>
                    <dd className="mt-0.5 text-[30px] font-extrabold leading-tight">{sayi(ozet.fiyatli)}</dd>
                  </div>
                )}
                {ozet.besYildiz > 0 && (
                  <div>
                    <dt className="text-[13px] font-semibold text-white/65">5 yıldızlı</dt>
                    <dd className="mt-0.5 text-[30px] font-extrabold leading-tight">{sayi(ozet.besYildiz)}</dd>
                  </div>
                )}
              </dl>

              {ozet.bolgeler.length > 0 && (
                <p className="mt-6 text-[15px] text-white/85">
                  <span className="text-white/60">En çok otel: </span>
                  {ozet.bolgeler.map((b) => `${b.ad} (${sayi(b.otel)})`).join(" · ")}
                </p>
              )}
            </section>
          )}
        </div>
      </div>

      {ustKatman && (
        <p key={ustKatman.anahtar} className="demo-bilgi absolute bottom-5 right-6 z-10 text-[12px] text-white/60">
          Fotoğraf: {ustKatman.otel}
        </p>
      )}
    </main>
  );
}
