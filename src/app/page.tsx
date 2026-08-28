"use client";

// LookBeds ana sayfa — CruiseScanner (Skyscanner-tarzı) tasarımın turuncu hali:
// dümdüz turuncu bant (header + başlık + arama + hızlı chip'ler tek blok),
// beyaz gövde, amber fiyat etiketli 4:3 destinasyon kartları, editorial
// özellik bandı.

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Calendar, Search } from "lucide-react";
import { AppHeader, Navbar, Footer } from "@/components/layout";
import { SearchForm, SearchOverlay } from "@/components/search";
import { AppHomeHero } from "@/components/search/app-home-hero";
import { useLocale } from "@/components/providers/locale-provider";
import { POPULAR_DESTINATIONS } from "@/lib/constants/destinations";
import { cn } from "@/lib/utils/cn";
import { UpcomingReservationCard } from "@/components/reservation/upcoming-reservation-card";
import { addRecentSearch } from "@/lib/utils/recent-searches";
import { RecentSearches } from "@/components/search/recent-searches";
import { CAMPAIGNS } from "@/lib/constants/campaigns";

// Ana sayfadaki chip'ler ve tam ekran akıştaki öneriler aynı listeden.
const QUICK_LINKS = POPULAR_DESTINATIONS;

const DESTINATIONS = [
  {
    region: "İstanbul",
    ports: "Sultanahmet, Beyoğlu, Boğaz hattı",
    stay: "Şehir oteli",
    fromPrice: "€45",
    image:
      "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=800&q=80&auto=format&fit=crop",
  },
  {
    region: "Antalya",
    ports: "Lara, Belek, Kemer, Side",
    stay: "Her şey dahil",
    fromPrice: "€62",
    image:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80&auto=format&fit=crop",
  },
  {
    region: "Kapadokya",
    ports: "Göreme, Ürgüp, Uçhisar",
    stay: "Mağara otel",
    fromPrice: "€38",
    image:
      "https://images.unsplash.com/photo-1570939274717-7eda259b50ed?w=800&q=80&auto=format&fit=crop",
  },
  {
    region: "Bodrum",
    ports: "Yalıkavak, Türkbükü, Gümbet",
    stay: "Butik otel",
    fromPrice: "€55",
    image:
      "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=800&q=80&auto=format&fit=crop",
  },
  {
    region: "Çeşme",
    ports: "Alaçatı, Ilıca, Dalyan",
    stay: "Taş otel",
    fromPrice: "€58",
    image:
      "https://images.unsplash.com/photo-1519046904884-53103b34b206?w=800&q=80&auto=format&fit=crop",
  },
  {
    region: "Trabzon",
    ports: "Uzungöl, Ayder, Sümela",
    stay: "Dağ evi",
    fromPrice: "€32",
    image:
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80&auto=format&fit=crop",
  },
];

const FEATURES = [
  {
    title: "En iyi fiyat garantisi",
    desc: "Aynı oda, aynı tarih — daha ucuzunu bulursan aradaki farkı iade ediyoruz. Fiyatlar tüm vergiler dahil, sürpriz yok.",
  },
  {
    title: "Çoğu otelde ücretsiz iptal",
    desc: "Planın değişti mi? Rezervasyonların çoğunda girişe kadar ücretsiz iptal, girişte ödeme seçeneği hazır.",
  },
];

