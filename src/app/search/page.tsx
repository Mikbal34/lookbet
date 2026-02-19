"use client";

// Search results page
// Reads URL params, fetches hotels via react-query, shows filters + hotel cards

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { SearchX } from "lucide-react";
import { Navbar, Footer } from "@/components/layout";
import { SearchForm } from "@/components/search";
import { HotelCard, HotelFilters } from "@/components/hotel";
import type { HotelFiltersValue } from "@/components/hotel";
import { Skeleton } from "@/components/ui/skeleton";
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
    router.push(`/search?${p.toString()}`);
  };

  const destination = rawParams.get("destination") ?? "";
  const checkIn = rawParams.get("checkIn") ?? "";
  const checkOut = rawParams.get("checkOut") ?? "";

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <main className="flex-1">
        {/* Search bar top */}
        <div className="bg-white border-b border-gray-200 py-4">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
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

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex gap-6 items-start">
            {/* Sidebar filters */}
            <div className="hidden lg:block w-64 shrink-0">
              <HotelFilters
                filters={filters}
                onFilterChange={setFilters}
                boardTypes={allBoardTypes}
              />
            </div>

            {/* Results */}
            <div className="flex-1 min-w-0">
              {/* Mobile filters */}
              <div className="lg:hidden mb-4">
                <HotelFilters
                  filters={filters}
                  onFilterChange={setFilters}
                  boardTypes={allBoardTypes}
                />
              </div>

              {/* Results header */}
              {!isLoading && !isError && data && (
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold text-gray-900">
                      {filteredHotels.length}
                    </span>{" "}
                    otel bulundu
                    {destination && (
                      <span className="text-gray-500"> — {destination}</span>
                    )}
                  </p>
                </div>
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
                  <SearchX className="h-12 w-12 text-red-400 mb-4" aria-hidden="true" />
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
                      <SearchX className="h-14 w-14 text-gray-500" aria-hidden="true" />
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
                <div className="space-y-4">
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
      </main>

      <Footer />
    </div>
  );
}
