"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

// Usage:
// <DropdownMenu>
//   <DropdownMenuTrigger asChild>
//     <Button variant="outline" size="sm">
//       Actions <ChevronDown className="ml-1 h-3 w-3" />
//     </Button>
//   </DropdownMenuTrigger>
//   <DropdownMenuContent align="end">
//     <DropdownMenuItem onClick={() => handleEdit()}>Edit booking</DropdownMenuItem>
//     <DropdownMenuItem onClick={() => handleView()}>View details</DropdownMenuItem>
//     <DropdownMenuSeparator />
//     <DropdownMenuItem variant="destructive" onClick={() => handleCancel()}>
//       Cancel booking
//     </DropdownMenuItem>
//   </DropdownMenuContent>
// </DropdownMenu>

interface DropdownContextValue {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  triggerRef: React.RefObject<HTMLElement | null>;
}

const DropdownContext = React.createContext<DropdownContextValue | null>(null);

function useDropdownContext() {
  const ctx = React.useContext(DropdownContext);
  if (!ctx)
    throw new Error("DropdownMenu sub-components must be used inside <DropdownMenu>");
  return ctx;
}

export interface DropdownMenuProps {
  children: React.ReactNode;
}

export const DropdownMenu = ({ children }: DropdownMenuProps) => {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLElement | null>(null);

  return (
    <DropdownContext.Provider value={{ open, setOpen, triggerRef }}>
      <div className="relative inline-block">{children}</div>
    </DropdownContext.Provider>
  );
};
DropdownMenu.displayName = "DropdownMenu";

export interface DropdownMenuTriggerProps {
  children: React.ReactElement;
  asChild?: boolean;
}

export const DropdownMenuTrigger = ({
  children,
  asChild = false,
}: DropdownMenuTriggerProps) => {
  const { open, setOpen, triggerRef } = useDropdownContext();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen((prev) => !prev);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
    }
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<React.HTMLAttributes<HTMLElement>>, {
      onClick: handleClick,
      onKeyDown: handleKeyDown,
      "aria-expanded": open,
      "aria-haspopup": "menu",
      ref: triggerRef as React.Ref<HTMLElement>,
    } as React.HTMLAttributes<HTMLElement> & { ref: React.Ref<HTMLElement> });
  }

  return (
    <button
      ref={triggerRef as React.RefObject<HTMLButtonElement>}
      type="button"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-expanded={open}
      aria-haspopup="menu"
      className="inline-flex items-center gap-1"
    >
      {children}
    </button>
  );
};
DropdownMenuTrigger.displayName = "DropdownMenuTrigger";

export interface DropdownMenuContentProps
  extends React.HTMLAttributes<HTMLDivElement> {
  align?: "start" | "end" | "center";
  sideOffset?: number;
}

export const DropdownMenuContent = ({
  children,
  className,
  align = "start",
  ...props
}: DropdownMenuContentProps) => {
  const { open, setOpen, triggerRef } = useDropdownContext();
  const menuRef = React.useRef<HTMLDivElement>(null);

  // Close on outside click
  React.useEffect(() => {
    if (!open) return;

    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, setOpen, triggerRef]);

  // Trap focus inside menu with arrow keys
  React.useEffect(() => {
    if (!open || !menuRef.current) return;
    const items = Array.from(
      menuRef.current.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])')
    );
    if (items.length > 0) items[0].focus();
  }, [open]);

  if (!open) return null;

  const alignClass = {
    start: "left-0",
    end: "right-0",
    center: "left-1/2 -translate-x-1/2",
  }[align];

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-orientation="vertical"
      className={cn(
        "absolute top-full z-50 mt-1.5 min-w-[10rem] rounded-xl border border-gray-200",
        "bg-white shadow-lg py-1",
        "animate-in fade-in-0 zoom-in-95 duration-150",
        alignClass,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
DropdownMenuContent.displayName = "DropdownMenuContent";

export interface DropdownMenuItemProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive";
  icon?: React.ReactNode;
}

export const DropdownMenuItem = ({
  className,
  variant = "default",
  icon,
  children,
  onClick,
  ...props
}: DropdownMenuItemProps) => {
  const { setOpen } = useDropdownContext();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(e);
    setOpen(false);
  };

  return (
    <button
      role="menuitem"
      type="button"
      onClick={handleClick}
      className={cn(
        "flex w-full items-center gap-2 px-3 py-2 text-sm",
        "transition-colors duration-100",
        "focus:outline-none focus-visible:bg-gray-100",
        variant === "destructive"
          ? "text-red-600 hover:bg-red-50"
          : "text-gray-700 hover:bg-gray-100",
        className
      )}
      {...props}
    >
      {icon && (
        <span className="shrink-0 opacity-60" aria-hidden="true">
          {icon}
        </span>
      )}
      {children}
    </button>
  );
};
DropdownMenuItem.displayName = "DropdownMenuItem";

export interface DropdownMenuSeparatorProps
  extends React.HTMLAttributes<HTMLHRElement> {}

export const DropdownMenuSeparator = ({
  className,
  ...props
}: DropdownMenuSeparatorProps) => (
  <hr
    role="separator"
    className={cn("my-1 border-gray-100", className)}
    {...props}
  />
);
DropdownMenuSeparator.displayName = "DropdownMenuSeparator";

export interface DropdownMenuLabelProps
  extends React.HTMLAttributes<HTMLDivElement> {}

export const DropdownMenuLabel = ({
  className,
  ...props
}: DropdownMenuLabelProps) => (
  <div
    className={cn(
      "px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400",
      className
    )}
    {...props}
  />
);
DropdownMenuLabel.displayName = "DropdownMenuLabel";
