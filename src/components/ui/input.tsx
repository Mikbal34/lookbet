"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

// Usage:
// <Input label="Full Name" placeholder="John Doe" error={errors.name?.message} />
// <Input label="Email" type="email" ref={ref} {...field} />

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  id?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, type = "text", ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;
    const errorId = `${inputId}-error`;
    const hintId = `${inputId}-hint`;

    const describedBy = [
      error ? errorId : null,
      hint ? hintId : null,
    ]
      .filter(Boolean)
      .join(" ") || undefined;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-[12.5px] font-bold text-ink"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          type={type}
          aria-describedby={describedBy}
          aria-invalid={error ? "true" : undefined}
          className={cn(
            "h-11 w-full rounded-md border px-[15px] text-sm text-ink placeholder:text-muted/70",
            "bg-white transition-colors duration-150",
            "focus:outline-none focus:border-navy",
            "disabled:cursor-not-allowed disabled:bg-paper disabled:text-muted",
            error
              ? "border-red-400 focus:border-red-400"
              : "border-line-strong",
            className
          )}
          {...props}
        />
        {hint && !error && (
          <p id={hintId} className="text-xs text-muted">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} role="alert" className="text-xs text-red-600 flex items-center gap-1">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
