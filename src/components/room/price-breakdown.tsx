"use client";

// Usage:
// <PriceBreakdown
//   originalPrice={200}
//   finalPrice={160}
//   discount={40}
//   appliedRules={["Erken rezervasyon indirimi", "Online fiyat"]}
//   currency="EUR"
// />

import * as React from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface PriceBreakdownProps {
  originalPrice: number;
  finalPrice: number;
  discount: number;
  appliedRules?: string[];
  currency: string;
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

export function PriceBreakdown({
  originalPrice,
  finalPrice,
  discount,
  appliedRules,
  currency,
  className,
}: PriceBreakdownProps) {
  const [showRules, setShowRules] = React.useState(false);
  const hasDiscount = discount > 0;
  const discountPct = hasDiscount
    ? Math.round((discount / originalPrice) * 100)
    : 0;

  return (
    // Kendi kartı ve başlığı yok: sayfa bölümü <Bolum> ile sarıyor, başlık
    // oradan geliyor. İki ayrı kabuk iç içe girmesin.
    <div className={cn("space-y-2.5", className)} aria-label="Fiyat detayı">
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-muted">Liste fiyatı</span>
        <span
          className={cn(
            "text-[14px] font-semibold",
            hasDiscount ? "text-muted line-through" : "text-ink",
          )}
        >
          {formatPrice(originalPrice, currency)}
        </span>
      </div>

      {hasDiscount && (
        <div className="flex items-center justify-between">
          <span className="text-[13px] text-emerald-700">
            İndirim (%{discountPct})
          </span>
          <span className="text-[14px] font-semibold text-emerald-700">
            -{formatPrice(discount, currency)}
          </span>
        </div>
      )}

      {appliedRules && appliedRules.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowRules((v) => !v)}
            aria-expanded={showRules}
            className="flex min-h-11 items-center gap-1 text-[13px] font-semibold text-navy focus:underline focus:outline-none"
          >
            {appliedRules.length} indirim kuralı uygulandı
            {showRules ? (
              <ChevronUp className="size-3.5" aria-hidden="true" />
            ) : (
              <ChevronDown className="size-3.5" aria-hidden="true" />
            )}
          </button>

          {showRules && (
            <ul className="space-y-1 pb-1">
              {appliedRules.map((rule, i) => (
                <li key={i} className="text-[13px] text-muted">
                  {rule}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="flex items-center justify-between pt-1">
        <span className="text-[14px] font-semibold text-ink">Toplam</span>
        <div className="text-right">
          <p className="text-[17px] leading-none font-extrabold text-ink">
            {formatPrice(finalPrice, currency)}
          </p>
          {hasDiscount && (
            <p className="mt-1 text-[13px] text-emerald-700">
              {formatPrice(discount, currency)} tasarruf ettin
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
