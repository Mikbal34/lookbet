"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

// Usage:
// <Badge variant="success">Confirmed</Badge>
// <Badge variant="warning">Pending</Badge>
// <Badge variant="error">Cancelled</Badge>
// <Badge variant="default">Available</Badge>

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "error" | "secondary";
}

const variantClasses: Record<NonNullable<BadgeProps["variant"]>, string> = {
  default:
    "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20",
  success:
    "bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20",
  warning:
    "bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-600/20",
  error:
    "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20",
  secondary:
    "bg-gray-100 text-gray-600 ring-1 ring-inset ring-gray-500/20",
};

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  )
);

Badge.displayName = "Badge";
