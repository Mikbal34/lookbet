"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

// Usage:
// <Spinner />
// <Spinner size="lg" className="text-blue-600" />
// <Spinner size="sm" />
//
// Full-page loading:
// <div className="flex h-screen items-center justify-center">
//   <Spinner size="lg" />
// </div>

export interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
}

const sizeClasses: Record<NonNullable<SpinnerProps["size"]>, string> = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
};

export const Spinner = ({ size = "md", className, label = "Loading..." }: SpinnerProps) => (
  <span role="status" aria-label={label} className="inline-flex">
    <Loader2
      className={cn(
        "animate-spin text-blue-600",
        sizeClasses[size],
        className
      )}
      aria-hidden="true"
    />
    <span className="sr-only">{label}</span>
  </span>
);

Spinner.displayName = "Spinner";
