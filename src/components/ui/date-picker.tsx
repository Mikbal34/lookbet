"use client";

import * as React from "react";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils/cn";

// Usage:
// <DatePicker label="Check-in Date" error={errors.checkIn?.message} />
// <DatePicker
//   label="Check-out Date"
//   min={checkInDate}
//   value={checkOut}
//   onChange={(e) => setCheckOut(e.target.value)}
// />

export interface DatePickerProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  id?: string;
}

export const DatePicker = React.forwardRef<HTMLInputElement, DatePickerProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;
    const errorId = `${inputId}-error`;
    const hintId = `${inputId}-hint`;

    const describedBy = [
      error ? errorId : null,
      hint ? hintId : null,
    ]
      .filter(Boolean)
      .join(" ") || undefined;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-gray-700"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type="date"
            aria-describedby={describedBy}
            aria-invalid={error ? "true" : undefined}
            className={cn(
              "h-10 w-full rounded-lg border px-3 pl-9 text-sm text-gray-900",
              "bg-white transition-colors duration-150",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 focus:border-blue-500",
              "disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500",
              // Style the native date picker
              "[&::-webkit-calendar-picker-indicator]:opacity-0",
              "[&::-webkit-calendar-picker-indicator]:absolute",
              "[&::-webkit-calendar-picker-indicator]:inset-0",
              "[&::-webkit-calendar-picker-indicator]:w-full",
              "[&::-webkit-calendar-picker-indicator]:cursor-pointer",
              error
                ? "border-red-400 focus:ring-red-400 focus:border-red-400"
                : "border-gray-300 hover:border-gray-400",
              className
            )}
            {...props}
          />
          <Calendar
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
            aria-hidden="true"
          />
        </div>
        {hint && !error && (
          <p id={hintId} className="text-xs text-gray-500">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} role="alert" className="text-xs text-red-600">
            {error}
          </p>
        )}
      </div>
    );
  }
);

DatePicker.displayName = "DatePicker";
