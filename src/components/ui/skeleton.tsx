"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

// Usage:
// <Skeleton className="h-10 w-full" />
// <Skeleton className="h-4 w-3/4" />
// <Skeleton className="h-32 w-full rounded-xl" />
//
// Card skeleton pattern:
// <div className="space-y-3">
//   <Skeleton className="h-48 w-full rounded-xl" />
//   <Skeleton className="h-4 w-2/3" />
//   <Skeleton className="h-4 w-1/2" />
// </div>

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      role="status"
      aria-label="Loading..."
      className={cn(
        "animate-pulse rounded-md bg-gray-200",
        className
      )}
      {...props}
    />
  )
);

Skeleton.displayName = "Skeleton";
