"use client";

// Otel sonuç kartı — lookbet. tasarım dili: yatay kart, serif otel adı,
// altın yıldızlar, sağda kesikli çizgiyle ayrılmış fiyat kolonu ve lacivert
// "Müsaitliği gör" butonu.

import * as React from "react";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { HotelSearchResult } from "@/lib/royal-api/types";

export interface HotelCardProps {
  hotel: HotelSearchResult;
  searchParams?: string;
  className?: string;
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
    reviewScore,
    reviewCount,
    reviewLabel,
  } = hotel;

  const href = `/hotel/${hotelCode}${searchParams ? `?${searchParams}` : ""}`;

  const formattedPrice = new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: currency || "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(minPrice);

  return (
    <article
      className={cn(
        "group bg-white rounded-md border border-[rgb(26_24_20/0.08)] hover:shadow-[0_14px_36px_rgba(28,42,36,0.14)] transition-shadow duration-200 overflow-hidden",
        className
      )}
    >
      <Link
        href={href}
        className="flex flex-col sm:flex-row"
        aria-label={hotelName}
      >
        {/* Fotoğraf */}
        <div className="relative sm:w-[220px] min-h-[190px] h-48 sm:h-auto shrink-0 bg-chip overflow-hidden">
          {thumbnailImage ? (
            <img
              src={thumbnailImage}
              alt={`${hotelName} görseli`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div
              className="w-full h-full"
              style={{
                background:
                  "linear-gradient(150deg,#ED7B45,#E06028 60%,#8F3A12)",
              }}
            />
          )}
        </div>

        {/* İçerik */}
        <div className="flex flex-col flex-1 min-w-0 px-6 py-5 gap-2">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="font-serif text-xl text-ink group-hover:text-navy transition-colors">
              {hotelName}
            </h2>
            <span
              className="text-gold text-[13px] tracking-[1px]"
              aria-label={`${stars} yıldız`}
            >
              {"★".repeat(stars)}
            </span>
          </div>

          <div className="flex items-start gap-1 text-muted">
            <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" aria-hidden="true" />
            <p className="text-[13.5px] leading-snug line-clamp-2">{address}</p>
          </div>

          {typeof reviewScore === "number" && (
            <div className="flex items-center gap-2">
              <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-md rounded-bl-none bg-navy px-1.5 text-[13px] font-bold text-paper">
                {reviewScore.toFixed(1)}
              </span>
              <span className="text-[13px] font-semibold text-ink">{reviewLabel}</span>
              {typeof reviewCount === "number" && (
                <span className="text-xs text-muted">
                  · {reviewCount.toLocaleString("tr-TR")} değerlendirme
                </span>
              )}
            </div>
          )}

          {boardTypes && boardTypes.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-0.5">
              {boardTypes.slice(0, 4).map((bt) => (
                <span
                  key={bt}
                  className="bg-chip rounded-sm px-[11px] py-1 text-xs font-semibold text-slate-text"
                >
                  {bt}
                </span>
              ))}
              {boardTypes.length > 4 && (
                <span className="text-xs text-muted">
                  +{boardTypes.length - 4}
                </span>
              )}
            </div>
          )}

          <div className="text-[13px] text-navy font-semibold mt-auto pt-1">
            Ücretsiz iptal · Girişte ödeme
          </div>
        </div>

        {/* Fiyat kolonu */}
        <div className="px-6 py-5 flex sm:flex-col items-end justify-between sm:justify-end gap-1 border-t sm:border-t-0 sm:border-l border-dashed border-line sm:w-[190px] shrink-0">
          <div className="text-right">
            <div className="text-[22px] font-bold text-ink">{formattedPrice}</div>
            <div className="text-xs text-muted">gecelik, vergiler dahil</div>
          </div>
          <span className="bg-navy text-paper rounded-md px-5 py-2.5 text-[13.5px] font-semibold group-hover:bg-navy-dark transition-colors sm:mt-2">
            Müsaitliği gör
          </span>
        </div>
      </Link>
    </article>
  );
}
