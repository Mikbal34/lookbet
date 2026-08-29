"use client";

// Durum rozeti — Pegasus'un "✓ Biletlendi" rozetinin karşılığı.
//
// Eskiden çerçeveli, noktalı ve sarı/kırmızı doygun bir etiketti; kartın en
// çok bakılan yerinde en gürültülü öğe oydu. Şimdi çerçevesiz, yumuşak zeminli
// ve durumu nokta yerine ikon anlatıyor — renk körlüğünde tek ayırt edici
// işaret renk olmasın diye de gerekli.
//
// STATUS_TINT aynı renk ailesinin çok açık tonu; rezervasyon kartı bunu üst
// bloğun arkasına gradyan olarak seriyor (Pegasus'un kart başındaki yeşilliği).
// Rozet ile bant tek kaynaktan gelsin diye burada duruyor.

import { CheckCircle2, Clock3, XCircle, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type ReservationStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "FAILED";

interface StatusConfig {
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  className: string;
  /** Kart başındaki gradyanın başlangıç rengi. */
  tint: string;
}

const STATUS_CONFIG: Record<ReservationStatus, StatusConfig> = {
  PENDING: {
    label: "Beklemede",
    Icon: Clock3,
    className: "bg-amber-50 text-amber-700",
    tint: "from-amber-100/80",
  },
  CONFIRMED: {
    label: "Onaylandı",
    Icon: CheckCircle2,
    className: "bg-emerald-50 text-emerald-700",
    tint: "from-emerald-100/80",
  },
  CANCELLED: {
    label: "İptal edildi",
    Icon: XCircle,
    className: "bg-rose-50 text-rose-700",
    tint: "from-rose-100/70",
  },
  FAILED: {
    label: "Tamamlanamadı",
    Icon: AlertTriangle,
    className: "bg-gray-100 text-gray-600",
    tint: "from-gray-200/70",
  },
};

function config(status: string): StatusConfig {
  return STATUS_CONFIG[status as ReservationStatus] ?? STATUS_CONFIG.FAILED;
}

/** Durumun kart başına serilecek açık tonu — bkz. ReservationCard. */
export function statusTint(status: string): string {
  return config(status).tint;
}

export interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const { label, Icon, className: renk } = config(status);

  return (
    <span
      role="status"
      aria-label={label}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[12px] leading-none font-semibold",
        renk,
        className
      )}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      {label}
    </span>
  );
}
