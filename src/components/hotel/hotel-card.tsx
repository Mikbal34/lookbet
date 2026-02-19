"use client";

// Usage:
// <HotelCard hotel={hotelResult} searchParams="checkIn=2026-03-01&checkOut=2026-03-07&..." />

import * as React from "react";
import Link from "next/link";
import { MapPin, Star, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { HotelSearchResult } from "@/lib/royal-api/types";

export interface HotelCardProps {
  hotel: HotelSearchResult;
  /** Query string to append to the hotel detail link e.g. "checkIn=...&checkOut=..." */
  searchParams?: string;
  className?: string;
}

function StarRating({ stars }: { stars: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${stars} yıldız`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={cn(
            "h-3.5 w-3.5",
            i < stars ? "fill-amber-400 text-amber-400" : "fill-gray-200 text-gray-200"
          )}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

function BoardBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100">
      {label}
    </span>
  );
}

export function HotelCard({ hotel, searchParams, className }: HotelCardProps) {
  const {
    hotelCode,
    hotelName,
    stars,
    thumbnailImage,
    minPrice,
    currency,
    boardTypes,
    address,
  } = hotel;

  const href = `/hotels/${hotelCode}${searchParams ? `?${searchParams}` : ""}`;

  const formattedPrice = new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: currency || "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(minPrice);

  return (
    <article
      className={cn(
        "group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden",
        className
      )}
    >
      <Link href={href} className="flex flex-col sm:flex-row h-full" aria-label={hotelName}>
        {/* Thumbnail */}
        <div className="relative sm:w-52 h-48 sm:h-auto shrink-0 bg-gray-100 overflow-hidden">
          {thumbnailImage ? (
            <img
              src={thumbnailImage}
              alt={`${hotelName} görseli`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div
              className="w-full h-full flex flex-col items-center justify-center gap-2"
              style={{
                backgroundImage:
                  "url(https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=400&q=60&auto=format&fit=crop)",
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              <div className="absolute inset-0 bg-blue-900/40" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-col flex-1 p-4 gap-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                {hotelName}
              </h2>
              <StarRating stars={stars} />
            </div>
          </div>

          {/* Location */}
          <div className="flex items-start gap-1 text-gray-500">
            <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" aria-hidden="true" />
            <p className="text-xs leading-snug line-clamp-2">{address}</p>
          </div>

          {/* Board types */}
          {boardTypes && boardTypes.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-auto">
              {boardTypes.slice(0, 3).map((bt) => (
                <BoardBadge key={bt} label={bt} />
              ))}
              {boardTypes.length > 3 && (
                <span className="text-xs text-gray-400">+{boardTypes.length - 3}</span>
              )}
            </div>
          )}

          {/* Price */}
          <div className="flex items-end justify-between mt-auto pt-2 border-t border-gray-50">
            <div className="flex items-center gap-1 text-gray-500">
              <TrendingDown className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="text-xs">itibaren</span>
            </div>
            <div className="text-right">
              <p
                className="text-xl font-bold text-blue-600"
                aria-label={`${formattedPrice} itibaren`}
              >
                {formattedPrice}
              </p>
              <p className="text-xs text-gray-400">gecelik</p>
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
}
