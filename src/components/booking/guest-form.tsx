"use client";

// Usage:
// {guests.map((g, i) => (
//   <GuestForm key={i} index={i} roomIndex={0} register={register} errors={errors} type={g.type} />
// ))}

import * as React from "react";
import { User } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { UseFormRegister, FieldErrors } from "react-hook-form";

export interface GuestFormProps {
  index: number;
  roomIndex: number;
  register: UseFormRegister<any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  errors: FieldErrors;
  type?: "Adult" | "Child";
  className?: string;
}

const fieldClass = (hasError: boolean) =>
  cn(
    "h-9 w-full rounded-lg border px-3 text-sm text-gray-900 placeholder:text-gray-400 bg-white",
    "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors",
    hasError
      ? "border-red-400 focus:ring-red-400"
      : "border-gray-300 hover:border-gray-400"
  );

const selectClass = (hasError: boolean) =>
  cn(
    "h-9 w-full appearance-none rounded-lg border px-3 text-sm text-gray-900 bg-white",
    "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors",
    hasError
      ? "border-red-400 focus:ring-red-400"
      : "border-gray-300 hover:border-gray-400"
  );

const NATIONALITIES = [
  "TR", "DE", "GB", "FR", "RU", "US", "NL", "BE", "IT", "ES", "AT", "CH",
];

export function GuestForm({
  index,
  roomIndex,
  register,
  errors,
  type = "Adult",
  className,
}: GuestFormProps) {
  const prefix = `rooms.${roomIndex}.guests.${index}` as const;
  const guestErrors = (errors as any)?.rooms?.[roomIndex]?.guests?.[index];

  const title = type === "Adult" ? `Yetiskin ${index + 1}` : `Cocuk ${index + 1}`;

  return (
    <div
      className={cn(
        "bg-white rounded-xl border border-gray-100 p-4 space-y-3",
        className
      )}
      aria-label={title}
    >
      {/* Hidden type field */}
      <input type="hidden" {...register(`${prefix}.type`)} value={type} />

      <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
        <User className="h-4 w-4 text-blue-400" aria-hidden="true" />
        {title}
        <span
          className={cn(
            "ml-auto text-xs font-medium px-2 py-0.5 rounded-full",
            type === "Adult"
              ? "bg-blue-50 text-blue-600"
              : "bg-amber-50 text-amber-600"
          )}
        >
          {type === "Adult" ? "Yetiskin" : "Cocuk"}
        </span>
      </h4>

      {/* Name + Surname */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label
            htmlFor={`${prefix}-name`}
            className="text-xs font-medium text-gray-600"
          >
            Ad
          </label>
          <input
            id={`${prefix}-name`}
            type="text"
            placeholder="Ad"
            autoComplete="given-name"
            aria-invalid={!!guestErrors?.name}
            className={fieldClass(!!guestErrors?.name)}
            {...register(`${prefix}.name`)}
          />
          {guestErrors?.name && (
            <p role="alert" className="text-xs text-red-600">
              {guestErrors.name.message as string}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor={`${prefix}-surname`}
            className="text-xs font-medium text-gray-600"
          >
            Soyad
          </label>
          <input
            id={`${prefix}-surname`}
            type="text"
            placeholder="Soyad"
            autoComplete="family-name"
            aria-invalid={!!guestErrors?.surname}
            className={fieldClass(!!guestErrors?.surname)}
            {...register(`${prefix}.surname`)}
          />
          {guestErrors?.surname && (
            <p role="alert" className="text-xs text-red-600">
              {guestErrors.surname.message as string}
            </p>
          )}
        </div>
      </div>

      {/* Gender + Nationality + Age (child only) */}
      <div
        className={cn(
          "grid gap-3",
          type === "Child" ? "grid-cols-3" : "grid-cols-2"
        )}
      >
        {/* Gender */}
        <div className="flex flex-col gap-1">
          <label
            htmlFor={`${prefix}-gender`}
            className="text-xs font-medium text-gray-600"
          >
            Cinsiyet
          </label>
          <div className="relative">
            <select
              id={`${prefix}-gender`}
              aria-invalid={!!guestErrors?.gender}
              className={selectClass(!!guestErrors?.gender)}
              {...register(`${prefix}.gender`)}
            >
              <option value="Male">Erkek</option>
              <option value="Female">Kadin</option>
            </select>
            <svg
              className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Nationality */}
        <div className="flex flex-col gap-1">
          <label
            htmlFor={`${prefix}-nationality`}
            className="text-xs font-medium text-gray-600"
          >
            Uyruk
          </label>
          <div className="relative">
            <select
              id={`${prefix}-nationality`}
              defaultValue="TR"
              className={selectClass(!!guestErrors?.nationality)}
              {...register(`${prefix}.nationality`)}
            >
              {NATIONALITIES.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
            <svg
              className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Age (child only) */}
        {type === "Child" && (
          <div className="flex flex-col gap-1">
            <label
              htmlFor={`${prefix}-age`}
              className="text-xs font-medium text-gray-600"
            >
              Yas
            </label>
            <input
              id={`${prefix}-age`}
              type="number"
              min={0}
              max={17}
              placeholder="0-17"
              aria-invalid={!!guestErrors?.age}
              className={fieldClass(!!guestErrors?.age)}
              {...register(`${prefix}.age`, { valueAsNumber: true })}
            />
            {guestErrors?.age && (
              <p role="alert" className="text-xs text-red-600">
                {guestErrors.age.message as string}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
