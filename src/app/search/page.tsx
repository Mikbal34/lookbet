"use client";

// Search results page
// Reads URL params, fetches hotels via react-query, shows filters + hotel cards

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  LbAramaBos,
  LbFiltre,
  LbHarita,
  LbKalem,
  LbListe,
} from "@/components/ui/icons";
import {AppHeader, Navbar, Footer } from "@/components/layout";
import { SearchForm, SearchOverlay } from "@/components/search";
import { HotelCard, HotelFilters } from "@/components/hotel";
import dynamic from "next/dynamic";

// Leaflet window/document'a doğrudan dokunuyor → ssr:false.
// Ayrı parça olarak yükleniyor; liste görünümünde hiç indirilmiyor.
const HotelMap = dynamic(
  () => import("@/components/hotel/hotel-map").then((m) => m.HotelMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-[13.5px] text-muted">
        Harita yükleniyor…
      </div>
    ),
  }
);
import type { HotelFiltersValue } from "@/components/hotel";
import { Skeleton } from "@/components/ui/skeleton";
import { MobileSheet } from "@/components/ui/mobile-sheet";
import { useMediaQuery } from "@/lib/utils/use-media-query";
import { formatDateRange } from "@/lib/utils";
import { cn } from "@/lib/utils/cn";
import { addRecentSearch } from "@/lib/utils/recent-searches";
import type { HotelSearchResult, HotelSearchResponse } from "@/lib/royal-api/types";

// ---------- helpers ----------

function buildSearchPayload(params: URLSearchParams) {
  const destination = params.get("destination") ?? "";
  const checkIn = params.get("checkIn") ?? "";
  const checkOut = params.get("checkOut") ?? "";
  const adults = parseInt(params.get("adults") ?? "2", 10);
  const childAges = (params.get("childAges") ?? "")
    .split(",")
    .filter(Boolean)
    .map(Number);
  const nationality = params.get("nationality") ?? "TR";
  const currency = params.get("currency") ?? "EUR";

  return {
    destination,
    checkIn,
    checkOut,
    nationality,
    currency,
    rooms: [{ adult: adults, childAges: childAges.length ? childAges : undefined }],
  };
}

function buildSearchParams(params: URLSearchParams): string {
  return params.toString();
}

async function searchHotels(payload: ReturnType<typeof buildSearchPayload>): Promise<HotelSearchResponse> {
  const res = await fetch("/api/hotels/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Arama sırasında bir hata oluştu");
  return res.json();
}

function applyFilters(
  hotels: HotelSearchResult[],
  filters: HotelFiltersValue
): HotelSearchResult[] {
  let result = [...hotels];

  if (filters.stars.length > 0) {
    result = result.filter((h) => filters.stars.includes(h.stars));
  }
  if (filters.boardTypes.length > 0) {
    result = result.filter((h) =>
      h.boardTypes.some((bt) => filters.boardTypes.includes(bt))
    );
  }
  if (filters.minPrice !== "") {
    result = result.filter((h) => h.minPrice >= Number(filters.minPrice));
  }
  if (filters.maxPrice !== "") {
    result = result.filter((h) => h.minPrice <= Number(filters.maxPrice));
  }

  result.sort((a, b) => {
    if (filters.sortBy === "price_asc") return a.minPrice - b.minPrice;
    if (filters.sortBy === "price_desc") return b.minPrice - a.minPrice;
    if (filters.sortBy === "stars_desc") return b.stars - a.stars;
    if (filters.sortBy === "name_asc") return a.hotelName.localeCompare(b.hotelName, "tr");
    return 0;
  });

  return result;
}

// ---------- skeleton ----------

function HotelCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col sm:flex-row h-auto">
      <Skeleton className="sm:w-52 h-48 sm:h-auto rounded-none" />
      <div className="flex flex-col flex-1 p-4 gap-3">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-3 w-1/2" />
        <div className="flex gap-2 mt-auto">
          <Skeleton className="h-6 w-16 rounded-md" />
          <Skeleton className="h-6 w-16 rounded-md" />
        </div>
        <div className="flex justify-between items-center pt-2 border-t border-gray-50">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
    </div>
  );
}

// ---------- page ----------

const DEFAULT_FILTERS: HotelFiltersValue = {
  stars: [],
  minPrice: "",
  maxPrice: "",
  boardTypes: [],
  sortBy: "price_asc",
};

export default function SearchPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen flex items-center justify-center">Yükleniyor...</div>}>
      <SearchPageContent />
    </React.Suspense>
  );
}

