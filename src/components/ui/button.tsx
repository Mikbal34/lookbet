"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

// Usage:
// <Button variant="default" size="lg" loading>Book Now</Button>
// <Button variant="outline" size="sm" onClick={handler}>Cancel</Button>
// <Button variant="destructive" disabled>Delete</Button>

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "gold" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "sm" | "default" | "lg";
  loading?: boolean;
  children?: React.ReactNode;
}

// lookbet. tasarım dili: lacivert birincil, altın CTA, keskin köşeler.
const variantClasses: Record<NonNullable<ButtonProps["variant"]>, string> = {
  default: "bg-navy text-paper font-semibold hover:bg-navy-dark",
  gold: "bg-gold text-ink font-bold hover:bg-gold-dark",
  secondary: "bg-chip text-slate-text hover:bg-chip-blue",
  outline:
    "border border-line-strong bg-white text-navy font-semibold hover:border-navy",
  ghost: "bg-transparent text-slate-text hover:bg-paper",
  destructive: "bg-red-600 text-white hover:bg-red-700",
};

const sizeClasses: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "h-8 px-3.5 text-xs gap-1.5 rounded-md",
  default: "h-10 px-4 text-sm gap-2 rounded-md",
  lg: "h-12 px-6 text-[15px] gap-2.5 rounded-md",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "default",
      size = "default",
      loading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        aria-busy={loading}
        className={cn(
          "inline-flex items-center justify-center font-medium transition-colors duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2",
          "disabled:pointer-events-none disabled:opacity-50",
          "select-none whitespace-nowrap",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {loading && (
          <Loader2
            className={cn("animate-spin shrink-0", {
              "h-3 w-3": size === "sm",
              "h-4 w-4": size === "default",
              "h-5 w-5": size === "lg",
            })}
            aria-hidden="true"
          />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
