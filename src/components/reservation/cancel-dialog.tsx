"use client";

// Usage:
// const [open, setOpen] = useState(false);
// <CancelDialog
//   isOpen={open}
//   onClose={() => setOpen(false)}
//   onConfirm={async () => { await cancelReservation(id); setOpen(false); }}
//   bookingNumber="BK-20260219-ABC123"
// />

import * as React from "react";
import { AlertTriangle, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { createPortal } from "react-dom";

export interface CancelDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  bookingNumber?: string;
}

export function CancelDialog({
  isOpen,
  onClose,
  onConfirm,
  bookingNumber,
}: CancelDialogProps) {
  const [loading, setLoading] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Reset loading state when dialog closes
  React.useEffect(() => {
    if (!isOpen) setLoading(false);
  }, [isOpen]);

  // Lock scroll
  React.useEffect(() => {
    if (!mounted) return;
    if (isOpen) {
      const y = window.scrollY;
      document.body.style.overflow = "hidden";
      document.body.style.top = `-${y}px`;
      return () => {
        document.body.style.overflow = "";
        document.body.style.top = "";
        window.scrollTo(0, y);
      };
    }
  }, [isOpen, mounted]);

  // Escape key
  React.useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, loading, onClose]);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-dialog-title"
      aria-describedby="cancel-dialog-desc"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={loading ? undefined : onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          aria-label="Kapat"
          className={cn(
            "absolute right-4 top-4 p-1.5 rounded-lg text-gray-400",
            "hover:text-gray-600 hover:bg-gray-100 transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-blue-500",
            "disabled:pointer-events-none"
          )}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>

        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-red-100 rounded-xl shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-600" aria-hidden="true" />
            </div>
            <h2
              id="cancel-dialog-title"
              className="text-lg font-semibold text-gray-900"
            >
              Rezervasyon Iptali
            </h2>
          </div>

          <p id="cancel-dialog-desc" className="text-sm text-gray-600 leading-relaxed">
            {bookingNumber ? (
              <>
                <span className="font-mono font-semibold text-gray-800">
                  #{bookingNumber}
                </span>{" "}
                numarali rezervasyonunuzu iptal etmek istediginizden emin misiniz?
              </>
            ) : (
              "Bu rezervasyonu iptal etmek istediginizden emin misiniz?"
            )}
          </p>

          <div className="mt-3 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2.5">
            <p className="text-xs text-amber-700 leading-relaxed">
              Iptal politikasina bagli olarak ucret alinabilir. Bu islem geri alinamaz.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className={cn(
              "h-9 px-4 rounded-lg text-sm font-medium text-gray-700 bg-gray-100",
              "hover:bg-gray-200 transition-colors duration-150",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
              "disabled:opacity-50 disabled:pointer-events-none"
            )}
          >
            Vazgec
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            aria-busy={loading}
            className={cn(
              "h-9 px-5 rounded-lg text-sm font-semibold text-white bg-red-600",
              "hover:bg-red-700 active:bg-red-800 transition-colors duration-150",
              "focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2",
              "disabled:opacity-50 disabled:pointer-events-none",
              "flex items-center gap-2"
            )}
          >
            {loading && (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            )}
            {loading ? "Iptal ediliyor..." : "Iptal Et"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
