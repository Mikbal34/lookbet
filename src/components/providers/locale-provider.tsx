"use client";

// Dil + para birimi tercihi — localStorage'da kalıcı, tüm uygulamada erişilebilir.
// Para birimi otel aramalarına parametre olarak gider; dil seçimi şimdilik
// tercih olarak saklanır (tam çeviri altyapısı ayrı iş).

import * as React from "react";

export const LANGUAGES = [
  { code: "tr", label: "Türkçe", flag: "🇹🇷" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "ru", label: "Русский", flag: "🇷🇺" },
] as const;

export const CURRENCIES = [
  { code: "TRY", symbol: "₺", flag: "🇹🇷" },
  { code: "USD", symbol: "$", flag: "🇺🇸" },
  { code: "EUR", symbol: "€", flag: "🇪🇺" },
  { code: "GBP", symbol: "£", flag: "🇬🇧" },
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

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = React.useState("tr");
  const [currency, setCurrencyState] = React.useState("EUR");

  React.useEffect(() => {
    try {
      const l = localStorage.getItem("lookbet.lang");
      const c = localStorage.getItem("lookbet.currency");
      if (l) setLangState(l);
      if (c) setCurrencyState(c);
    } catch {}
  }, []);

  const setLang = (l: string) => {
    setLangState(l);
    try {
      localStorage.setItem("lookbet.lang", l);
    } catch {}
  };

  const setCurrency = (c: string) => {
    setCurrencyState(c);
    try {
      localStorage.setItem("lookbet.currency", c);
    } catch {}
  };

  return (
    <LocaleContext.Provider value={{ lang, currency, setLang, setCurrency }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return React.useContext(LocaleContext);
}
