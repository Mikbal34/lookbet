"use client";

// Usage:
// <CountdownTimer
//   expiresAt="2026-02-19T15:30:00Z"
//   onExpire={() => router.push("/search")}
// />

import * as React from "react";
import { LbSaat, LbUyari } from "@/components/ui/icons";
import { cn } from "@/lib/utils/cn";

export interface CountdownTimerProps {
  /** ISO 8601 date string representing when the session expires */
  expiresAt: string;
  onExpire?: () => void;
  className?: string;
}

function getRemainingSeconds(expiresAt: string): number {
  const diff = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
  return Math.max(0, diff);
}

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function CountdownTimer({
  expiresAt,
  onExpire,
  className,
}: CountdownTimerProps) {
  const [remaining, setRemaining] = React.useState(() =>
    getRemainingSeconds(expiresAt)
  );
  const onExpireRef = React.useRef(onExpire);
  onExpireRef.current = onExpire;

  React.useEffect(() => {
    if (remaining <= 0) {
      onExpireRef.current?.();
      return;
    }

    const interval = setInterval(() => {
      const next = getRemainingSeconds(expiresAt);
      setRemaining(next);
      if (next <= 0) {
        clearInterval(interval);
        onExpireRef.current?.();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, remaining]);

  const isExpired = remaining <= 0;
  const isUrgent = remaining <= 300 && remaining > 0; // Under 5 minutes

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-lg px-4 py-2.5 border transition-colors duration-500",
        isExpired
          ? "bg-chip border-line text-muted"
          : isUrgent
          ? "bg-red-50 border-red-200 text-red-600 animate-pulse"
          : "bg-chip-blue border-line text-navy-dark",
        className
      )}
      role="timer"
      aria-label={
        isExpired
          ? "Oturum süresi doldu"
          : `Kalan sure: ${formatTime(remaining)}`
      }
      aria-live="polite"
    >
      {isUrgent || isExpired ? (
        <LbUyari
          size={16}
          className={isExpired ? "text-muted" : "text-red-600"}
        />
      ) : (
        <LbSaat size={16} className="text-navy" />
      )}

      <div>
        <p
          className={cn(
            "text-xs font-medium leading-none mb-0.5",
            isExpired
              ? "text-muted"
              : isUrgent
              ? "text-red-500"
              : "text-navy"
          )}
        >
          {isExpired ? "Süre doldu" : "Fiyat geçerlilik süresi"}
        </p>
        <p
          className={cn(
            "text-lg font-bold font-mono leading-none tabular-nums",
            isExpired
              ? "text-muted"
              : isUrgent
              ? "text-red-600"
              : "text-navy-dark"
          )}
        >
          {isExpired ? "00:00" : formatTime(remaining)}
        </p>
      </div>
    </div>
  );
}
