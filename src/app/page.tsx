import { Navbar, Footer } from "@/components/layout";
import { SearchForm } from "@/components/search";
import { BadgeCheck, Building2, HeadphonesIcon, MapPin } from "lucide-react";
import Link from "next/link";

// Home page - server component
// Displays hero section with search, features grid, popular destinations, and footer

const features = [
  {
    icon: BadgeCheck,
    title: "En İyi Fiyatlar",
    description:
      "Fiyat garantimizle her zaman en uygun oteli bulun. Daha ucuza bulamazsınız!",
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    icon: Building2,
    title: "10.000+ Otel",
    description:
      "Türkiye ve dünya genelinde binlerce otel seçeneği arasından dilediğinizi seçin.",
    color: "text-indigo-600",
    bg: "bg-indigo-50",
  },
  {
    icon: HeadphonesIcon,
    title: "7/24 Destek",
    description:
      "Uzman destek ekibimiz gün boyu ve hafta sonu dahil her an yanınızda.",
    color: "text-violet-600",
    bg: "bg-violet-50",
  },
];

const stats = [
  { value: "10.000+", label: "Otel" },
  { value: "500.000+", label: "Mutlu Misafir" },
  { value: "50+", label: "Ülke" },
  { value: "7/24", label: "Destek" },
];

const destinations = [
  {
    city: "İstanbul",
    country: "Türkiye",
    hotels: "1.200+",
    image:
      "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=600&q=80&auto=format&fit=crop",
  },
  {
    city: "Antalya",
    country: "Türkiye",
    hotels: "850+",
    image:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80&auto=format&fit=crop",
  },
  {
    city: "Kapadokya",
    country: "Türkiye",
    hotels: "320+",
    image:
      "https://images.unsplash.com/photo-1570939274717-7eda259b50ed?w=600&q=80&auto=format&fit=crop",
  },
  {
    city: "Bodrum",
    country: "Türkiye",
    hotels: "480+",
    image:
      "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=600&q=80&auto=format&fit=crop",
  },
  {
    city: "Dubai",
    country: "BAE",
    hotels: "920+",
    image:
      "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=600&q=80&auto=format&fit=crop",
  },
  {
    city: "Paris",
    country: "Fransa",
    hotels: "1.100+",
    image:
      "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600&q=80&auto=format&fit=crop",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <main className="flex-1">
        {/* Hero */}
        <section
          className="relative overflow-hidden py-24 md:py-36"
          aria-labelledby="hero-heading"
          style={{
            backgroundImage:
              "url(https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1920&q=80&auto=format&fit=crop)",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          {/* Dark overlay */}
          <div
            className="absolute inset-0 bg-gradient-to-br from-blue-900/75 via-blue-800/65 to-indigo-900/75"
            aria-hidden="true"
          />
          {/* Subtle pattern overlay */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 80%, #ffffff22 0%, transparent 50%), radial-gradient(circle at 80% 20%, #ffffff11 0%, transparent 50%)",
            }}
            aria-hidden="true"
          />

          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto mb-10 max-w-2xl text-center">
              <span className="inline-block mb-4 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-white/90 text-sm font-medium border border-white/20">
                Türkiye&apos;nin En Büyük Otel Rezervasyon Platformu
              </span>
              <h1
                id="hero-heading"
                className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl drop-shadow-md"
              >
                Hayalinizdeki Oteli Bulun
              </h1>
              <p className="mt-4 text-lg text-blue-100/90 sm:text-xl drop-shadow">
                10.000&apos;den fazla otel arasından en uygun fiyatlı seçimi
                yapın. Anında rezervasyon, güvenli ödeme.
              </p>
            </div>

            <SearchForm className="mx-auto max-w-5xl" />
          </div>
        </section>

        {/* Stats Bar */}
        <section className="bg-white border-b border-gray-100" aria-label="İstatistikler">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-gray-100">
              {stats.map((stat) => (
                <div key={stat.label} className="py-6 text-center">
                  <p className="text-2xl font-bold text-blue-600">{stat.value}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section
          className="py-16 md:py-24"
          aria-labelledby="features-heading"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-12 text-center">
              <h2
                id="features-heading"
                className="text-3xl font-bold text-gray-900 sm:text-4xl"
              >
                Neden Lookbet?
              </h2>
              <p className="mt-3 text-gray-500">
                Milyonlarca kullanıcının tercih ettiği otel rezervasyon
                platformu
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.title}
                    className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm transition-shadow duration-200 hover:shadow-md"
                  >
                    <div
                      className={`mb-5 inline-flex h-14 w-14 items-center justify-center rounded-xl ${feature.bg}`}
                    >
                      <Icon
                        className={`h-7 w-7 ${feature.color}`}
                        aria-hidden="true"
                      />
                    </div>
                    <h3 className="mb-2 text-xl font-semibold text-gray-900">
                      {feature.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-gray-500">
                      {feature.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Popular Destinations */}
        <section
          className="py-16 md:py-24 bg-white"
          aria-labelledby="destinations-heading"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-12 text-center">
              <h2
                id="destinations-heading"
                className="text-3xl font-bold text-gray-900 sm:text-4xl"
              >
                Popüler Destinasyonlar
              </h2>
              <p className="mt-3 text-gray-500">
                En çok tercih edilen şehirlerde otel arayın
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {destinations.map((dest) => (
                <Link
                  key={dest.city}
                  href={`/search?destination=${encodeURIComponent(dest.city)}`}
                  className="group relative rounded-2xl overflow-hidden h-52 block shadow-sm hover:shadow-lg transition-shadow duration-300"
                >
                  <img
                    src={dest.image}
                    alt={`${dest.city} görseli`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  {/* Content */}
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <div className="flex items-end justify-between">
                      <div>
                        <h3 className="text-xl font-bold text-white leading-tight">
                          {dest.city}
                        </h3>
                        <div className="flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3.5 w-3.5 text-white/70" aria-hidden="true" />
                          <span className="text-sm text-white/80">{dest.country}</span>
                        </div>
                      </div>
                      <span className="text-sm font-medium bg-white/15 backdrop-blur-sm text-white px-2.5 py-1 rounded-full border border-white/20">
                        {dest.hotels} otel
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Banner */}
        <section
          className="relative overflow-hidden py-20"
          style={{
            backgroundImage:
              "url(https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1920&q=80&auto=format&fit=crop)",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div
            className="absolute inset-0 bg-gradient-to-r from-blue-700/90 to-indigo-800/90"
            aria-hidden="true"
          />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl font-bold text-white sm:text-3xl md:text-4xl">
              Hemen rezervasyon yapın, en iyi fiyatı kilitleyın!
            </h2>
            <p className="mt-3 text-blue-100 text-lg">
              Fiyatlar her an değişebilir — bugün rezervasyon yapın.
            </p>
            <Link
              href="/search"
              className="mt-8 inline-block bg-white text-blue-700 font-semibold px-8 py-3 rounded-xl hover:bg-blue-50 transition-colors duration-200 shadow-lg"
            >
              Otel Ara
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
