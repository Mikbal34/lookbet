"use client";

// Oda sonuç kartı. Görsel + oda adına ya da "Oda detayları" bağlantısına
// tıklayınca Booking tarzı detay modalı açılır.

import * as React from "react";
import {
  LbBuyut,
  LbEtiket,
  LbGorselYok,
  LbKalkanOnay,
  LbKalkanUyari,
  LbOnay,
  LbPansiyon,
  LbYatak,
} from "@/components/ui/icons";
import { cn } from "@/lib/utils/cn";
import type { RoomResult, CancellationPolicy, RoomAttributeItem } from "@/lib/royal-api/types";
import { RoomDetailModal } from "./room-detail-modal";

export interface RoomCardProps {
  room: RoomResult;
  calculatedPrice: number;
  originalPrice: number;
  currency: string;
  onSelect?: (priceCode: string) => void;
  isSelected?: boolean;
  className?: string;
}

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function CancellationSummary({ policies }: { policies: CancellationPolicy[] }) {
  if (!policies || policies.length === 0) {
    return (
      <div className="flex items-center gap-1.5 text-green-600">
        <LbKalkanOnay size={16} />
        <span className="text-xs font-medium">Ücretsiz iptal</span>
      </div>
    );
  }

  const now = new Date();
  const firstPenalty = policies.find((p) => p.penalty > 0 && new Date(p.fromDate) > now);

  if (!firstPenalty) {
    return (
      <div className="flex items-center gap-1.5 text-red-500">
        <LbKalkanUyari size={16} />
        <span className="text-xs font-medium">İade edilemez</span>
      </div>
    );
  }

  const fromDate = new Date(firstPenalty.fromDate).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
  });

  return (
    <div className="flex items-center gap-1.5 text-emerald-700">
      <LbKalkanOnay size={16} />
      <span className="text-xs font-medium">{fromDate} tarihine kadar ücretsiz iptal</span>
    </div>
  );
}

function AttributeList({ attributes }: { attributes: RoomAttributeItem[] }) {
  if (!attributes || attributes.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1">
      {attributes.slice(0, 5).map((attr) => (
        <li key={attr.id} className="flex items-center gap-1 text-xs text-muted">
          <LbOnay size={12} className="text-navy" />
          {attr.name}
        </li>
      ))}
    </ul>
  );
}

export function RoomCard({
  room,
  calculatedPrice,
  originalPrice,
  currency,
  onSelect,
  isSelected = false,
  className,
}: RoomCardProps) {
  const [showModal, setShowModal] = React.useState(false);

  const hasDiscount = originalPrice > calculatedPrice;
  const discountPct = hasDiscount
    ? Math.round(((originalPrice - calculatedPrice) / originalPrice) * 100)
    : 0;

  const nights =
    room.nightlyPrice > 0 ? Math.round(room.totalPrice / room.nightlyPrice) : 0;
  const perNight = nights > 0 ? calculatedPrice / nights : 0;

  const thumbnail = room.images?.[0];

  return (
    <>
      <article
        className={cn(
          "overflow-hidden rounded-2xl bg-paper transition-all duration-200",
          isSelected
            ? "border-navy ring-2 ring-blue-100 shadow-md"
            : "shadow-[0_1px_2px_rgb(11_13_20/0.04),0_6px_16px_-12px_rgb(11_13_20/0.18)] hover:shadow-[0_10px_26px_-12px_rgb(11_13_20/0.28)]",
          className
        )}
        aria-label={room.roomName}
      >
        <div className="flex flex-col md:flex-row">
          {/* Oda görseli — tıklanınca modal */}
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="group relative md:w-52 shrink-0 h-40 md:h-auto bg-chip"
            aria-label={`${room.roomName} detaylarını gör`}
          >
            {thumbnail ? (
              <>
                <img
                  src={thumbnail}
                  alt={room.roomName}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
                <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-black/55 px-2 py-1 text-[11px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                  <LbBuyut size={12} />
                  {room.images?.length ?? 0} foto
                </span>
              </>
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <LbGorselYok size={30} className="text-line-strong" />
              </div>
            )}
          </button>

          <div className="flex-1 p-4 md:p-5 flex flex-col gap-4">
            {/* Oda adı + pansiyon */}
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-start gap-2 min-w-0">
                <LbYatak size={20} className="mt-0.5 text-navy" />
                <div>
                  <button
                    type="button"
                    onClick={() => setShowModal(true)}
                    className="-my-2 py-2 text-left text-sm font-semibold text-ink leading-snug hover:text-navy hover:underline"
                  >
                    {room.roomName}
                  </button>
                  {room.allotment > 0 && room.allotment <= 5 && (
                    <p className="mt-0.5 text-xs font-semibold text-red-700">
                      Son {room.allotment} oda
                    </p>
                  )}
                </div>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-chip-blue text-navy-dark text-xs font-semibold border border-line shrink-0">
                <LbPansiyon size={12} />
                {room.boardTypeName || room.boardType}
              </span>
            </div>

            {/* Özellikler */}
            <AttributeList attributes={room.attributes} />

            {/* İptal */}
            <CancellationSummary policies={room.cancellationPolicies} />

            {/* Detay bağlantısı */}
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="inline-flex min-h-11 items-center self-start text-xs font-semibold text-navy hover:underline"
            >
              Oda detaylarını gör
            </button>

            {/* Fiyat + Seç */}
            <div className="flex items-end justify-between gap-4 pt-2 border-t border-line/60 mt-auto">
              <div>
                {hasDiscount && (
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm text-muted line-through">
                      {formatPrice(originalPrice, currency)}
                    </span>
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-red-50 text-red-600 text-xs font-semibold">
                      <LbEtiket size={12} />
                      -{discountPct}%
                    </span>
                  </div>
                )}
                <p className="text-2xl font-bold text-ink">
                  {formatPrice(calculatedPrice, currency)}
                </p>
                <p className="text-xs text-muted mt-0.5">
                  {nights > 0
                    ? `${nights} gece toplam · gecelik ${formatPrice(perNight, currency)}`
                    : "toplam fiyat"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => onSelect?.(room.priceCode)}
                aria-pressed={isSelected}
                className={cn(
                  "shrink-0 h-11 px-5 rounded-lg text-sm font-semibold transition-all duration-150",
                  "focus:outline-none focus:ring-2 focus:ring-offset-2",
                  // Sarı = seni bir adım ilerleten düğme. Arama ekranındaki
                  // "Otel Ara" ile aynı iş; aynı renk olmalı.
                  isSelected
                    ? "bg-gold-dark text-ink focus:ring-gold-dark"
                    : "bg-gold text-ink hover:bg-gold-dark active:bg-gold-dark focus:ring-gold-dark"
                )}
              >
                {isSelected ? "Seçildi" : "Seç"}
              </button>
            </div>
          </div>
        </div>
      </article>

      {showModal && (
        <RoomDetailModal
          room={room}
          calculatedPrice={calculatedPrice}
          originalPrice={originalPrice}
          currency={currency}
          onSelect={() => onSelect?.(room.priceCode)}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
