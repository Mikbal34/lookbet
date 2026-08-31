"use client";

// Arama barındaki Giriş/Çıkış tarih alanı — native date input yerine
// lookbet. tasarım diline uygun özel takvim popup'ı (react-day-picker, range).

import * as React from "react";
import { LbTakvimDuz } from "@/components/ui/icons";
import { DayPicker, type DateRange } from "react-day-picker";
import { tr } from "react-day-picker/locale";
import "react-day-picker/style.css";
import { cn } from "@/lib/utils/cn";
import { useMediaQuery } from "@/lib/utils/use-media-query";
import { MobileSheet } from "@/components/ui/mobile-sheet";

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
  // 1024px altı: alt sayfa (tek ay, büyük gün kutuları)
  const isMobile = useMediaQuery("(max-width: 1023px)");

  // Dışarı tıklayınca kapat — mobilde panel portal ile body'ye basıldığı için
  // "dışarısı" sayılır ve anında kapanırdı; orada kapatmayı sheet üstleniyor.
  React.useEffect(() => {
    if (!open || isMobile) return;
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
  }, [open, isMobile]);

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

  // Giriş seçili, çıkış bekleniyorsa: giriş → fare üstündeki gün arası önizleme
  const previewRange =
    range?.from && !range?.to && hovered && hovered > range.from
      ? { from: range.from, to: hovered }
      : undefined;

  const cellButton = (label: string, value: string, placeholder: string) => (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      className="flex-1 min-w-0 px-5 py-3 lg:py-2.5 border-r border-line last:border-r-0 lg:last:border-r text-left cursor-pointer"
    >
      <div className={cellLabel}>
        <LbTakvimDuz size={14} />
        {label}
      </div>
      <div
        className={cn(
          "font-sans text-[16px] font-semibold mt-1 truncate",
          value ? "text-ink" : "text-muted/60"
        )}
      >
        {value ? formatLabel(value) : placeholder}
      </div>
    </button>
  );

  // Takvimin kendisi — masaüstünde popup, mobilde alt sayfa içinde aynı bileşen
  const calendar = (
    <DayPicker
      mode="range"
      locale={tr}
      numberOfMonths={isMobile ? 1 : 2}
      selected={range}
      onSelect={handleSelect}
      onDayMouseEnter={(day) => setHovered(day)}
      onDayMouseLeave={() => setHovered(undefined)}
      modifiers={previewRange ? { preview: previewRange } : undefined}
      modifiersClassNames={{ preview: "range-preview" }}
      disabled={{ before: today }}
      showOutsideDays={false}
    />
  );

  return (
    // relative + flex-[2]: takvim popup'ı Giriş/Çıkış alanlarının hemen altına
    // hizalanır. Mobilde iki hücre yan yana tek satır, popup yerine alt sayfa.
    <div
      ref={containerRef}
      className="relative flex w-full min-w-0 border-b border-line lg:w-auto lg:flex-[2] lg:border-b-0"
    >
      {cellButton("Giriş", checkIn, "Tarih seç")}
      {cellButton("Çıkış", checkOut, "Tarih seç")}

      {/* Masaüstü: alanın altına açılan popup */}
      {open && !isMobile && (
        <div className="hidden lg:block absolute left-0 top-[calc(100%+10px)] z-30 bg-white rounded-md border border-line shadow-[0_12px_28px_-10px_rgb(11_13_20/0.25)] p-3 lookbet-daypicker">
          {calendar}
        </div>
      )}

      {/* Mobil: alt sayfa — tek ay, büyük gün kutuları */}
      <MobileSheet
        open={open && isMobile}
        onClose={() => setOpen(false)}
        title="Tarih seçin"
        footer={
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="h-12 w-full rounded-md bg-gold text-[15px] font-bold text-ink active:bg-gold-dark"
          >
            {checkIn && checkOut ? "Tarihleri onayla" : "Kapat"}
          </button>
        }
      >
        <div className="lookbet-daypicker flex justify-center">{calendar}</div>
      </MobileSheet>
    </div>
  );
}
