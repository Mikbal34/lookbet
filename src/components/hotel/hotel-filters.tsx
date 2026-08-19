"use client";

// Filtre paneli — lookbet. tasarım dili: beyaz kart, uppercase mikro
// başlıklar, altın yıldızlar, keskin köşeli kutular.

import * as React from "react";
import { SlidersHorizontal, X, Globe } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { NATIONALITIES } from "@/lib/constants/nationalities";

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

const sectionLabel =
  "text-xs font-bold tracking-[1.5px] uppercase text-muted mb-2.5";
const inputBox =
  "h-10 w-full rounded-md border border-line-strong px-3 text-sm text-ink bg-white focus:outline-none focus:border-navy transition-colors placeholder:text-muted/70";

export interface HotelFiltersProps {
  filters: HotelFiltersValue;
  onFilterChange: (filters: HotelFiltersValue) => void;
  boardTypes: string[];
  className?: string;
  nationality?: string;
  onNationalityChange?: (code: string) => void;
}

export function HotelFilters({
  filters,
  onFilterChange,
  boardTypes,
  className,
  nationality,
  onNationalityChange,
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
        "bg-white rounded-md border border-[rgb(26_24_20/0.08)] p-[22px] space-y-[22px]",
        className
      )}
      aria-label="Otel filtreleri"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-muted" aria-hidden="true" />
          <h2 className="text-sm font-bold text-ink">Filtreler</h2>
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearAll}
            className="flex items-center gap-1 text-xs text-navy font-semibold hover:text-gold transition-colors"
          >
            <X className="h-3 w-3" aria-hidden="true" />
            Temizle
          </button>
        )}
      </div>

      {/* Sıralama */}
      <fieldset>
        <legend className={sectionLabel}>Sıralama</legend>
        <select
          value={filters.sortBy}
          onChange={(e) => update("sortBy", e.target.value as SortOption)}
          aria-label="Sıralama seçin"
          className={cn(inputBox, "appearance-none cursor-pointer pr-8")}
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </fieldset>

      <hr className="border-line" />

      {/* Yıldız */}
      <fieldset>
        <legend className={sectionLabel}>Yıldız</legend>
        <div className="space-y-2">
          {STAR_OPTIONS.map((star) => {
            const checked = filters.stars.includes(star);
            return (
              <label
                key={star}
                className="flex items-center gap-2.5 cursor-pointer text-sm font-medium"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleStar(star)}
                  className="sr-only"
                />
                <span
                  className={cn(
                    "w-[18px] h-[18px] rounded-sm border-[1.5px] inline-flex items-center justify-center text-white text-[11px]",
                    checked ? "bg-navy border-navy" : "border-line-strong bg-white"
                  )}
                  aria-hidden="true"
                >
                  {checked ? "✓" : ""}
                </span>
                <span className="text-gold tracking-[1px]">
                  {"★".repeat(star)}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <hr className="border-line" />

      {/* Fiyat aralığı */}
      <fieldset>
        <legend className={sectionLabel}>Gecelik fiyat (EUR)</legend>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={filters.minPrice}
            onChange={(e) => update("minPrice", e.target.value)}
            placeholder="Min"
            min={0}
            aria-label="Minimum fiyat"
            className={inputBox}
          />
          <span className="text-muted text-sm">–</span>
          <input
            type="number"
            value={filters.maxPrice}
            onChange={(e) => update("maxPrice", e.target.value)}
            placeholder="Max"
            min={0}
            aria-label="Maksimum fiyat"
            className={inputBox}
          />
        </div>
      </fieldset>

      {/* Misafir uyruğu */}
      {nationality !== undefined && onNationalityChange && (
        <>
          <hr className="border-line" />
          <fieldset>
            <legend className={cn(sectionLabel, "flex items-center gap-1.5")}>
              <Globe className="h-3.5 w-3.5" aria-hidden="true" />
              Misafir uyruğu
            </legend>
            <select
              value={nationality}
              onChange={(e) => onNationalityChange(e.target.value)}
              aria-label="Misafir uyruğu seçin"
              className={cn(inputBox, "appearance-none cursor-pointer pr-8")}
            >
              {NATIONALITIES.map((n) => (
                <option key={n.code} value={n.code}>
                  {n.code} - {n.label}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-muted">
              Otel fiyatları misafir uyruğuna göre değişebilir
            </p>
          </fieldset>
        </>
      )}

      {/* Pansiyon tipi */}
      {boardTypes.length > 0 && (
        <>
          <hr className="border-line" />
          <fieldset>
            <legend className={sectionLabel}>Pansiyon tipi</legend>
            <div className="flex flex-wrap gap-2">
              {boardTypes.map((bt) => {
                const checked = filters.boardTypes.includes(bt);
                return (
                  <button
                    key={bt}
                    type="button"
                    onClick={() => toggleBoardType(bt)}
                    className={cn(
                      "rounded-sm px-3 py-1.5 text-[12.5px] font-semibold border transition-colors",
                      checked
                        ? "bg-navy border-navy text-paper"
                        : "border-line-strong text-slate-text hover:border-navy"
                    )}
                  >
                    {bt}
                  </button>
                );
              })}
            </div>
          </fieldset>
        </>
      )}
    </aside>
  );
}
