"use client";

// Otel sonuç kartı — iki düzen, tek kırılım (lg = 1024px):
//
//  • lg altı (mobil + tablet, WebView'in çalıştığı yer): Booking'in kompakt
//    yatay kartı. Solda kare görsel, sağda ad/konum/puan ve altta fiyat.
//    ~170px — ekranda 2 yerine 4 otel görünür, kaydırma yükü düşer.
//  • lg üstü: geniş yatay kart, sağda kesikli çizgiyle ayrılmış fiyat kolonu
//    ve "Müsaitliği gör" butonu.
//
// Fiyat iki yerde render ediliyor (mobil için içerik kolonunun altında,
// masaüstü için sağ kolonda) — ikisi çok farklı yerlerde durduğu için tek
// düğümü CSS ile taşımak yerine FiyatBlogu'nu iki kez basmak daha okunur.
// Görünmeyen kopya display:none olduğundan ekran okuyucu tek kez okur.

import * as React from "react";
import Link from "next/link";
import { LbKonum } from "@/components/ui/icons";
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
        "group overflow-hidden rounded-md border border-[rgb(26_24_20/0.08)] bg-white transition-shadow duration-200 hover:shadow-[0_14px_36px_rgba(28,42,36,0.14)]",
        className
      )}
    >
      <Link href={href} className="flex" aria-label={hotelName}>
        {/* Fotoğraf — mobilde 112px kare, masaüstünde geniş kolon */}
        <div className="relative w-28 shrink-0 self-stretch overflow-hidden bg-chip lg:min-h-[190px] lg:w-[220px]">
          {thumbnailImage ? (
            <img
              src={thumbnailImage}
              alt={`${hotelName} görseli`}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(150deg,#3D85EE,#0B63E5 60%,#0A1F44)",
              }}
            />
          )}
        </div>

        {/* İçerik */}
        <div className="flex min-w-0 flex-1 flex-col gap-1 px-3 py-3 lg:gap-2 lg:px-6 lg:py-5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <h2 className="font-serif text-[15px] leading-tight text-ink transition-colors group-hover:text-navy lg:text-xl">
              {hotelName}
            </h2>
            <span
              className="text-[11px] tracking-[1px] text-gold lg:text-[13px]"
              aria-label={`${stars} yıldız`}
            >
              {"★".repeat(stars)}
            </span>
          </div>

          <div className="flex items-start gap-1 text-muted">
            <LbKonum className="mt-0.5 size-3 lg:size-3.5" />
            <p className="line-clamp-1 text-[12px] leading-snug lg:line-clamp-2 lg:text-[13.5px]">
              {address}
            </p>
          </div>

          {typeof reviewScore === "number" && (
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
              <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-md rounded-bl-none bg-navy px-1.5 text-[12px] font-bold text-paper lg:h-7 lg:min-w-7 lg:text-[13px]">
                {reviewScore.toFixed(1)}
              </span>
              <span className="text-[12px] font-semibold text-ink lg:text-[13px]">
                {reviewLabel}
              </span>
              {typeof reviewCount === "number" && (
                <span className="text-[11px] text-muted lg:text-xs">
                  · {reviewCount.toLocaleString("tr-TR")} değerlendirme
                </span>
              )}
            </div>
          )}

          {/* Pansiyon etiketleri — kompakt kartta yer yok, masaüstünde kalıyor */}
          {boardTypes && boardTypes.length > 0 && (
            <div className="mt-0.5 hidden flex-wrap gap-2 lg:flex">
              {boardTypes.slice(0, 4).map((bt) => (
                <span
                  key={bt}
                  className="rounded-sm bg-chip px-[11px] py-1 text-xs font-semibold text-slate-text"
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

          {/* Mobil: güven satırı + fiyat yan yana, kartın dibinde */}
          <div className="mt-auto flex items-end justify-between gap-2 pt-1 lg:hidden">
            <span className="text-[11px] font-semibold leading-tight text-navy">
              Ücretsiz iptal
            </span>
            <FiyatBlogu fiyat={formattedPrice} />
          </div>

          <div className="mt-auto hidden pt-1 text-[13px] font-semibold text-navy lg:block">
            Ücretsiz iptal · Girişte ödeme
          </div>
        </div>

        {/* Fiyat kolonu — yalnızca masaüstü */}
        <div className="hidden w-[190px] shrink-0 flex-col items-end justify-end gap-1 border-l border-line px-6 py-5 lg:flex">
          <FiyatBlogu fiyat={formattedPrice} masaustu />
          <span className="mt-2 inline-flex items-center justify-center rounded-md bg-navy px-5 py-2.5 text-[13.5px] font-semibold text-paper transition-colors group-hover:bg-navy-dark">
            Müsaitliği gör
          </span>
        </div>
      </Link>
    </article>
  );
}

function FiyatBlogu({
  fiyat,
  masaustu = false,
}: {
  fiyat: string;
  masaustu?: boolean;
}) {
  return (
    <div className="min-w-0 text-right">
      <div
        className={cn(
          "font-bold text-ink",
          masaustu ? "text-[22px]" : "text-[17px] leading-none"
        )}
      >
        {fiyat}
      </div>
      <div
        className={cn(
          "text-muted",
          masaustu ? "text-xs" : "text-[10px] leading-tight"
        )}
      >
        gecelik, vergiler dahil
      </div>
    </div>
  );
}
