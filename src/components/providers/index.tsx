"use client";

import { ReactNode } from "react";
import { SessionProvider } from "./session-provider";
import { QueryProvider } from "./query-provider";
import { LocaleProvider } from "./locale-provider";
import { Toaster } from "sonner";
import { GirisSaglayici } from "@/components/lb/giris/giris-saglayici";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <QueryProvider>
        <LocaleProvider>
          <GirisSaglayici>
            {children}
            <Toaster position="top-right" richColors />
          </GirisSaglayici>
        </LocaleProvider>
      </QueryProvider>
    </SessionProvider>
  );
}
