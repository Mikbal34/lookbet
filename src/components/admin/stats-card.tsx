"use client";

// İstatistik kartı — lookbet. tasarım dili: uppercase mikro etiket,
// büyük değer, sağda yumuşak renkli ikon.

import { cn } from "@/lib/utils/cn";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  iconColor?: string;
}

export function StatsCard({
  title,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  iconColor = "text-navy bg-chip-blue",
}: StatsCardProps) {
  return (
    <div className="bg-white rounded-md p-[22px] border border-[rgb(26_24_20/0.08)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold tracking-[1.2px] uppercase text-muted">
            {title}
          </p>
          <p className="mt-2 text-[26px] font-bold text-ink">{value}</p>
          {change && (
            <p
              className={cn(
                "mt-1 text-[12.5px] font-semibold",
                changeType === "positive" && "text-green-600",
                changeType === "negative" && "text-red-600",
                changeType === "neutral" && "text-navy"
              )}
            >
              {change}
            </p>
          )}
        </div>
        <div className={cn("p-3 rounded-md shrink-0", iconColor)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
