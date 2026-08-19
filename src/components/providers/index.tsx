"use client";

import { ReactNode } from "react";
import { SessionProvider } from "./session-provider";
import { QueryProvider } from "./query-provider";
import { LocaleProvider } from "./locale-provider";
import { Toaster } from "sonner";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <QueryProvider>
        <LocaleProvider>
          {children}
          <Toaster position="top-right" richColors />
        </LocaleProvider>
      </QueryProvider>
    </SessionProvider>
  );
}
