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
import { Tag, ChevronDown, ChevronUp, CheckCircle2 } from "lucide-react";
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
    <div
      className={cn(
        "rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden",
        className
      )}
      aria-label="Fiyat detayı"
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-50">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Tag className="h-4 w-4 text-blue-500" aria-hidden="true" />
          Fiyat Detayı
        </h3>
      </div>

      <div className="px-5 py-4 space-y-3">
        {/* Original price */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Liste fiyatı</span>
          <span
            className={cn(
              "font-medium",
              hasDiscount ? "text-gray-400 line-through" : "text-gray-900"
            )}
          >
            {formatPrice(originalPrice, currency)}
          </span>
        </div>

        {/* Discount */}
        {hasDiscount && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-green-600 font-medium flex items-center gap-1">
              <Tag className="h-3.5 w-3.5" aria-hidden="true" />
              İndirim ({discountPct}%)
            </span>
            <span className="text-green-600 font-semibold">
              -{formatPrice(discount, currency)}
            </span>
          </div>
        )}

        {/* Applied rules toggle */}
        {appliedRules && appliedRules.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setShowRules((v) => !v)}
              aria-expanded={showRules}
              className={cn(
                "flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 transition-colors",
                "focus:outline-none focus:underline"
              )}
            >
              {showRules ? (
                <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {appliedRules.length} indirim kuralı uygulandı
            </button>

            {showRules && (
              <ul className="mt-2 space-y-1.5 pl-1">
                {appliedRules.map((rule, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-gray-600">
                    <CheckCircle2
                      className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0"
                      aria-hidden="true"
                    />
                    {rule}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Separator */}
        <div className="border-t border-dashed border-gray-200 pt-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-900">Toplam</span>
            <div className="text-right">
              <p className="text-xl font-bold text-blue-600">
                {formatPrice(finalPrice, currency)}
              </p>
              {hasDiscount && (
                <p className="text-xs text-green-600 font-medium">
                  {formatPrice(discount, currency)} tasarruf ettiniz
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
