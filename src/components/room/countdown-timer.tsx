"use client";

// Usage:
// <CountdownTimer
//   expiresAt="2026-02-19T15:30:00Z"
//   onExpire={() => router.push("/search")}
// />

import * as React from "react";
import { Clock, AlertTriangle } from "lucide-react";
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
        "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 border transition-colors duration-500",
        isExpired
          ? "bg-gray-100 border-gray-200 text-gray-400"
          : isUrgent
          ? "bg-red-50 border-red-200 text-red-600 animate-pulse"
          : "bg-blue-50 border-blue-200 text-blue-700",
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
        <AlertTriangle
          className={cn(
            "h-4 w-4 shrink-0",
            isExpired ? "text-gray-400" : "text-red-500"
          )}
          aria-hidden="true"
        />
      ) : (
        <Clock className="h-4 w-4 shrink-0 text-blue-500" aria-hidden="true" />
      )}

      <div>
        <p
          className={cn(
            "text-xs font-medium leading-none mb-0.5",
            isExpired
              ? "text-gray-400"
              : isUrgent
              ? "text-red-500"
              : "text-blue-600"
          )}
        >
          {isExpired ? "Sure doldu" : "Fiyat gecerlilik suresi"}
        </p>
        <p
          className={cn(
            "text-lg font-bold font-mono leading-none tabular-nums",
            isExpired
              ? "text-gray-400"
              : isUrgent
              ? "text-red-600"
              : "text-blue-700"
          )}
        >
          {isExpired ? "00:00" : formatTime(remaining)}
        </p>
      </div>
    </div>
  );
}
