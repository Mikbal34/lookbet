"use client";

// Arama barındaki Giriş/Çıkış tarih alanı — native date input yerine
// lookbet. tasarım diline uygun özel takvim popup'ı (react-day-picker, range).

import * as React from "react";
import { CalendarDays } from "lucide-react";
import { DayPicker, type DateRange } from "react-day-picker";
import { tr } from "react-day-picker/locale";
import "react-day-picker/style.css";
import { cn } from "@/lib/utils/cn";

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fromISO(s: string): Date | undefined {
  if (!s) return undefined;
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

function formatLabel(s: string): string {
  const d = fromISO(s);
  if (!d) return "";
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
    weekday: "short",
  }).format(d);
}

const cellLabel =
  "flex items-center gap-1.5 text-[11px] font-bold tracking-[1.2px] uppercase text-muted";

export interface DateRangeFieldProps {
  checkIn: string;
  checkOut: string;
  onChange: (checkIn: string, checkOut: string) => void;
}

export function DateRangeField({
  checkIn,
  checkOut,
  onChange,
}: DateRangeFieldProps) {
  const [open, setOpen] = React.useState(false);
  // Giriş seçildikten sonra fare gezdirilen gün — canlı aralık önizlemesi için
  const [hovered, setHovered] = React.useState<Date | undefined>(undefined);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Dışarı tıklayınca kapat
  React.useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const range: DateRange | undefined = fromISO(checkIn)
    ? { from: fromISO(checkIn), to: fromISO(checkOut) }
    : undefined;

  const handleSelect = (r: DateRange | undefined) => {
    const from = r?.from ? toISO(r.from) : "";
    const to = r?.to ? toISO(r.to) : "";
    onChange(from, to);
    // Tarih seçince otomatik kapatma yok — kullanıcı takvim dışına tıklayınca kapanır.
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const cellButton = (label: string, value: string, placeholder: string) => (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      className="px-5 py-2.5 border-r border-line flex-1 min-w-0 text-left cursor-pointer"
    >
      <div className={cellLabel}>
        <CalendarDays className="size-3.5" aria-hidden="true" />
        {label}
      </div>
      <div
        className={cn(
          "font-sans text-[16px] font-semibold mt-1 whitespace-nowrap",
          value ? "text-ink" : "text-muted/60"
        )}
      >
        {value ? formatLabel(value) : placeholder}
      </div>
    </button>
  );

  // Giriş seçili, çıkış bekleniyorsa: giriş → fare üstündeki gün arası önizleme
  const previewRange =
    range?.from && !range?.to && hovered && hovered > range.from
      ? { from: range.from, to: hovered }
      : undefined;

  return (
    // relative + flex-[2]: takvim popup'ı Giriş/Çıkış alanlarının hemen altına
    // hizalanır (contents yerine gerçek konumlu bir kapsayıcı).
    <div ref={containerRef} className="relative flex flex-[2] min-w-0">
      {cellButton("Giriş", checkIn, "Tarih seç")}
      {cellButton("Çıkış", checkOut, "Tarih seç")}

      {open && (
        <div className="absolute left-0 top-[calc(100%+10px)] z-30 bg-white rounded-md border border-line shadow-[0_12px_28px_-10px_rgb(11_13_20/0.25)] p-3 lookbet-daypicker">
          <DayPicker
            mode="range"
            locale={tr}
            numberOfMonths={2}
            selected={range}
            onSelect={handleSelect}
            onDayMouseEnter={(day) => setHovered(day)}
            onDayMouseLeave={() => setHovered(undefined)}
            modifiers={previewRange ? { preview: previewRange } : undefined}
            modifiersClassNames={{ preview: "range-preview" }}
            disabled={{ before: today }}
            showOutsideDays={false}
          />
        </div>
      )}
    </div>
  );
}
