"use client";

// Booking tarzı tam ekran arama akışı — lg altında arama kutusuna
// dokunulduğunda açılır.
//
// Neden ayrı bir katman: sayfa içinde açılan form, klavye açılınca hero'yu
// yukarı itiyor ve kullanıcı nerede olduğunu kaybediyordu. Tam ekran katman
// tek işe odaklanıyor — Booking, Skyscanner ve Airbnb'nin mobilde yaptığı da
// bu.
//
// Alanların kendi seçicileri zaten MobileSheet kullanıyor (takvim, misafir);
// bu bileşen onları sarmalayan kabuk. Portal ile body'ye basılıyor ki
// sayfadaki overflow/stacking kuralları katmanı kırpmasın.

import * as React from "react";
import { createPortal } from "react-dom";
import { ArrowLeft } from "lucide-react";
import { POPULAR_DESTINATIONS } from "@/lib/constants/destinations";
import { SearchForm, type SearchFormValues } from "./search-form";

export interface SearchOverlayProps {
  open: boolean;
  onClose: () => void;
  initialValues?: Partial<SearchFormValues>;
  onSearch: (values: SearchFormValues) => void;
  loading?: boolean;
}

export function SearchOverlay({
  open,
  onClose,
  initialValues,
  onSearch,
  loading,
}: SearchOverlayProps) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  // Katman açıkken arka plan kaymasın (iOS WebView'de kaydırma sızıntısı olur)
  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Escape / Android geri tuşu köprüsü
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Otel ara"
      className="fixed inset-0 z-[90] flex flex-col bg-paper"
    >
      <header className="flex shrink-0 items-center gap-1 border-b border-line px-2 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={onClose}
          aria-label="Geri"
          className="flex size-11 items-center justify-center rounded-md text-ink active:bg-chip"
        >
          <ArrowLeft className="size-5" />
        </button>
        <h2 className="text-[16px] font-extrabold tracking-[-0.01em] text-ink">
          Nereye gidiyorsun?
        </h2>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <SearchForm
          initialValues={initialValues}
          onSearch={(v) => {
            onClose();
            onSearch(v);
          }}
          loading={loading}
          suggestions={POPULAR_DESTINATIONS}
          autoFocusDestination
        />
      </div>
    </div>,
    document.body
  );
}
