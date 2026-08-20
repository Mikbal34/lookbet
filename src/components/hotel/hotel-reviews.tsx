"use client";

// Otel puan özeti + kategori skorları + misafir yorumları.
// Veriler zenginleştirme alanlarından (mock / ileride Google Places) gelir.

import * as React from "react";
import { Star, ThumbsUp, ThumbsDown, Quote } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { HotelReviewSummary, HotelReview } from "@/lib/royal-api/types";

function ScoreBadge({ score, size = "md" }: { score: number; size?: "sm" | "md" | "lg" }) {
  const cls =
    size === "lg"
      ? "h-12 w-12 text-xl"
      : size === "sm"
        ? "h-8 w-8 text-xs"
        : "h-10 w-10 text-base";
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-lg rounded-bl-none bg-navy font-bold text-white",
        cls
      )}
    >
      {score.toFixed(1)}
    </span>
  );
}

function CategoryBar({ name, score }: { name: string; score: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 text-sm text-gray-600">{name}</span>
      <div className="h-1.5 flex-1 rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-navy"
          style={{ width: `${Math.min(100, (score / 10) * 100)}%` }}
        />
      </div>
      <span className="w-8 shrink-0 text-right text-sm font-semibold text-gray-900">
        {score.toFixed(1)}
      </span>
    </div>
  );
}

function ReviewCard({ review }: { review: HotelReview }) {
  const initial = review.author.charAt(0).toUpperCase();
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-chip-blue text-sm font-semibold text-navy">
            {initial}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-900">
              {review.author}
              {review.country && (
                <span className="ml-1 text-xs font-normal text-gray-400">
                  · {review.country}
                </span>
              )}
            </p>
            <p className="text-xs text-gray-400">
              {review.travelerType}
              {review.roomType ? ` · ${review.roomType}` : ""}
            </p>
          </div>
        </div>
        <ScoreBadge score={review.score} size="sm" />
      </div>

      {review.positive && (
        <p className="mt-2 flex gap-1.5 text-sm text-gray-700">
          <ThumbsUp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-500" aria-hidden="true" />
          <span>{review.positive}</span>
        </p>
      )}
      {review.negative && (
        <p className="mt-1.5 flex gap-1.5 text-sm text-gray-500">
          <ThumbsDown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" aria-hidden="true" />
          <span>{review.negative}</span>
        </p>
      )}
    </div>
  );
}

export interface HotelReviewsProps {
  summary?: HotelReviewSummary;
  reviews?: HotelReview[];
  className?: string;
}

export function HotelReviews({ summary, reviews, className }: HotelReviewsProps) {
  const [showAll, setShowAll] = React.useState(false);

  if (!summary) return null;

  const visible = showAll ? reviews ?? [] : (reviews ?? []).slice(0, 4);

  return (
    <section aria-labelledby="reviews-heading" className={cn("space-y-5", className)}>
      <h2 id="reviews-heading" className="text-lg font-semibold text-gray-900">
        Konuk Değerlendirmeleri
      </h2>

      {/* Özet: puan + kategori skorları */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <ScoreBadge score={summary.score} size="lg" />
          <div>
            <p className="text-base font-bold text-gray-900">{summary.label}</p>
            <p className="text-sm text-gray-500">
              {summary.count.toLocaleString("tr-TR")} değerlendirme
            </p>
          </div>
        </div>

        {summary.highlight && (
          <blockquote className="mt-4 flex gap-2 rounded-lg bg-chip-blue/60 p-3 text-sm italic text-gray-700">
            <Quote className="h-4 w-4 shrink-0 text-navy" aria-hidden="true" />
            {summary.highlight}
          </blockquote>
        )}

        {summary.categories.length > 0 && (
          <div className="mt-5 grid grid-cols-1 gap-x-8 gap-y-2.5 sm:grid-cols-2">
            {summary.categories.map((c) => (
              <CategoryBar key={c.name} name={c.name} score={c.score} />
            ))}
          </div>
        )}
      </div>

      {/* Yorum kartları */}
      {visible.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {visible.map((r, i) => (
              <ReviewCard key={i} review={r} />
            ))}
          </div>
          {(reviews?.length ?? 0) > 4 && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-navy hover:bg-gray-50"
            >
              {showAll ? "Daha az göster" : `Tüm ${reviews?.length} değerlendirmeyi göster`}
            </button>
          )}
        </>
      )}
    </section>
  );
}

// Otel adı başlığında gösterilecek küçük puan rozeti (opsiyonel yardımcı).
export function InlineScore({ summary }: { summary?: HotelReviewSummary }) {
  if (!summary) return null;
  return (
    <span className="inline-flex items-center gap-2">
      <ScoreBadge score={summary.score} size="sm" />
      <span className="text-sm font-medium text-gray-600">
        {summary.label} · {summary.count.toLocaleString("tr-TR")} yorum
      </span>
      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
    </span>
  );
}
