"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

// Usage:
// const [open, setOpen] = React.useState(false);
//
// <Button onClick={() => setOpen(true)}>Open Dialog</Button>
// <Dialog open={open} onClose={() => setOpen(false)}>
//   <DialogHeader>
//     <DialogTitle>Confirm Booking</DialogTitle>
//     <DialogDescription>Please review your booking details.</DialogDescription>
//   </DialogHeader>
//   <DialogContent>...</DialogContent>
//   <DialogFooter>
//     <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
//     <Button onClick={handleConfirm}>Confirm</Button>
//   </DialogFooter>
// </Dialog>

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  children?: React.ReactNode;
  className?: string;
  /** Prevent closing when clicking the overlay */
  disableOverlayClose?: boolean;
}

export const Dialog = ({
  open,
  onClose,
  children,
  className,
  disableOverlayClose = false,
}: DialogProps) => {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll when open
  React.useEffect(() => {
    if (!mounted) return;
    if (open) {
      const scrollY = window.scrollY;
      document.body.style.overflow = "hidden";
      document.body.style.top = `-${scrollY}px`;
      return () => {
        document.body.style.overflow = "";
        document.body.style.top = "";
        window.scrollTo(0, scrollY);
      };
    }
  }, [open, mounted]);

  // Close on Escape key
  React.useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in-0 duration-200"
        onClick={disableOverlayClose ? undefined : onClose}
        aria-hidden="true"
      />
      {/* Panel */}
      <div
        className={cn(
          "relative z-10 w-full max-w-md bg-white rounded-2xl shadow-xl",
          "animate-in fade-in-0 zoom-in-95 duration-200",
          "max-h-[90vh] flex flex-col",
          className
        )}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close dialog"
          className={cn(
            "absolute right-4 top-4 z-10 rounded-lg p-1.5",
            "text-gray-400 hover:text-gray-600 hover:bg-gray-100",
            "transition-colors duration-150",
            "focus:outline-none focus:ring-2 focus:ring-blue-500"
          )}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
        {children}
      </div>
    </div>,
    document.body
  );
};

Dialog.displayName = "Dialog";

export interface DialogHeaderProps
  extends React.HTMLAttributes<HTMLDivElement> {}

export const DialogHeader = ({ className, ...props }: DialogHeaderProps) => (
  <div
    className={cn("flex flex-col gap-1.5 p-6 pb-0 pr-12", className)}
    {...props}
  />
);
DialogHeader.displayName = "DialogHeader";

export interface DialogTitleProps
  extends React.HTMLAttributes<HTMLHeadingElement> {}

export const DialogTitle = ({ className, ...props }: DialogTitleProps) => (
  <h2
    className={cn("text-lg font-semibold text-gray-900", className)}
    {...props}
  />
);
DialogTitle.displayName = "DialogTitle";

export interface DialogDescriptionProps
  extends React.HTMLAttributes<HTMLParagraphElement> {}

export const DialogDescription = ({
  className,
  ...props
}: DialogDescriptionProps) => (
  <p
    className={cn("text-sm text-gray-500 leading-relaxed", className)}
    {...props}
  />
);
DialogDescription.displayName = "DialogDescription";

export interface DialogContentProps
  extends React.HTMLAttributes<HTMLDivElement> {}

export const DialogContent = ({
  className,
  ...props
}: DialogContentProps) => (
  <div
    className={cn("flex-1 overflow-y-auto px-6 py-4", className)}
    {...props}
  />
);
DialogContent.displayName = "DialogContent";

export interface DialogFooterProps
  extends React.HTMLAttributes<HTMLDivElement> {}

export const DialogFooter = ({ className, ...props }: DialogFooterProps) => (
  <div
    className={cn(
      "flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4",
      className
    )}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";