export default function HomePage() {
  const router = useRouter();
  const { currency } = useLocale();

  const [aramaAcik, setAramaAcik] = React.useState(false);

  const handleSearch = (values: {
    destination: string;
    checkIn: string;
    checkOut: string;
    guests: { adult: number; childAges: number[] };
    nationality: string;
  }) => {
    const p = new URLSearchParams();
    p.set("destination", values.destination);
    p.set("checkIn", values.checkIn);
    p.set("checkOut", values.checkOut);
    p.set("adults", String(values.guests.adult));
    if (values.guests.childAges.length) {
      p.set("childAges", values.guests.childAges.join(","));
    }
    p.set("nationality", values.nationality);
    p.set("currency", currency);

    addRecentSearch({
      destination: values.destination,
      checkIn: values.checkIn,
      checkOut: values.checkOut,
      adults: values.guests.adult,
    });

    router.push(`/search?${p.toString()}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-paper">
      {/* ── TURUNCU BANT: header + hero + arama + chip'ler tek blok ── */}
      {/* App'te üst menü yerine sabit kimlik çubuğu, web'de normal navbar. */}
      <AppHeader />
      <div className="web-only">
        <Navbar variant="transparent" />
      </div>

      <AppHomeHero onAc={() => setAramaAcik(true)} />
      <UpcomingReservationCard />
      <RecentSearches />
      <section className="web-only bg-navy">
        <div className="mx-auto max-w-[1200px] px-4 pt-10 pb-24 sm:px-6 sm:pt-14 sm:pb-32">
          <h1 className="max-w-[20ch] text-[clamp(1.9rem,4vw,3rem)] leading-[1.05] font-extrabold tracking-[-0.03em] text-white">
            Bir sonraki konaklamanı bul
          </h1>
          <p className="mt-3 max-w-[48ch] text-[15px] sm:text-[16px] leading-relaxed text-white/85">
            Türkiye&apos;nin dört bir yanında oteller, tatil köyleri ve butik
            konaklamalar — en iyi fiyat garantisiyle, vergiler dahil.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px]">
            <Link
              href="/search?destination=Antalya"
              className="group inline-flex items-center gap-1.5 font-semibold text-white underline-offset-[4px] hover:underline"
            >
              Tatil otelleri
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/kampanyalar"
              className="group inline-flex items-center gap-1.5 font-semibold text-white underline-offset-[4px] hover:underline"
            >
              Kampanyalar
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── ARAMA BARI — hero'nun alt kenarına biner: üst yarısı turuncunun,
             alt yarısı beyazın üstünde (Booking tarzı köprü) ──
             w-full şart: bu blok doğrudan flex-col'un öğesi; mx-auto tek başına
             öğeyi içerik genişliğine küçültür. */}
      <div className="web-only mx-auto w-full max-w-[1200px] px-4 sm:px-6">
        <div className="relative z-20 -mt-10 sm:-mt-12">
          {/* lg altı: Booking tarzı tam ekran akışı açan tetikleyici.
              Sayfa içinde form açmak yerine tek dokunuşla odaklı ekran. */}
          <button
            type="button"
            onClick={() => setAramaAcik(true)}
            className="flex w-full items-center gap-3 rounded-[10px] bg-white px-4 py-3.5 text-left shadow-[0_12px_28px_-10px_rgb(11_13_20/0.35)] active:bg-chip lg:hidden"
          >
            <Search className="size-5 shrink-0 text-navy" aria-hidden="true" />
            <span className="min-w-0">
              <span className="block text-[15px] font-bold text-ink">
                Nereye gitmek istersin?
              </span>
              <span className="block text-[12.5px] text-muted">
                Tarih ve misafir seç
              </span>
            </span>
          </button>

          <div className="hidden lg:block">
            <SearchForm onSearch={handleSearch} />
          </div>
        </div>

        {/* Hızlı chip'ler — artık beyaz zeminde */}
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="text-[11px] tracking-[0.14em] text-muted uppercase">
            Popüler aramalar
          </span>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_LINKS.map((q) => (
              <Link
                key={q.label}
                href={`/search?destination=${encodeURIComponent(q.query)}`}
                className="rounded-full border border-line-strong bg-white px-3 py-1 text-[12.5px] font-medium text-slate-text transition-colors hover:border-navy hover:text-navy"
              >
                {q.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── STATS ŞERİDİ — CruiseScanner tarzı büyük bloklar ── */}
      {/* Kurumsal istatistikler ve özellik bandı web'de kalıyor: uygulamayı
          indiren kullanıcı "bu firma gerçek mi" aşamasını çoktan geçti. */}
      <div className="web-only mt-8 border-y border-[rgb(26_24_20/0.1)] bg-[#f4f6fa]">
        <div className="mx-auto grid max-w-[1200px] grid-cols-2 lg:grid-cols-4 px-4 sm:px-6">
          {[
            { value: "2.400+", label: "Otel", sub: "TÜRKİYE GENELİNDE" },
            { value: "1M+", label: "Mutlu misafir", sub: "GÜVENLE KONAKLADI" },
            { value: "4,8/5", label: "Müşteri puanı", sub: "SON 30 GÜNDE" },
            { value: "7/24", label: "Destek", sub: "CANLI DESTEK HATTI" },
          ].map((s, i) => (
            <div
              key={s.label}
              className={`pt-7 pb-5 px-4 sm:px-8 ${
                i > 0 ? "border-l border-[rgb(26_24_20/0.1)]" : ""
              }`}
            >
              {/* lg altı: değer ve etiket alt alta. Yan yana "4,8/5 Müşteri
                  puanı" iki kolonda sığmayıp sarıyor ve dördünün hizası
                  bozuluyordu. */}
              <div className="flex flex-col gap-0.5 lg:flex-row lg:items-baseline lg:gap-2">
                <span className="text-[22px] sm:text-[26px] font-extrabold tracking-[-0.02em] text-ink">
                  {s.value}
                </span>
                <span className="text-[14px] font-semibold text-slate-text">
                  {s.label}
                </span>
              </div>
              <div className="mt-0.5 text-[10.5px] font-semibold tracking-[0.12em] text-muted uppercase">
                {s.sub}
              </div>
            </div>
          ))}
        </div>
      </div>

      <main className="flex-1">
        {/* ── POPÜLER DESTİNASYONLAR ── */}
        <section className="bg-paper py-10 sm:py-12">
          <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
            <div className="mb-6 flex items-end justify-between gap-6 border-b border-[rgb(26_24_20/0.1)] pb-4">
              <div>
                <span className="text-[11px] tracking-[0.14em] text-muted uppercase">
                  Nereye gitsek?
                </span>
                <h2 className="mt-1 text-[24px] leading-[1.05] font-extrabold tracking-[-0.025em] text-ink sm:text-[30px]">
                  Popüler destinasyonlar
                </h2>
              </div>
              <Link
                href="/search"
                className="group inline-flex items-center gap-1.5 text-[13.5px] font-semibold whitespace-nowrap text-navy underline-offset-[4px] hover:underline"
              >
                <span className="lg:hidden">Tümü</span>
                <span className="hidden lg:inline">Tüm oteller</span>
                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>

            <div
              className={cn(
                // lg altı: yatay snap şerit. Kenarlara taşırıp (-mx/px)
                // kartların ekran kenarının altına kaymasını sağlıyoruz.
                "no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6",
                // lg üstü: eski üç kolonlu ızgara
                "lg:mx-0 lg:grid lg:grid-cols-3 lg:gap-x-4 lg:gap-y-6 lg:overflow-visible lg:px-0 lg:pb-0"
              )}
            >
              {DESTINATIONS.map((d) => (
                <Link
                  key={d.region}
                  href={`/search?destination=${encodeURIComponent(d.region)}`}
                  className="group block w-[72vw] max-w-[300px] shrink-0 snap-start lg:w-auto lg:max-w-none"
                >
                  <div className="relative aspect-[4/3] overflow-hidden rounded-md border border-[rgb(26_24_20/0.08)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={d.image}
                      alt={d.region}
                      className="h-full w-full object-cover transition-transform duration-[600ms] group-hover:scale-[1.04]"
                      loading="lazy"
                    />
                    {/* amber fiyat etiketi */}
                    <div className="absolute bottom-3 left-3 inline-flex items-baseline gap-1 rounded-sm bg-gold px-2.5 py-1.5 shadow-[0_2px_0_rgb(11_13_20/0.2)]">
                      <span className="text-[11px] font-semibold tracking-wider text-ink uppercase">
                        gecelik
                      </span>
                      <span className="text-[14px] font-bold text-ink">
                        {d.fromPrice}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 flex items-baseline justify-between gap-4">
                    <div>
                      <h3 className="text-[18px] leading-tight font-bold tracking-[-0.015em] text-ink group-hover:text-navy">
                        {d.region}
                      </h3>
                      <p className="mt-0.5 text-[13px] leading-snug text-slate-text">
                        {d.ports}
                      </p>
                    </div>
                    <span className="flex shrink-0 items-center gap-1 text-[11.5px] tracking-[0.08em] whitespace-nowrap text-muted uppercase">
                      <Calendar className="size-3" aria-hidden />
                      {d.stay}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── ÖZELLİKLER — editorial ── */}
        {/* Kampanyalar — app'te ana sayfanın altında da bir şerit.
            Kampanyalar ayrı sekme olsa da Pegasus'ta da ana sayfada var. */}
        <section className="b2c-only px-4 pt-2 pb-6" aria-label="Fırsatlar">
          <div className="flex items-center justify-between pb-3">
            <h2 className="text-[17px] font-extrabold tracking-[-0.02em] text-ink">
              Fırsatlar
            </h2>
            <Link
              href="/kampanyalar"
              className="flex min-h-11 items-center gap-1 text-[13px] font-semibold text-navy"
            >
              Tümü
              <ArrowRight className="size-3.5" />
            </Link>
          </div>

          <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4">
            {CAMPAIGNS.map((k) => (
              <Link
                key={k.code}
                href="/kampanyalar"
                className="flex w-[74vw] max-w-[300px] shrink-0 snap-start flex-col justify-end rounded-xl p-4 pt-10"
                style={{ background: k.bg }}
              >
                <span className="text-[10px] font-bold tracking-[0.14em] text-white/75 uppercase">
                  {k.tag}
                </span>
                <div className="mt-0.5 flex items-end gap-2">
                  <span className="text-[26px] leading-none font-extrabold text-gold">
                    {k.amount}
                  </span>
                  <span className="pb-0.5 text-[13px] leading-tight font-bold text-white">
                    {k.title}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="web-only border-y border-[rgb(26_24_20/0.1)] bg-row py-10 sm:py-12">
          <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
            <div className="grid grid-cols-1 gap-0 md:grid-cols-2">
              {FEATURES.map((f, i) => (
                <div
                  key={f.title}
                  className={`flex flex-col gap-2.5 px-4 py-6 sm:px-7 md:py-0 ${
                    i > 0
                      ? "border-t border-[rgb(26_24_20/0.12)] md:border-t-0 md:border-l"
                      : ""
                  }`}
                >
                  <span className="text-[12px] font-semibold tracking-[0.08em] text-muted">
                    {String(i + 1).padStart(2, "0")} /{" "}
                    {String(FEATURES.length).padStart(2, "0")}
                  </span>
                  <h3 className="text-[22px] leading-[1.1] font-extrabold tracking-[-0.02em] text-ink">
                    {f.title}
                  </h3>
                  <p className="max-w-[36ch] text-[14px] leading-[1.55] text-slate-text">
                    {f.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <div className="web-only">
        <Footer />
      </div>

      <SearchOverlay
        open={aramaAcik}
        onClose={() => setAramaAcik(false)}
        onSearch={handleSearch}
      />
    </div>
  );
}
