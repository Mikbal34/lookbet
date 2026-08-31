"use client";

// Booking tarzı oda detay modalı: solda oda fotoğraf galerisi, sağda
// oda özellikleri (kategorize), iptal koşulları, fiyat ve seç butonu.

import * as React from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  UtensilsCrossed,
  CheckCircle2,
  ShieldCheck,
  ImageOff,
  BedDouble,
  Tag,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { RoomResult, RoomAttributeItem } from "@/lib/royal-api/types";

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function GroupedAttributes({ attributes }: { attributes: RoomAttributeItem[] }) {
  const groups = React.useMemo(() => {
    const map = new Map<string, RoomAttributeItem[]>();
    for (const a of attributes ?? []) {
      const key = a.categoryName || "Diğer";
      const list = map.get(key) ?? [];
      list.push(a);
      map.set(key, list);
    }
    return map;
  }, [attributes]);

  if (groups.size === 0) return null;

  return (
    <div className="space-y-3">
      {Array.from(groups.entries()).map(([category, items]) => (
        <div key={category}>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
            {category}
          </p>
          <ul className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
            {items.map((a) => (
              <li key={a.id} className="flex items-center gap-1.5 text-sm text-gray-700">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-blue-400" aria-hidden="true" />
                {a.name}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export interface RoomDetailModalProps {
  room: RoomResult;
  calculatedPrice: number;
  originalPrice: number;
  currency: string;
  onSelect?: () => void;
  onClose: () => void;
}

export function RoomDetailModal({
  room,
  calculatedPrice,
  originalPrice,
  currency,
  onSelect,
  onClose,
}: RoomDetailModalProps) {
  const images = room.images ?? [];
  const [active, setActive] = React.useState(0);

  const prev = () => setActive((i) => (i === 0 ? images.length - 1 : i - 1));
  const next = () => setActive((i) => (i === images.length - 1 ? 0 : i + 1));

  React.useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    }
    window.addEventListener("keydown", handler);
    // sayfa scroll'unu kilitle
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const hasDiscount = originalPrice > calculatedPrice;
  const nights =
    room.nightlyPrice > 0 ? Math.round(room.totalPrice / room.nightlyPrice) : 0;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={room.roomName}
      onClick={onClose}
    >
      <div
        className="flex max-h-[92dvh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl animate-sheet-up sm:max-h-full sm:rounded-2xl sm:animate-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Başlık + kapat */}
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-3.5">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{room.roomName}</h2>
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-chip-blue px-2.5 py-0.5 text-xs font-semibold text-navy-dark">
              <UtensilsCrossed className="h-3 w-3" aria-hidden="true" />
              {room.boardTypeName || room.boardType}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="flex size-11 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 active:bg-gray-100 sm:size-9"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Gövde */}
        <div className="grid flex-1 grid-cols-1 gap-5 overflow-y-auto p-5 md:grid-cols-2">
          {/* Sol: galeri */}
          <div>
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-gray-100">
              {images.length > 0 ? (
                <img
                  key={images[active]}
                  src={images[active]}
                  alt={`${room.roomName} — ${active + 1}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <ImageOff className="h-10 w-10 text-gray-300" aria-hidden="true" />
                </div>
              )}
              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={prev}
                    aria-label="Önceki"
                    className="absolute left-2 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-gray-700 hover:bg-white sm:size-8"
                  >
                    <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={next}
                    aria-label="Sonraki"
                    className="absolute right-2 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-gray-700 hover:bg-white sm:size-8"
                  >
                    <ChevronRight className="h-5 w-5" aria-hidden="true" />
                  </button>
                  <span className="absolute right-2 top-2 rounded bg-black/50 px-1.5 py-0.5 text-xs text-white">
                    {active + 1} / {images.length}
                  </span>
                </>
              )}
            </div>

            {images.length > 1 && (
              <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
                {images.map((img, i) => (
                  <button
                    key={img}
                    type="button"
                    onClick={() => setActive(i)}
                    className={cn(
                      "h-12 w-16 shrink-0 overflow-hidden rounded-md border-2",
                      i === active ? "border-navy" : "border-transparent opacity-70 hover:opacity-100"
                    )}
                  >
                    <img src={img} alt={`Küçük görsel ${i + 1}`} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sağ: özellikler + iptal */}
          <div className="space-y-4">
            {room.allotment > 0 && room.allotment <= 5 && (
              <p className="text-sm font-semibold text-amber-600">
                Son {room.allotment} oda — hızlı davranın
              </p>
            )}

            <GroupedAttributes attributes={room.attributes} />

            {room.cancellationPolicies && room.cancellationPolicies.length > 0 && (
              <div className="rounded-lg bg-gray-50 p-3">
                <h4 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-gray-700">
                  <ShieldCheck className="h-4 w-4 text-navy" aria-hidden="true" />
                  İptal Koşulları
                </h4>
                <ul className="space-y-1 text-xs text-gray-600">
                  {room.cancellationPolicies.map((p, i) => (
                    <li key={i}>
                      <span className="font-medium">
                        {new Date(p.fromDate).toLocaleDateString("tr-TR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                      {": "}
                      {p.penalty > 0 ? (
                        <span className="text-red-600">
                          {formatPrice(p.penalty, p.penaltyCurrency || currency)} iptal ücreti
                        </span>
                      ) : (
                        <span className="text-green-600">ücretsiz iptal</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Alt bar: fiyat + seç */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-5 pt-3.5 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:pb-3.5">
          <div>
            {hasDiscount && (
              <span className="mr-2 text-sm text-gray-400 line-through">
                {formatPrice(originalPrice, currency)}
              </span>
            )}
            <span className="text-xl font-bold text-gray-900">
              {formatPrice(calculatedPrice, currency)}
            </span>
            <span className="ml-1 text-xs text-gray-400">
              {nights > 0 ? `${nights} gece toplam` : "toplam"}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              onSelect?.();
              onClose();
            }}
            className="flex min-h-12 flex-1 items-center justify-center gap-1.5 rounded-lg bg-gold px-6 text-sm font-bold text-ink hover:bg-gold-dark active:bg-gold-dark sm:min-h-0 sm:flex-none sm:py-2.5"
          >
            <BedDouble className="h-4 w-4" aria-hidden="true" />
            Bu odayı seç
          </button>
        </div>
      </div>
    </div>
  );
}