function SearchPageContent() {
  const router = useRouter();
  const rawParams = useSearchParams();
  const [filters, setFilters] = React.useState<HotelFiltersValue>(DEFAULT_FILTERS);
  // Filtre kenar çubuğu lg'den itibaren görünür; altında alt sayfa kullanılır
  const filtersInSheet = useMediaQuery("(max-width: 1023px)");
  // Mobilde arama barı ekranın yarısını yiyordu: özet satırı + isteğe bağlı açılım
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [gorunum, setGorunum] = React.useState<"liste" | "harita">("liste");
  const [filtersOpen, setFiltersOpen] = React.useState(false);

  const payload = React.useMemo(() => buildSearchPayload(rawParams), [rawParams]);
  const searchParamStr = buildSearchParams(rawParams);

  const { data, isLoading, isError, error } = useQuery<HotelSearchResponse>({
    queryKey: ["hotels-search", payload],
    queryFn: () => searchHotels(payload),
    enabled: !!(payload.destination && payload.checkIn && payload.checkOut),
    staleTime: 5 * 60 * 1000,
  });

  const filteredHotels = React.useMemo(
    () => applyFilters(data?.hotels ?? [], filters),
    [data?.hotels, filters]
  );

  // Collect all board types found in results for filter panel
  const allBoardTypes = React.useMemo(() => {
    const set = new Set<string>();
    (data?.hotels ?? []).forEach((h) => h.boardTypes.forEach((bt) => set.add(bt)));
    return Array.from(set).sort();
  }, [data?.hotels]);

  // SearchForm onSearch handler: update URL params
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
    // Mevcut para birimi tercihini koru
    p.set("currency", rawParams.get("currency") ?? "EUR");

    addRecentSearch({
      destination: values.destination,
      checkIn: values.checkIn,
      checkOut: values.checkOut,
      adults: values.guests.adult,
    });

    router.push(`/search?${p.toString()}`);
  };

  const activeFilterCount =
    filters.stars.length +
    filters.boardTypes.length +
    (filters.minPrice !== "" ? 1 : 0) +
    (filters.maxPrice !== "" ? 1 : 0);

  const destination = rawParams.get("destination") ?? "";
  const checkIn = rawParams.get("checkIn") ?? "";
  const checkOut = rawParams.get("checkOut") ?? "";
  const nationality = rawParams.get("nationality") ?? "TR";

  // Uyruk değişince URL güncellenir → fiyatlar yeni uyrukla tekrar aranır.
  const handleNationalityChange = (code: string) => {
    const p = new URLSearchParams(rawParams.toString());
    p.set("nationality", code);
    router.push(`/search?${p.toString()}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <AppHeader geri="/" />
      <div className="web-only">
        <Navbar />
      </div>

      <main className="flex-1">
        {/* Arama barı — mobilde önce tek satırlık özet, dokununca tam form */}
        <div className="bg-white border-b border-gray-200 py-3 sm:py-4">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* Mobil özet satırı */}
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="flex w-full items-center gap-3 rounded-md border border-line-strong px-4 py-3 text-left active:bg-chip lg:hidden"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-bold text-ink">
                  {destination || "Nereye gitmek istersin?"}
                </span>
                <span className="block truncate text-[12.5px] text-muted">
                  {checkIn && checkOut
                    ? `${formatDateRange(checkIn, checkOut)} · ${rawParams.get("adults") ?? 2} kişi`
                    : "Tarih ve misafir seç"}
                </span>
              </span>
              <LbKalem size={16} className="text-navy" />
            </button>

            {/* Tam form yalnızca masaüstünde satır içi; lg altında aynı
                değerlerle tam ekran katman açılıyor (aşağıda). */}
            <div className="hidden lg:block">
              <SearchForm
                initialValues={{
                  destination,
                  checkIn,
                  checkOut,
                  nationality: rawParams.get("nationality") ?? "TR",
                }}
                onSearch={handleSearch}
                loading={isLoading}
              />
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex gap-6 items-start">
            {/* Sidebar filters */}
            <div className="hidden lg:block w-64 shrink-0">
              <HotelFilters
                filters={filters}
                onFilterChange={setFilters}
                boardTypes={allBoardTypes}
                nationality={nationality}
                onNationalityChange={handleNationalityChange}
              />
            </div>

            {/* Results */}
            <div className="flex-1 min-w-0">
              {/* Sonuç başlığı + mobil filtre tetikleyicisi */}
              {/* lg altı: yapışkan eylem satırı. Liste uzadığında Filtreler
                  ve Harita kaydırmayla erişilemez kalıyordu; kenarlara
                  taşırılıp kendi zeminini alıyor ki altındaki kartlar
                  üstünden geçerken okunur kalsın. */}
              <div className="sticky top-0 z-20 -mx-4 mb-4 flex items-center justify-between gap-3 border-b border-line bg-paper px-4 py-2 sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0 lg:py-0">
                {!isLoading && !isError && data ? (
                  <p className="min-w-0 truncate text-[14.5px] text-slate-text">
                    <b className="text-ink">{filteredHotels.length}</b> otel
                    {/* "bulundu — İstanbul" 375px'te iki satıra sarıyordu;
                        destinasyon zaten üstteki arama özetinde yazıyor. */}
                    <span className="hidden lg:inline"> bulundu</span>
                    {destination && (
                      <span className="hidden text-muted lg:inline">
                        {" "}
                        — {destination}
                      </span>
                    )}
                  </p>
                ) : (
                  <span />
                )}

                <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setGorunum((g) => (g === "liste" ? "harita" : "liste"))
                  }
                  aria-pressed={gorunum === "harita"}
                  className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-md border border-line-strong px-3.5 py-2.5 text-[13.5px] font-bold text-ink active:bg-chip lg:hidden"
                >
                  {gorunum === "liste" ? (
                    <>
                      <LbHarita size={16} />
                      Harita
                    </>
                  ) : (
                    <>
                      <LbListe size={16} />
                      Liste
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setFiltersOpen(true)}
                  className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-md border border-line-strong px-3.5 py-2.5 text-[13.5px] font-bold text-ink active:bg-chip lg:hidden"
                >
                  <LbFiltre size={16} />
                  Filtreler
                  {activeFilterCount > 0 && (
                    <span className="inline-flex size-5 items-center justify-center rounded-full bg-navy text-[11px] font-bold text-white">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
                </div>
              </div>

              {/* Harita görünümü — yalnızca lg altında, listenin yerine.
                  Masaüstünde liste her zaman görünür, geçiş düğmesi yok. */}
              {!isLoading && !isError && gorunum === "harita" && (
                <HotelMap
                  hotels={filteredHotels}
                  searchParams={searchParamStr}
                  className="h-[70dvh] min-h-[380px] overflow-hidden rounded-md border border-line lg:hidden"
                />
              )}

              {/* Loading skeletons */}
              {isLoading && (
                <div className="space-y-4" aria-busy="true" aria-label="Oteller yükleniyor">
                  {Array.from({ length: 6 }, (_, i) => (
                    <HotelCardSkeleton key={i} />
                  ))}
                </div>
              )}

              {/* Error state */}
              {isError && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <LbAramaBos size={44} className="mb-4 text-red-400" />
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">
                    Arama sırasında hata oluştu
                  </h2>
                  <p className="text-sm text-gray-500">
                    {error instanceof Error ? error.message : "Lütfen tekrar deneyin"}
                  </p>
                </div>
              )}

              {/* Empty state */}
              {!isLoading && !isError && filteredHotels.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="relative w-40 h-40 mb-6 rounded-2xl overflow-hidden shadow-md">
                    <img
                      src="https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400&q=80&auto=format&fit=crop"
                      alt=""
                      className="w-full h-full object-cover opacity-40"
                      aria-hidden="true"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <LbAramaBos size={52} className="text-muted" />
                    </div>
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">
                    Sonuç bulunamadı
                  </h2>
                  <p className="text-sm text-gray-500 max-w-md">
                    Arama kriterlerinizi veya filtreleri değiştirerek tekrar
                    deneyin.
                  </p>
                </div>
              )}

              {/* Hotel grid */}
              {!isLoading && filteredHotels.length > 0 && (
                <div
                  className={cn(
                    "space-y-4",
                    gorunum === "harita" && "hidden lg:block"
                  )}
                >
                  {filteredHotels.map((hotel) => (
                    <HotelCard
                      key={hotel.hotelCode}
                      hotel={hotel}
                      searchParams={searchParamStr}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobil filtre alt sayfası */}
        <MobileSheet
          open={filtersOpen && filtersInSheet}
          onClose={() => setFiltersOpen(false)}
          title="Filtreler"
          footer={
            <button
              type="button"
              onClick={() => setFiltersOpen(false)}
              className="h-12 w-full rounded-md bg-gold text-[15px] font-bold text-ink active:bg-gold-dark"
            >
              {filteredHotels.length} oteli göster
            </button>
          }
        >
          <HotelFilters
            filters={filters}
            onFilterChange={setFilters}
            boardTypes={allBoardTypes}
            nationality={nationality}
            onNationalityChange={handleNationalityChange}
            hideTitle
            className="border-0 p-0"
          />
        </MobileSheet>
      </main>

      <SearchOverlay
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        initialValues={{
          destination,
          checkIn,
          checkOut,
          nationality: rawParams.get("nationality") ?? "TR",
        }}
        onSearch={handleSearch}
        loading={isLoading}
      />

      <Footer />
    </div>
  );
}
