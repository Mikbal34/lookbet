"use client";

// LookBeds ana sayfa — CruiseScanner (Skyscanner-tarzı) tasarımın turuncu hali:
// dümdüz turuncu bant (header + başlık + arama + hızlı chip'ler tek blok),
// beyaz gövde, amber fiyat etiketli 4:3 destinasyon kartları, editorial
// özellik bandı.

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Calendar } from "lucide-react";
import { Navbar, Footer } from "@/components/layout";
import { SearchForm } from "@/components/search";
import { useLocale } from "@/components/providers/locale-provider";

const QUICK_LINKS = [
  { label: "İstanbul", query: "İstanbul" },
  { label: "Antalya", query: "Antalya" },
  { label: "Kapadokya", query: "Kapadokya" },
  { label: "Bodrum", query: "Bodrum" },
  { label: "Çeşme", query: "Çeşme" },
  { label: "Uludağ", query: "Uludağ" },
];

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
    router.push(`/search?${p.toString()}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-paper">
      {/* ── TURUNCU BANT: header + hero + arama + chip'ler tek blok ── */}
      <Navbar variant="transparent" />
      <section className="bg-navy">
        <div className="mx-auto max-w-[1200px] px-4 pt-7 pb-9 sm:px-6 sm:pt-9 sm:pb-11">
          <h1 className="max-w-[24ch] text-[clamp(1.8rem,3.8vw,2.85rem)] leading-[1.06] font-extrabold tracking-[-0.03em] text-white">
            Bir sonraki konaklamanı bul
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13.5px]">
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

          {/* Arama kartı */}
          <div className="mt-6 sm:mt-7">
            <SearchForm onSearch={handleSearch} />
          </div>

          {/* Hızlı chip'ler */}
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
            <span className="text-[11px] tracking-[0.14em] text-white/60 uppercase">
              Popüler aramalar
            </span>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_LINKS.map((q) => (
                <Link
                  key={q.label}
                  href={`/search?destination=${encodeURIComponent(q.query)}`}
                  className="rounded-full border border-white/25 bg-white/5 px-3 py-1 text-[12.5px] font-medium text-white/90 transition-colors hover:border-white/60 hover:bg-white/10 hover:text-white"
                >
                  {q.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ŞERİDİ — CruiseScanner tarzı büyük bloklar ── */}
      <div className="border-b border-[rgb(26_24_20/0.1)] bg-[#f4f6fa]">
        <div className="mx-auto grid max-w-[1200px] grid-cols-2 lg:grid-cols-4 px-4 sm:px-6">
          {[
            { value: "2.400+", label: "Otel", sub: "TÜRKİYE GENELİNDE" },
            { value: "1M+", label: "Mutlu misafir", sub: "GÜVENLE KONAKLADI" },
            { value: "4,8/5", label: "Müşteri puanı", sub: "SON 30 GÜNDE" },
            { value: "7/24", label: "Destek", sub: "CANLI DESTEK HATTI" },
          ].map((s, i) => (
            <div
              key={s.label}
              className={`py-6 px-4 sm:px-8 ${
                i > 0 ? "border-l border-[rgb(26_24_20/0.1)]" : ""
              }`}
            >
              <div className="flex items-baseline gap-2">
                <span className="text-[26px] sm:text-[30px] font-extrabold tracking-[-0.02em] text-ink">
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
        <section className="bg-paper py-16 sm:py-20">
          <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
            <div className="mb-8 flex items-end justify-between gap-6 border-b border-[rgb(26_24_20/0.1)] pb-6">
              <div>
                <span className="text-[11px] tracking-[0.14em] text-muted uppercase">
                  Nereye gitsek?
                </span>
                <h2 className="mt-1 text-[32px] leading-[1.05] font-extrabold tracking-[-0.025em] text-ink sm:text-[40px]">
                  Popüler destinasyonlar
                </h2>
              </div>
              <Link
                href="/search"
                className="group hidden items-center gap-1.5 text-[13.5px] font-semibold whitespace-nowrap text-navy underline-offset-[4px] hover:underline sm:inline-flex"
              >
                Tüm oteller
                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-x-5 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
              {DESTINATIONS.map((d) => (
                <Link
                  key={d.region}
                  href={`/search?destination=${encodeURIComponent(d.region)}`}
                  className="group block"
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
        <section className="border-y border-[rgb(26_24_20/0.1)] bg-row py-16 sm:py-20">
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

      <Footer />
    </div>
  );
}
