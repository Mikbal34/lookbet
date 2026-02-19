"use client";

// Usage:
// <RoomCard
//   room={roomResult}
//   calculatedPrice={180}
//   originalPrice={220}
//   currency="EUR"
//   onSelect={(priceCode) => handleSelect(priceCode)}
// />

import * as React from "react";
import {
  BedDouble,
  UtensilsCrossed,
  ShieldCheck,
  ShieldAlert,
  Tag,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { RoomResult, CancellationPolicy, RoomAttributeItem } from "@/lib/royal-api/types";

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
        <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="text-xs font-medium">Ücretsiz iptal</span>
      </div>
    );
  }

  const now = new Date();
  const firstPenalty = policies.find((p) => p.penalty > 0 && new Date(p.fromDate) > now);

  if (!firstPenalty) {
    return (
      <div className="flex items-center gap-1.5 text-red-500">
        <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="text-xs font-medium">İade edilemez</span>
      </div>
    );
  }

  const fromDate = new Date(firstPenalty.fromDate).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
  });

  return (
    <div className="flex items-center gap-1.5 text-amber-600">
      <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="text-xs font-medium">{fromDate} tarihine kadar ücretsiz iptal</span>
    </div>
  );
}

function AttributeList({ attributes }: { attributes: RoomAttributeItem[] }) {
  if (!attributes || attributes.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1">
      {attributes.slice(0, 5).map((attr) => (
        <li key={attr.id} className="flex items-center gap-1 text-xs text-gray-500">
          <CheckCircle2 className="h-3 w-3 text-blue-400 shrink-0" aria-hidden="true" />
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
  const hasDiscount = originalPrice > calculatedPrice;
  const discountPct = hasDiscount
    ? Math.round(((originalPrice - calculatedPrice) / originalPrice) * 100)
    : 0;

  return (
    <article
      className={cn(
        "bg-white rounded-2xl border transition-all duration-200",
        isSelected
          ? "border-blue-500 ring-2 ring-blue-100 shadow-md"
          : "border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200",
        className
      )}
      aria-label={room.roomName}
    >
      <div className="p-4 md:p-5 flex flex-col gap-4">
        {/* Room name + board type */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-2 min-w-0">
            <BedDouble
              className="h-5 w-5 text-blue-500 shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <div>
              <h3 className="text-sm font-semibold text-gray-900 leading-snug">
                {room.roomName}
              </h3>
              {room.allotment > 0 && room.allotment <= 5 && (
                <p className="text-xs text-amber-600 font-medium mt-0.5">
                  Son {room.allotment} oda
                </p>
              )}
            </div>
          </div>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-100 shrink-0">
            <UtensilsCrossed className="h-3 w-3" aria-hidden="true" />
            {room.boardTypeName || room.boardType}
          </span>
        </div>

        {/* Attributes */}
        <AttributeList attributes={room.attributes} />

        {/* Cancellation */}
        <CancellationSummary policies={room.cancellationPolicies} />

        {/* Price + Select */}
        <div className="flex items-end justify-between gap-4 pt-2 border-t border-gray-50">
          <div>
            {hasDiscount && (
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm text-gray-400 line-through">
                  {formatPrice(originalPrice, currency)}
                </span>
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-red-50 text-red-600 text-xs font-semibold">
                  <Tag className="h-3 w-3" aria-hidden="true" />
                  -{discountPct}%
                </span>
              </div>
            )}
            <p className="text-2xl font-bold text-gray-900">
              {formatPrice(calculatedPrice, currency)}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">toplam fiyat</p>
          </div>

          <button
            type="button"
            onClick={() => onSelect?.(room.priceCode)}
            aria-pressed={isSelected}
            className={cn(
              "shrink-0 h-10 px-5 rounded-xl text-sm font-semibold transition-all duration-150",
              "focus:outline-none focus:ring-2 focus:ring-offset-2",
              isSelected
                ? "bg-blue-600 text-white focus:ring-blue-500"
                : "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 focus:ring-blue-500"
            )}
          >
            {isSelected ? "Seçildi" : "Seç"}
          </button>
        </div>
      </div>
    </article>
  );
}
