"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

// Usage:
// <Tabs defaultValue="overview">
//   <TabsList>
//     <TabsTrigger value="overview">Overview</TabsTrigger>
//     <TabsTrigger value="rooms">Rooms</TabsTrigger>
//     <TabsTrigger value="amenities">Amenities</TabsTrigger>
//   </TabsList>
//   <TabsContent value="overview"><p>Overview content</p></TabsContent>
//   <TabsContent value="rooms"><p>Rooms content</p></TabsContent>
//   <TabsContent value="amenities"><p>Amenities content</p></TabsContent>
// </Tabs>

interface TabsContextValue {
  activeTab: string;
  setActiveTab: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error("Tabs sub-components must be used inside <Tabs>");
  return ctx;
}

export interface TabsProps {
  defaultValue: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export const Tabs = ({
  defaultValue,
  value,
  onValueChange,
  children,
  className,
}: TabsProps) => {
  const [internalTab, setInternalTab] = React.useState(defaultValue);
  const activeTab = value ?? internalTab;

  const setActiveTab = React.useCallback(
    (v: string) => {
      setInternalTab(v);
      onValueChange?.(v);
    },
    [onValueChange]
  );

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={cn("w-full", className)}>{children}</div>
    </TabsContext.Provider>
  );
};
Tabs.displayName = "Tabs";

export interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {}

export const TabsList = ({ className, ...props }: TabsListProps) => (
  <div
    role="tablist"
    className={cn(
      "flex border-b border-gray-200 gap-0",
      className
    )}
    {...props}
  />
);
TabsList.displayName = "TabsList";

export interface TabsTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

export const TabsTrigger = ({
  className,
  value,
  children,
  ...props
}: TabsTriggerProps) => {
  const { activeTab, setActiveTab } = useTabsContext();
  const isActive = activeTab === value;

  return (
    <button
      role="tab"
      aria-selected={isActive}
      tabIndex={isActive ? 0 : -1}
      onClick={() => setActiveTab(value)}
      className={cn(
        "relative inline-flex items-center gap-1.5 px-4 py-3 text-sm font-medium",
        "transition-colors duration-150 select-none whitespace-nowrap",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset",
        isActive
          ? "text-blue-600 border-b-2 border-blue-600 -mb-px"
          : "text-gray-500 hover:text-gray-700 border-b-2 border-transparent -mb-px hover:border-gray-300",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};
TabsTrigger.displayName = "TabsTrigger";

export interface TabsContentProps
  extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

export const TabsContent = ({
  className,
  value,
  ...props
}: TabsContentProps) => {
  const { activeTab } = useTabsContext();

  if (activeTab !== value) return null;

  return (
    <div
      role="tabpanel"
      tabIndex={0}
      className={cn(
        "mt-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg",
        className
      )}
      {...props}
    />
  );
};
TabsContent.displayName = "TabsContent";
