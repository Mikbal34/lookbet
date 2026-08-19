import Link from "next/link";
/* eslint-disable @next/next/no-img-element */
import { cn } from "@/lib/utils/cn";

// LookBeds logosu — turuncu yatak ikonu + Manrope wordmark.
// variant="light" koyu (turuncu) zeminlerde kullanılır.
export function Logo({
  href = "/",
  size = "md",
  variant = "dark",
  suffix,
  className,
}: {
  href?: string;
  size?: "sm" | "md" | "lg";
  variant?: "dark" | "light";
  suffix?: string;
  className?: string;
}) {
  const iconSizes = { sm: 26, md: 32, lg: 36 };
  const textSizes = { sm: "text-lg", md: "text-xl", lg: "text-[22px]" };
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2 select-none shrink-0",
        className
      )}
    >
      <img
        src="/lookbeds-logo.svg"
        alt=""
        width={iconSizes[size]}
        height={iconSizes[size]}
        className={cn(
          "rounded-md",
          // Turuncu zeminde ikona ince beyaz çerçeve — logo kaybolmasın
          variant === "light" && "ring-1 ring-white/40"
        )}
        aria-hidden="true"
      />
      <span
        className={cn(
          "font-extrabold tracking-[-0.02em]",
          textSizes[size],
          variant === "light" ? "text-white" : "text-ink"
        )}
      >
        LookBeds
      </span>
      {suffix && (
        <span
          className={cn(
            "text-[11px] font-bold tracking-[2px] uppercase",
            variant === "light" ? "text-white/80" : "text-navy"
          )}
        >
          {suffix}
        </span>
      )}
    </Link>
  );
}
