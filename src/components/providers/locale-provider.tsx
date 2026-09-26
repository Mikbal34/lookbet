"use client";

// Dil + para birimi tercihi. Dil next-intl'den (NEXT_LOCALE çerezi; bkz.
// i18n/request.ts): değiştirilince çereze yazılır ve sayfa sunucuda yeni
// dille yeniden çizilir. Para birimi localStorage'da; fiyatlar seçilen
// birimde TCMB kuruyla yaklaşık gösterilir (lb/fiyat), ödeme EUR.

import * as React from "react";
import { useRouter } from "next/navigation";
import { useLocale as useDil } from "next-intl";
import { dilCereziYaz, dilMi } from "@/i18n/diller";

/** Desteklenen diller (kendi dillerinde yazılır). */
export const LANGUAGES = [
  { code: "tr", label: "Türkçe" },
  { code: "en", label: "English" },
] as const;

export const CURRENCIES = [
  { code: "TRY", symbol: "₺" },
  { code: "USD", symbol: "$" },
  { code: "EUR", symbol: "€" },
  { code: "GBP", symbol: "£" },
] as const;

interface LocalePrefs {
  lang: string;
  currency: string;
  setLang: (lang: string) => void;
  setCurrency: (currency: string) => void;
}

const LocaleContext = React.createContext<LocalePrefs>({
  lang: "tr",
  currency: "EUR",
  setLang: () => {},
  setCurrency: () => {},
});

const PARA_ANAHTARI = "lookbet.currency";
const paraDinleyicileri = new Set<() => void>();
function paraOku(): string {
  try {
    return localStorage.getItem(PARA_ANAHTARI) || "EUR";
  } catch {
    return "EUR";
  }
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const lang = useDil();
  const currency = React.useSyncExternalStore(
    (dinle) => {
      paraDinleyicileri.add(dinle);
      return () => paraDinleyicileri.delete(dinle);
    },
    paraOku,
    () => "EUR"
  );

  const setLang = React.useCallback(
    (l: string) => {
      if (!dilMi(l) || l === lang) return;
      dilCereziYaz(l);
      router.refresh();
    },
    [lang, router]
  );

  const setCurrency = React.useCallback((c: string) => {
    try {
      localStorage.setItem(PARA_ANAHTARI, c);
    } catch {}
    paraDinleyicileri.forEach((f) => f());
  }, []);

  const deger = React.useMemo(() => ({ lang, currency, setLang, setCurrency }), [lang, currency, setLang, setCurrency]);
  return <LocaleContext.Provider value={deger}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return React.useContext(LocaleContext);
}
