"use client";

// Usage:
// <StatusBadge status="CONFIRMED" />
// <StatusBadge status="PENDING" />

import { cn } from "@/lib/utils/cn";

type ReservationStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "FAILED";

interface StatusConfig {
  label: string;
  dotColor: string;
  className: string;
}

const STATUS_CONFIG: Record<ReservationStatus, StatusConfig> = {
  PENDING: {
    label: "Beklemede",
    dotColor: "bg-yellow-400",
    className: "bg-yellow-50 text-yellow-700 border border-yellow-200",
  },
  CONFIRMED: {
    label: "Onaylandi",
    dotColor: "bg-green-400",
    className: "bg-green-50 text-green-700 border border-green-200",
  },
  CANCELLED: {
    label: "Iptal Edildi",
    dotColor: "bg-red-400",
    className: "bg-red-50 text-red-700 border border-red-200",
  },
  FAILED: {
    label: "Basarisiz",
    dotColor: "bg-gray-400",
    className: "bg-gray-100 text-gray-600 border border-gray-200",
  },
};

export interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config =
    STATUS_CONFIG[status as ReservationStatus] ?? STATUS_CONFIG.FAILED;

  return (
    <span
      role="status"
      aria-label={config.label}
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium",
        config.className,
        className
      )}
    >
      <span
        className={cn("h-1.5 w-1.5 rounded-full shrink-0", config.dotColor)}
        aria-hidden="true"
      />
      {config.label}
    </span>
  );
}
