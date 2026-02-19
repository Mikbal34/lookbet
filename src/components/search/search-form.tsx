"use client";

// Usage:
// <SearchForm onSearch={(data) => router.push(`/hotels?${params}`)} />
// <SearchForm initialValues={{ destination: "Antalya", checkIn: "2026-03-01", checkOut: "2026-03-07" }} />

import * as React from "react";
import { MapPin, Calendar, Search } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { GuestSelector, type GuestValue } from "./guest-selector";

const NATIONALITIES = [
  { code: "TR", label: "Türkiye" },
  { code: "DE", label: "Almanya" },
  { code: "GB", label: "İngiltere" },
  { code: "FR", label: "Fransa" },
  { code: "RU", label: "Rusya" },
  { code: "US", label: "Amerika" },
  { code: "NL", label: "Hollanda" },
  { code: "BE", label: "Belçika" },
  { code: "IT", label: "İtalya" },
  { code: "ES", label: "İspanya" },
];

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
}

const defaultGuests: GuestValue = { adult: 2, childAges: [] };

export function SearchForm({
  initialValues,
  onSearch,
  loading = false,
  className,
}: SearchFormProps) {
  const [destination, setDestination] = React.useState(
    initialValues?.destination ?? ""
  );
  const [checkIn, setCheckIn] = React.useState(initialValues?.checkIn ?? "");
  const [checkOut, setCheckOut] = React.useState(initialValues?.checkOut ?? "");
  const [guests, setGuests] = React.useState<GuestValue>(
    initialValues?.guests ?? defaultGuests
  );
  const [nationality, setNationality] = React.useState(
    initialValues?.nationality ?? "TR"
  );
  const [errors, setErrors] = React.useState<Partial<Record<keyof SearchFormValues, string>>>({});

  const today = new Date().toISOString().split("T")[0];

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

  const handleCheckInChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCheckIn(val);
    if (checkOut && val >= checkOut) setCheckOut("");
    setErrors((prev) => ({ ...prev, checkIn: undefined }));
  };

  const handleCheckOutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCheckOut(e.target.value);
    setErrors((prev) => ({ ...prev, checkOut: undefined }));
  };

  return (
    <div
      className={cn(
        "bg-white rounded-2xl shadow-lg border border-gray-100 p-4 md:p-6",
        className
      )}
    >
      <form onSubmit={handleSubmit} noValidate aria-label="Otel arama formu">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto] gap-3 lg:gap-4 items-end">
          {/* Destination */}
          <div className="lg:col-span-1 flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700" htmlFor="destination">
              Destinasyon
            </label>
            <div className="relative">
              <MapPin
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
                aria-hidden="true"
              />
              <input
                id="destination"
                type="text"
                value={destination}
                onChange={(e) => {
                  setDestination(e.target.value);
                  setErrors((prev) => ({ ...prev, destination: undefined }));
                }}
                placeholder="Otel adı veya şehir"
                autoComplete="off"
                aria-invalid={!!errors.destination}
                aria-describedby={errors.destination ? "dest-error" : undefined}
                className={cn(
                  "h-10 w-full rounded-lg border pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 bg-white",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors",
                  errors.destination
                    ? "border-red-400 focus:ring-red-400"
                    : "border-gray-300 hover:border-gray-400"
                )}
              />
            </div>
            {errors.destination && (
              <p id="dest-error" role="alert" className="text-xs text-red-600">
                {errors.destination}
              </p>
            )}
          </div>

          {/* Check-in */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700" htmlFor="check-in">
              Giriş Tarihi
            </label>
            <div className="relative">
              <Calendar
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
                aria-hidden="true"
              />
              <input
                id="check-in"
                type="date"
                value={checkIn}
                min={today}
                onChange={handleCheckInChange}
                aria-invalid={!!errors.checkIn}
                aria-describedby={errors.checkIn ? "checkin-error" : undefined}
                className={cn(
                  "h-10 w-full rounded-lg border pl-9 pr-3 text-sm text-gray-900 bg-white",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors",
                  errors.checkIn
                    ? "border-red-400 focus:ring-red-400"
                    : "border-gray-300 hover:border-gray-400"
                )}
              />
            </div>
            {errors.checkIn && (
              <p id="checkin-error" role="alert" className="text-xs text-red-600">
                {errors.checkIn}
              </p>
            )}
          </div>

          {/* Check-out */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700" htmlFor="check-out">
              Çıkış Tarihi
            </label>
            <div className="relative">
              <Calendar
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
                aria-hidden="true"
              />
              <input
                id="check-out"
                type="date"
                value={checkOut}
                min={checkIn || today}
                onChange={handleCheckOutChange}
                aria-invalid={!!errors.checkOut}
                aria-describedby={errors.checkOut ? "checkout-error" : undefined}
                className={cn(
                  "h-10 w-full rounded-lg border pl-9 pr-3 text-sm text-gray-900 bg-white",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors",
                  errors.checkOut
                    ? "border-red-400 focus:ring-red-400"
                    : "border-gray-300 hover:border-gray-400"
                )}
              />
            </div>
            {errors.checkOut && (
              <p id="checkout-error" role="alert" className="text-xs text-red-600">
                {errors.checkOut}
              </p>
            )}
          </div>

          {/* Guests + Nationality stacked on mobile, side by side on md */}
          <div className="grid grid-cols-2 md:grid-cols-1 lg:grid-cols-1 gap-3">
            {/* Guests */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">
                Misafirler
              </label>
              <GuestSelector value={guests} onChange={setGuests} />
            </div>

            {/* Nationality */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700" htmlFor="nationality">
                Uyruk
              </label>
              <div className="relative">
                <select
                  id="nationality"
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                  className={cn(
                    "h-10 w-full appearance-none rounded-lg border border-gray-300 px-3 pr-8 text-sm text-gray-900 bg-white",
                    "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors",
                    "hover:border-gray-400"
                  )}
                >
                  {NATIONALITIES.map((n) => (
                    <option key={n.code} value={n.code}>
                      {n.code} - {n.label}
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
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            aria-busy={loading}
            className={cn(
              "h-10 w-full lg:w-auto lg:px-6 rounded-lg bg-blue-600 text-white text-sm font-semibold",
              "flex items-center justify-center gap-2",
              "hover:bg-blue-700 active:bg-blue-800 transition-colors duration-150",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
              "disabled:opacity-60 disabled:pointer-events-none",
              "md:col-span-2 lg:col-span-1"
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
        </div>
      </form>
    </div>
  );
}
