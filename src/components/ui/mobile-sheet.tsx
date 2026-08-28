"use client";

// Mobil alt sayfa (bottom sheet) — WebView'de native "modal" hissi.
// Takvim, misafir seçici, filtre paneli ve panel menüsü bunu paylaşır.
// Portal ile body'ye basılır: ana sayfadaki overflow/stacking kuralları
// panelin kırpılmasına yol açmaz.

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface MobileSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** Altta sabit duran aksiyon alanı (ör. "Uygula" butonu) */
  footer?: React.ReactNode;
  className?: string;
}

export function MobileSheet({
  open,
  onClose,
  title,
  children,
  footer,
  className,
}: MobileSheetProps) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  // Panel açıkken arka plan kaymasın (iOS WebView'de kaydırma sızıntısı olur)
  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Escape ile kapat (harici klavye / Android geri tuşu köprüleri)
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
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true">
      <div
        className="absolute inset-0 bg-ink/45"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col",
          "rounded-t-2xl bg-white shadow-[0_-8px_32px_-8px_rgb(11_13_20/0.35)]",
          "animate-sheet-up",
          className
        )}
      >
        {/* Sürükleme tutamağı + başlık */}
        <div className="shrink-0 border-b border-line">
          <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-line-strong" />
          <div className="flex items-center justify-between px-4 py-3">
            <h2 className="text-[16px] font-extrabold tracking-[-0.01em] text-ink">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Kapat"
              className="-mr-2 flex size-10 items-center justify-center rounded-md text-muted active:bg-chip"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          {children}
        </div>

        {footer && (
          <div className="shrink-0 border-t border-line bg-white px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
