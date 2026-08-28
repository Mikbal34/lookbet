"use client";

// Otel arama barı — lookbet. tasarım dili: beyaz bar, dikey ayraçlar,
// uppercase mikro etiketler, altın "Ara" butonu.
// Uyruk seçici yalnızca acente (B2B) kullanıcılarında görünür; B2C'de TR
// varsayılanıyla arka planda gönderilir (fiyatlar uyruğa göre değişir).

import * as React from "react";
import { useSession } from "next-auth/react";
import { Search, MapPin, Users, Globe } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { NATIONALITIES, DEFAULT_NATIONALITY } from "@/lib/constants/nationalities";
import { GuestSelector, type GuestValue } from "./guest-selector";
import { DateRangeField } from "./date-range-field";

export interface SearchFormValues {
  destination: string;
  checkIn: string;
  checkOut: string;
  guests: GuestValue;
  nationality: string;
}

export interface SearchFormProps {
  initialValues?: Partial<SearchFormValues>;
  onSearch?: (values: SearchFormValues) => void;
  loading?: boolean;
  className?: string;
  showNationality?: boolean;
  /** Destinasyon alanının altında öneri chip'leri göster (tam ekran akış). */
  suggestions?: readonly { label: string; query: string }[];
  /** Açılışta destinasyon alanına odaklan (tam ekran akış). */
  autoFocusDestination?: boolean;
}

const defaultGuests: GuestValue = { adult: 2, childAges: [] };

// CruiseScanner arama barı dili: ikonlu uppercase mikro etiket + büyük değer
const cellLabel =
  "flex items-center gap-1.5 text-[11px] font-bold tracking-[1.2px] uppercase text-muted";
const cellInput =
  "border-none outline-none font-sans text-[16px] font-semibold text-ink w-full mt-1 bg-transparent placeholder:text-muted/60";

export function SearchForm({
  initialValues,
  onSearch,
  loading = false,
  className,
  showNationality,
  suggestions,
  autoFocusDestination = false,
}: SearchFormProps) {
  const { data: session } = useSession();
  const nationalityVisible =
    showNationality ?? session?.user?.role === "AGENCY";

  const [destination, setDestination] = React.useState(
    initialValues?.destination ?? ""
  );
  const [checkIn, setCheckIn] = React.useState(initialValues?.checkIn ?? "");
  const [checkOut, setCheckOut] = React.useState(initialValues?.checkOut ?? "");
  const [guests, setGuests] = React.useState<GuestValue>(
    initialValues?.guests ?? defaultGuests
  );
  const [nationality, setNationality] = React.useState(
    initialValues?.nationality ?? DEFAULT_NATIONALITY
  );
  const [errors, setErrors] = React.useState<
    Partial<Record<keyof SearchFormValues, string>>
  >({});

  const validate = (): boolean => {
    const next: typeof errors = {};
    if (!destination.trim()) next.destination = "Destinasyon giriniz";
    if (!checkIn) next.checkIn = "Giriş tarihi seçin";
    if (!checkOut) next.checkOut = "Çıkış tarihi seçin";
    if (checkIn && checkOut && checkIn >= checkOut) {
      next.checkOut = "Çıkış tarihi giriş tarihinden sonra olmalı";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSearch?.({ destination, checkIn, checkOut, guests, nationality });
  };

  const hasError = Object.values(errors).some(Boolean);

  return (
    <div className={cn("relative w-full", className)}>
      <form
        onSubmit={handleSubmit}
        noValidate
        aria-label="Otel arama formu"
        style={{ width: "100%" }}
        className="w-full bg-white rounded-[10px] shadow-[0_12px_28px_-10px_rgb(11_13_20/0.35)] flex flex-col lg:flex-row lg:flex-nowrap items-stretch"
      >
        {/* Destinasyon */}
        <div className="w-full lg:flex-1 min-w-0 px-5 py-3 lg:py-2.5 border-b border-line lg:border-b-0 lg:border-r">
          <div className={cellLabel}>
            <MapPin className="size-3.5" aria-hidden="true" />
            Nereye
          </div>
          <input
            id="destination"
            type="text"
            value={destination}
            onChange={(e) => {
              setDestination(e.target.value);
              setErrors((prev) => ({ ...prev, destination: undefined }));
            }}
            placeholder="Şehir, bölge veya otel"
            autoComplete="off"
            autoFocus={autoFocusDestination}
            aria-invalid={!!errors.destination}
            className={cellInput}
          />

          {/* Öneriler — yalnızca tam ekran akışta ve alan boşken.
              Dolduktan sonra gizleniyor ki klavye açıkken yer kaplamasın. */}
          {suggestions && suggestions.length > 0 && !destination.trim() && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {suggestions.map((sg) => (
                <button
                  key={sg.query}
                  type="button"
                  onClick={() => {
                    setDestination(sg.query);
                    setErrors((prev) => ({ ...prev, destination: undefined }));
                  }}
                  className="rounded-full border border-line-strong px-3 py-1.5 text-[13px] font-medium text-slate-text active:bg-chip"
                >
                  {sg.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Giriş + Çıkış — özel takvim popup'ı */}
        <DateRangeField
          checkIn={checkIn}
          checkOut={checkOut}
          onChange={(ci, co) => {
            setCheckIn(ci);
            setCheckOut(co);
            setErrors((prev) => ({
              ...prev,
              checkIn: undefined,
              checkOut: undefined,
            }));
          }}
        />

        {/* Misafirler */}
        <div
          className={cn(
            "w-full lg:flex-1 min-w-0 px-5 py-3 lg:py-2.5",
            nationalityVisible && "border-b border-line lg:border-b-0 lg:border-r"
          )}
        >
          <div className={cellLabel}>
            <Users className="size-3.5" aria-hidden="true" />
            Yolcular
          </div>
          <div className="mt-1">
            <GuestSelector value={guests} onChange={setGuests} />
          </div>
        </div>

        {/* Uyruk — sadece acente */}
        {nationalityVisible && (
          <div className="w-full lg:flex-1 min-w-0 px-5 py-3 lg:py-2.5 border-b border-line lg:border-b-0">
            <label htmlFor="nationality" className={cellLabel}>
              <Globe className="size-3.5" aria-hidden="true" />
              Uyruk
            </label>
            <select
              id="nationality"
              value={nationality}
              onChange={(e) => setNationality(e.target.value)}
              className={cn(cellInput, "cursor-pointer appearance-none")}
            >
              {NATIONALITIES.map((n) => (
                <option key={n.code} value={n.code}>
                  {n.code} - {n.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Ara — tam boy amber segment (CruiseScanner tarzı) */}
        <button
          type="submit"
          disabled={loading}
          aria-busy={loading}
          className={cn(
            "bg-gold hover:bg-gold-dark text-ink font-sans text-[16px] font-bold",
            "w-full lg:w-auto px-9 self-stretch min-h-[54px] flex-none flex items-center justify-center gap-2.5",
            "rounded-b-[10px] lg:rounded-b-none lg:rounded-r-[10px]",
            "transition-colors cursor-pointer disabled:opacity-60 disabled:pointer-events-none"
          )}
        >
          {loading ? (
            <svg
              className="h-4 w-4 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"
              />
            </svg>
          ) : (
            <Search className="h-4 w-4" aria-hidden="true" />
          )}
          Ara
        </button>
      </form>

      {hasError && (
        <p role="alert" className="mt-2 text-xs font-semibold text-red-600 px-2">
          {errors.destination || errors.checkIn || errors.checkOut}
        </p>
      )}
    </div>
  );
}
