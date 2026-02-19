"use client";

// Usage:
// <HotelFilters
//   filters={filters}
//   onFilterChange={setFilters}
//   boardTypes={["BB", "HB", "FB", "AI"]}
// />

import * as React from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface HotelFiltersValue {
  stars: number[];
  minPrice: string;
  maxPrice: string;
  boardTypes: string[];
  sortBy: SortOption;
}

export type SortOption =
  | "price_asc"
  | "price_desc"
  | "stars_desc"
  | "name_asc";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "price_asc", label: "Fiyat (Ucuzdan Pahalıya)" },
  { value: "price_desc", label: "Fiyat (Pahalıdan Ucuza)" },
  { value: "stars_desc", label: "Yıldız (Yüksekten Düşüğe)" },
  { value: "name_asc", label: "İsim (A-Z)" },
];

const STAR_OPTIONS = [5, 4, 3];

export interface HotelFiltersProps {
  filters: HotelFiltersValue;
  onFilterChange: (filters: HotelFiltersValue) => void;
  boardTypes: string[];
  className?: string;
}

export function HotelFilters({
  filters,
  onFilterChange,
  boardTypes,
  className,
}: HotelFiltersProps) {
  const update = <K extends keyof HotelFiltersValue>(
    key: K,
    value: HotelFiltersValue[K]
  ) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const toggleStar = (star: number) => {
    const next = filters.stars.includes(star)
      ? filters.stars.filter((s) => s !== star)
      : [...filters.stars, star];
    update("stars", next);
  };

  const toggleBoardType = (bt: string) => {
    const next = filters.boardTypes.includes(bt)
      ? filters.boardTypes.filter((b) => b !== bt)
      : [...filters.boardTypes, bt];
    update("boardTypes", next);
  };

  const hasActiveFilters =
    filters.stars.length > 0 ||
    filters.boardTypes.length > 0 ||
    filters.minPrice !== "" ||
    filters.maxPrice !== "";

  const clearAll = () => {
    onFilterChange({
      stars: [],
      minPrice: "",
      maxPrice: "",
      boardTypes: [],
      sortBy: filters.sortBy,
    });
  };

  return (
    <aside
      className={cn(
        "bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-6",
        className
      )}
      aria-label="Otel filtreleri"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-gray-500" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-gray-900">Filtreler</h2>
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearAll}
            className={cn(
              "flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 transition-colors",
              "focus:outline-none focus:underline"
            )}
          >
            <X className="h-3 w-3" aria-hidden="true" />
            Temizle
          </button>
        )}
      </div>

      {/* Sort */}
      <fieldset>
        <legend className="text-sm font-medium text-gray-700 mb-2">Sıralama</legend>
        <div className="relative">
          <select
            value={filters.sortBy}
            onChange={(e) => update("sortBy", e.target.value as SortOption)}
            aria-label="Sıralama seçin"
            className={cn(
              "h-9 w-full appearance-none rounded-lg border border-gray-300 px-3 pr-8 text-sm text-gray-900 bg-white",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            )}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <svg
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </fieldset>

      <hr className="border-gray-100" />

      {/* Stars */}
      <fieldset>
        <legend className="text-sm font-medium text-gray-700 mb-3">Yıldız</legend>
        <div className="space-y-2">
          {STAR_OPTIONS.map((star) => {
            const id = `star-${star}`;
            return (
              <label
                key={star}
                htmlFor={id}
                className="flex items-center gap-2.5 cursor-pointer group"
              >
                <input
                  id={id}
                  type="checkbox"
                  checked={filters.stars.includes(star)}
                  onChange={() => toggleStar(star)}
                  className={cn(
                    "h-4 w-4 rounded border-gray-300 text-blue-600",
                    "focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  )}
                />
                <span className="flex items-center gap-1">
                  {Array.from({ length: star }, (_, i) => (
                    <svg
                      key={i}
                      className="h-3.5 w-3.5 fill-amber-400 text-amber-400"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  ))}
                  <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">
                    {star} Yıldız
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <hr className="border-gray-100" />

      {/* Price range */}
      <fieldset>
        <legend className="text-sm font-medium text-gray-700 mb-3">Fiyat Aralığı (EUR)</legend>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <label htmlFor="min-price" className="sr-only">Minimum fiyat</label>
            <input
              id="min-price"
              type="number"
              value={filters.minPrice}
              onChange={(e) => update("minPrice", e.target.value)}
              placeholder="Min"
              min={0}
              className={cn(
                "h-9 w-full rounded-lg border border-gray-300 px-3 text-sm text-gray-900 bg-white",
                "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors",
                "placeholder:text-gray-400"
              )}
            />
          </div>
          <span className="text-gray-400 text-sm">-</span>
          <div className="flex-1">
            <label htmlFor="max-price" className="sr-only">Maksimum fiyat</label>
            <input
              id="max-price"
              type="number"
              value={filters.maxPrice}
              onChange={(e) => update("maxPrice", e.target.value)}
              placeholder="Max"
              min={0}
              className={cn(
                "h-9 w-full rounded-lg border border-gray-300 px-3 text-sm text-gray-900 bg-white",
                "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors",
                "placeholder:text-gray-400"
              )}
            />
          </div>
        </div>
      </fieldset>

      {/* Board type */}
      {boardTypes.length > 0 && (
        <>
          <hr className="border-gray-100" />
          <fieldset>
            <legend className="text-sm font-medium text-gray-700 mb-3">Pansiyon Tipi</legend>
            <div className="space-y-2">
              {boardTypes.map((bt) => {
                const id = `bt-${bt}`;
                return (
                  <label
                    key={bt}
                    htmlFor={id}
                    className="flex items-center gap-2.5 cursor-pointer"
                  >
                    <input
                      id={id}
                      type="checkbox"
                      checked={filters.boardTypes.includes(bt)}
                      onChange={() => toggleBoardType(bt)}
                      className={cn(
                        "h-4 w-4 rounded border-gray-300 text-blue-600",
                        "focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      )}
                    />
                    <span className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                      {bt}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        </>
      )}
    </aside>
  );
}
