"use client";

// Usage:
// <GuestSelector
//   value={{ adult: 2, childAges: [5, 8] }}
//   onChange={(v) => setGuests(v)}
// />

import * as React from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useMediaQuery } from "@/lib/utils/use-media-query";
import { MobileSheet } from "@/components/ui/mobile-sheet";

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
    <div className="flex items-center justify-between py-2.5">
      <div>
        <p className="text-sm font-bold text-ink">{label}</p>
        {subtitle && <p className="text-xs text-muted mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onDecrement}
          disabled={value <= min}
          aria-label={`${label} azalt`}
          className={cn(
            "size-10 lg:size-8 rounded-md border border-line-strong flex items-center justify-center",
            "text-slate-text transition-colors duration-150",
            "hover:border-navy hover:text-navy active:bg-chip",
            "focus:outline-none focus:ring-2 focus:ring-navy",
            "disabled:opacity-40 disabled:pointer-events-none"
          )}
        >
          <Minus className="h-4 w-4 lg:h-3.5 lg:w-3.5" aria-hidden="true" />
        </button>
        <span
          className="w-5 text-center text-sm font-bold text-ink"
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
            "size-10 lg:size-8 rounded-md border border-line-strong flex items-center justify-center",
            "text-slate-text transition-colors duration-150",
            "hover:border-navy hover:text-navy active:bg-chip",
            "focus:outline-none focus:ring-2 focus:ring-navy",
            "disabled:opacity-40 disabled:pointer-events-none"
          )}
        >
          <Plus className="h-4 w-4 lg:h-3.5 lg:w-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export function GuestSelector({ value, onChange, className }: GuestSelectorProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const isMobile = useMediaQuery("(max-width: 1023px)");

  // Close on outside click
  React.useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen && !isMobile) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [isOpen, isMobile]);

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

  const panelContent = (
    <>
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
          <p className="text-[11px] font-bold text-muted uppercase tracking-[1.5px]">
            Çocuk Yaşları
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {value.childAges.map((age, i) => (
              <div key={i} className="flex flex-col gap-1">
                <label
                  htmlFor={`child-age-${i}`}
                  className="text-xs text-slate-text font-semibold"
                >
                  {i + 1}. Çocuk
                </label>
                <select
                  id={`child-age-${i}`}
                  value={age}
                  onChange={(e) => handleChildAge(i, Number(e.target.value))}
                  className={cn(
                    "h-11 lg:h-8 w-full appearance-none rounded-md border border-line-strong px-2 text-sm text-ink bg-white",
                    "focus:outline-none focus:border-navy"
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
    </>
  );

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className={cn(
          "w-full flex items-center gap-2 text-[16px] font-semibold text-ink bg-transparent",
          "cursor-pointer focus:outline-none"
        )}
      >
        <span className="flex-1 text-left truncate">{label}</span>
        <span className="text-xs text-muted shrink-0">{totalGuests} kişi</span>
      </button>

      {/* Masaüstü: alanın altına açılan popup */}
      {isOpen && !isMobile && (
        <div
          className={cn(
            "hidden lg:block absolute left-0 top-full mt-3 z-50 w-72 bg-white rounded-md border border-line shadow-[0_12px_28px_-10px_rgb(11_13_20/0.25)]"
          )}
          role="dialog"
          aria-label="Misafir seçici"
        >
          <div className="px-4 divide-y divide-line">{panelContent}</div>
        </div>
      )}

      {/* Mobil: alt sayfa */}
      <MobileSheet
        open={isOpen && isMobile}
        onClose={() => setIsOpen(false)}
        title="Misafirler"
        footer={
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="h-12 w-full rounded-md bg-gold text-[15px] font-bold text-ink active:bg-gold-dark"
          >
            Tamam
          </button>
        }
      >
        <div className="divide-y divide-line">{panelContent}</div>
      </MobileSheet>
    </div>
  );
}
