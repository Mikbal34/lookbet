"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";

// Usage:
// <Stepper
//   steps={["Search", "Select Room", "Guest Details", "Payment", "Confirmation"]}
//   currentStep={2}
// />
//
// Step indices are 0-based:
//   - steps[0..currentStep-1] = completed
//   - steps[currentStep]      = active
//   - steps[currentStep+1..] = upcoming

export interface StepperProps {
  steps: string[];
  currentStep: number;
  className?: string;
  /** Orientation of the stepper */
  orientation?: "horizontal" | "vertical";
}

type StepStatus = "completed" | "active" | "upcoming";

export const Stepper = ({
  steps,
  currentStep,
  className,
  orientation = "horizontal",
}: StepperProps) => {
  const getStatus = (index: number): StepStatus => {
    if (index < currentStep) return "completed";
    if (index === currentStep) return "active";
    return "upcoming";
  };

  if (orientation === "vertical") {
    return (
      <ol
        aria-label="Progress steps"
        className={cn("flex flex-col gap-0", className)}
      >
        {steps.map((step, index) => {
          const status = getStatus(index);
          const isLast = index === steps.length - 1;

          return (
            <li key={step} className="flex gap-3">
              {/* Indicator column */}
              <div className="flex flex-col items-center">
                <StepIndicator index={index} status={status} />
                {!isLast && (
                  <div
                    className={cn(
                      "w-0.5 flex-1 my-1",
                      status === "completed" ? "bg-blue-600" : "bg-gray-200"
                    )}
                    aria-hidden="true"
                  />
                )}
              </div>
              {/* Label column */}
              <div className="pb-6 pt-0.5 min-w-0">
                <StepLabel step={step} status={status} index={index} />
              </div>
            </li>
          );
        })}
      </ol>
    );
  }

  return (
    <ol
      aria-label="Progress steps"
      className={cn(
        "flex items-start justify-between w-full",
        className
      )}
    >
      {steps.map((step, index) => {
        const status = getStatus(index);
        const isLast = index === steps.length - 1;

        return (
          <li
            key={step}
            className={cn(
              "flex flex-col items-center gap-2",
              !isLast && "flex-1"
            )}
          >
            <div className="flex items-center w-full">
              <StepIndicator index={index} status={status} />
              {!isLast && (
                <div
                  className={cn(
                    "h-0.5 flex-1 mx-2",
                    status === "completed" ? "bg-blue-600" : "bg-gray-200"
                  )}
                  aria-hidden="true"
                />
              )}
            </div>
            <StepLabel step={step} status={status} index={index} />
          </li>
        );
      })}
    </ol>
  );
};

Stepper.displayName = "Stepper";

// Internal sub-components

interface StepIndicatorProps {
  index: number;
  status: StepStatus;
}

const StepIndicator = ({ index, status }: StepIndicatorProps) => (
  <div
    aria-hidden="true"
    className={cn(
      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
      "border-2 transition-colors duration-200",
      {
        "border-blue-600 bg-blue-600 text-white": status === "completed",
        "border-blue-600 bg-white text-blue-600 ring-4 ring-blue-50":
          status === "active",
        "border-gray-300 bg-white text-gray-400": status === "upcoming",
      }
    )}
  >
    {status === "completed" ? (
      <Check className="h-4 w-4" strokeWidth={2.5} />
    ) : (
      <span>{index + 1}</span>
    )}
  </div>
);

interface StepLabelProps {
  step: string;
  status: StepStatus;
  index: number;
}

const StepLabel = ({ step, status }: StepLabelProps) => (
  <span
    className={cn("text-xs font-medium text-center leading-snug max-w-[80px]", {
      "text-blue-600": status === "active",
      "text-gray-900": status === "completed",
      "text-gray-400": status === "upcoming",
    })}
  >
    {step}
  </span>
);
