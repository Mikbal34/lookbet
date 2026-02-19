"use client";

// Usage:
// <ReservationCard reservation={reservationData} />

import * as React from "react";
import Link from "next/link";
import { CalendarDays, UtensilsCrossed, ChevronRight, Hash } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatCurrency, formatDate, getNightCount } from "@/lib/utils";
import { StatusBadge } from "./status-badge";

export interface ReservationItem {
  id: string;
  bookingNumber?: string | null;
  hotelName?: string | null;
  hotelCode: string;
  checkIn: string;
  checkOut: string;
  status: string;
  totalPrice: number;
  discountedPrice?: number | null;
  currency: string;
  boardType?: string | null;
  roomType?: string | null;
}

export interface ReservationCardProps {
  reservation: ReservationItem;
  className?: string;
}

export function ReservationCard({ reservation: r, className }: ReservationCardProps) {
  const nights = getNightCount(r.checkIn, r.checkOut);
  const hasDiscount = r.discountedPrice != null && r.discountedPrice < r.totalPrice;
  const displayPrice = hasDiscount ? (r.discountedPrice as number) : r.totalPrice;

  return (
    <article className={cn("group", className)}>
      <Link
        href={`/reservations/${r.id}`}
        className={cn(
          "flex flex-col sm:flex-row sm:items-center gap-4 bg-white rounded-2xl border border-gray-100 p-5",
          "hover:shadow-md hover:border-gray-200 transition-all duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        )}
        aria-label={`Rezervasyon ${r.bookingNumber ?? r.id} - ${r.hotelName ?? r.hotelCode}`}
      >
        {/* Left: hotel + details */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Hotel name + status */}
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <h3 className="font-semibold text-gray-900 text-base truncate group-hover:text-blue-600 transition-colors">
              {r.hotelName ?? r.hotelCode}
            </h3>
            <StatusBadge status={r.status} />
          </div>

          {/* Booking number */}
          {r.bookingNumber && (
            <p className="flex items-center gap-1 text-xs text-gray-400 font-mono">
              <Hash className="h-3 w-3" aria-hidden="true" />
              {r.bookingNumber}
            </p>
          )}

          {/* Dates + nights */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 text-gray-400" aria-hidden="true" />
              <span>
                {formatDate(r.checkIn)} &mdash; {formatDate(r.checkOut)}
              </span>
              <span className="text-gray-300">|</span>
              <span>{nights} gece</span>
            </div>

            {r.boardType && (
              <div className="flex items-center gap-1.5">
                <UtensilsCrossed className="h-3.5 w-3.5 text-gray-400" aria-hidden="true" />
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100"
                >
                  {r.boardType}
                </span>
              </div>
            )}

            {r.roomType && (
              <span className="text-xs text-gray-400">{r.roomType}</span>
            )}
          </div>
        </div>

        {/* Right: price + chevron */}
        <div className="flex items-center gap-4 sm:gap-6 shrink-0">
          <div className="text-right">
            {hasDiscount && (
              <p className="text-xs text-gray-400 line-through leading-none mb-0.5">
                {formatCurrency(r.totalPrice, r.currency)}
              </p>
            )}
            <p className="text-lg font-bold text-gray-900">
              {formatCurrency(displayPrice, r.currency)}
            </p>
          </div>
          <ChevronRight
            className="h-5 w-5 text-gray-300 group-hover:text-blue-400 transition-colors"
            aria-hidden="true"
          />
        </div>
      </Link>
    </article>
  );
}
