"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

// Usage:
// <Avatar src="/photos/john.jpg" alt="John Doe" />
// <Avatar name="John Doe" size="lg" />
// <Avatar src={user.image} name={user.name} size="sm" />

export interface AvatarProps {
  src?: string | null;
  alt?: string;
  name?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses: Record<NonNullable<AvatarProps["size"]>, string> = {
  xs: "h-6 w-6 text-xs",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-16 w-16 text-xl",
};

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

// Deterministic color from name
const avatarColors = [
  "bg-blue-100 text-blue-700",
  "bg-indigo-100 text-indigo-700",
  "bg-purple-100 text-purple-700",
  "bg-pink-100 text-pink-700",
  "bg-green-100 text-green-700",
  "bg-teal-100 text-teal-700",
  "bg-orange-100 text-orange-700",
  "bg-cyan-100 text-cyan-700",
];

function getColorFromName(name: string): string {
  const charSum = name
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return avatarColors[charSum % avatarColors.length];
}

export const Avatar = ({
  src,
  alt,
  name,
  size = "md",
  className,
}: AvatarProps) => {
  const [imgError, setImgError] = React.useState(false);
  const showImage = src && !imgError;
  const initials = name ? getInitials(name) : "?";
  const colorClass = name ? getColorFromName(name) : "bg-gray-100 text-gray-500";
  const displayAlt = alt ?? name ?? "Avatar";

  return (
    <span
      role="img"
      aria-label={displayAlt}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full overflow-hidden",
        "font-semibold select-none",
        sizeClasses[size],
        !showImage && colorClass,
        className
      )}
    >
      {showImage ? (
        <img
          src={src}
          alt={displayAlt}
          className="h-full w-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <span aria-hidden="true">{initials}</span>
      )}
    </span>
  );
};

Avatar.displayName = "Avatar";
