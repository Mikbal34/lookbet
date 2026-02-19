"use client";

// Usage:
// <GuestSelector
//   value={{ adult: 2, childAges: [5, 8] }}
//   onChange={(v) => setGuests(v)}
// />

import * as React from "react";
import { Minus, Plus, Users } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface GuestValue {
  adult: number;
  childAges: number[];
}

export interface GuestSelectorProps {
  value: GuestValue;
  onChange: (value: GuestValue) => void;
  className?: string;
}

function CounterRow({
  label,
  subtitle,
  value,
  min,
  max,
  onDecrement,
  onIncrement,
}: {
  label: string;
  subtitle?: string;
  value: number;
  min: number;
  max: number;
  onDecrement: () => void;
  onIncrement: () => void;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-medium text-gray-900">{label}</p>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onDecrement}
          disabled={value <= min}
          aria-label={`${label} azalt`}
          className={cn(
            "h-8 w-8 rounded-full border border-gray-300 flex items-center justify-center",
            "text-gray-600 transition-colors duration-150",
            "hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50",
            "focus:outline-none focus:ring-2 focus:ring-blue-500",
            "disabled:opacity-40 disabled:pointer-events-none"
          )}
        >
          <Minus className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <span
          className="w-5 text-center text-sm font-semibold text-gray-900"
          aria-live="polite"
        >
          {value}
        </span>
        <button
          type="button"
          onClick={onIncrement}
          disabled={value >= max}
          aria-label={`${label} artır`}
          className={cn(
            "h-8 w-8 rounded-full border border-gray-300 flex items-center justify-center",
            "text-gray-600 transition-colors duration-150",
            "hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50",
            "focus:outline-none focus:ring-2 focus:ring-blue-500",
            "disabled:opacity-40 disabled:pointer-events-none"
          )}
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export function GuestSelector({ value, onChange, className }: GuestSelectorProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Close on outside click
  React.useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [isOpen]);

  // Close on Escape
  React.useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    if (isOpen) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen]);

  const handleAdultChange = (delta: number) => {
    const next = Math.min(6, Math.max(1, value.adult + delta));
    onChange({ ...value, adult: next });
  };

  const handleChildChange = (delta: number) => {
    const currentCount = value.childAges.length;
    const nextCount = Math.min(4, Math.max(0, currentCount + delta));
    if (nextCount > currentCount) {
      onChange({ ...value, childAges: [...value.childAges, 0] });
    } else {
      onChange({ ...value, childAges: value.childAges.slice(0, nextCount) });
    }
  };

  const handleChildAge = (index: number, age: number) => {
    const ages = [...value.childAges];
    ages[index] = age;
    onChange({ ...value, childAges: ages });
  };

  const totalGuests = value.adult + value.childAges.length;
  const label =
    value.childAges.length > 0
      ? `${value.adult} Yetişkin, ${value.childAges.length} Çocuk`
      : `${value.adult} Yetişkin`;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className={cn(
          "h-10 w-full flex items-center gap-2 rounded-lg border px-3 text-sm text-gray-900 bg-white",
          "transition-colors duration-150",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
          isOpen ? "border-blue-500 ring-2 ring-blue-500" : "border-gray-300 hover:border-gray-400"
        )}
      >
        <Users className="h-4 w-4 text-gray-400 shrink-0" aria-hidden="true" />
        <span className="flex-1 text-left truncate">{label}</span>
        <span className="text-xs text-gray-400">{totalGuests} kişi</span>
      </button>

      {isOpen && (
        <div
          className={cn(
            "absolute left-0 top-full mt-2 z-50 w-72 bg-white rounded-xl border border-gray-200 shadow-lg",
            "animate-in fade-in-0 zoom-in-95 duration-150"
          )}
          role="dialog"
          aria-label="Misafir seçici"
        >
          <div className="px-4 divide-y divide-gray-100">
            <CounterRow
              label="Yetişkin"
              subtitle="12 yaş ve üzeri"
              value={value.adult}
              min={1}
              max={6}
              onDecrement={() => handleAdultChange(-1)}
              onIncrement={() => handleAdultChange(1)}
            />
            <CounterRow
              label="Çocuk"
              subtitle="0-11 yaş"
              value={value.childAges.length}
              min={0}
              max={4}
              onDecrement={() => handleChildChange(-1)}
              onIncrement={() => handleChildChange(1)}
            />

            {value.childAges.length > 0 && (
              <div className="py-3 space-y-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Çocuk Yaşları
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {value.childAges.map((age, i) => (
                    <div key={i} className="flex flex-col gap-1">
                      <label
                        htmlFor={`child-age-${i}`}
                        className="text-xs text-gray-600"
                      >
                        {i + 1}. Çocuk
                      </label>
                      <select
                        id={`child-age-${i}`}
                        value={age}
                        onChange={(e) => handleChildAge(i, Number(e.target.value))}
                        className={cn(
                          "h-8 w-full appearance-none rounded-md border border-gray-300 px-2 text-sm text-gray-900 bg-white",
                          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        )}
                      >
                        {Array.from({ length: 18 }, (_, n) => (
                          <option key={n} value={n}>
                            {n === 0 ? "0 (Bebek)" : `${n} yaş`}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-gray-100 px-4 py-3 flex justify-end">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className={cn(
                "h-8 px-4 rounded-lg bg-blue-600 text-white text-sm font-medium",
                "hover:bg-blue-700 transition-colors duration-150",
                "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              )}
            >
              Tamam
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
