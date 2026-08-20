"use client";

// Dil + para birimi seçici — tasarımdaki küre butonlu panel.
// variant="transparent": ana sayfadaki foto üstü header için açık renk stil.

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import {
  useLocale,
  LANGUAGES,
  CURRENCIES,
} from "@/components/providers/locale-provider";

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full px-3 py-2 rounded-sm text-[13px] font-semibold cursor-pointer border transition-colors text-center whitespace-nowrap",
        active
          ? "bg-navy border-navy text-paper"
          : "border-line-strong text-slate-text hover:border-navy"
      )}
    >
      {children}
    </button>
  );
}

// Footer'da seçili dil + para birimini gösteren küçük etiket.
export function LocaleFooterLabel() {
  const { lang, currency } = useLocale();
  const langLabel = LANGUAGES.find((l) => l.code === lang)?.label ?? "Türkçe";
  const cur = CURRENCIES.find((c) => c.code === currency);
  return (
    <>
      <span>{langLabel}</span>
      <span>
        {cur?.code} {cur?.symbol}
      </span>
    </>
  );
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  TRY: "₺",
  USD: "$",
  EUR: "€",
  GBP: "£",
};

const CURRENCY_FLAGS: Record<string, string> = {
  TRY: "🇹🇷",
  USD: "🇺🇸",
  EUR: "🇪🇺",
  GBP: "🇬🇧",
};

export function LocaleSwitcher({
  variant = "solid",
}: {
  variant?: "solid" | "transparent";
}) {
  const { lang, currency, setLang, setCurrency } = useLocale();
  const [open, setOpen] = React.useState(false);

  // Royal API'dan senkronize edilen para birimleri; tablo boş ya da istek
  // başarısızsa yerleşik varsayılan listeye düşülür.
  const [currencyOptions, setCurrencyOptions] = React.useState<
    { code: string; symbol: string; name?: string }[]
  >([...CURRENCIES]);

  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/content/currencies")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { currencies?: { code: string; name: string }[] } | null) => {
        if (cancelled || !data?.currencies?.length) return;
        setCurrencyOptions(
          data.currencies.map((c) => ({
            code: c.code,
            symbol: CURRENCY_SYMBOLS[c.code] ?? c.code,
            name: c.name,
          }))
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const curSymbol =
    currencyOptions.find((c) => c.code === currency)?.symbol ??
    CURRENCY_SYMBOLS[currency] ??
    "€";
  const currentFlag = LANGUAGES.find((l) => l.code === lang)?.flag ?? "🌐";
  const transparent = variant === "transparent";

  // ESC ile kapat
  React.useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {/* Header tetikleyici — bayrak + dil kodu + para birimi */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          "flex items-center gap-2 rounded-sm px-3.5 py-2 text-[13px] font-bold transition-colors",
          transparent
            ? "border border-paper/40 text-paper hover:border-gold"
            : "bg-white border border-line-strong text-ink hover:border-navy"
        )}
      >
        <span className="text-[15px] leading-none">{currentFlag}</span>
        {lang.toUpperCase()} · {curSymbol}
      </button>

      {/* Ekranın ortasında açılan modal pop-up */}
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label="Dil ve para birimi"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-ink">Dil ve Para Birimi</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Kapat"
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-gray-100"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="mb-2.5 text-[11px] font-bold uppercase tracking-[1.5px] text-muted">
              Dil
            </div>
            <div className="mb-6 grid grid-cols-2 gap-2">
              {LANGUAGES.map((l) => (
                <Chip
                  key={l.code}
                  active={lang === l.code}
                  onClick={() => setLang(l.code)}
                >
                  <span className="mr-1.5 text-[15px] leading-none">{l.flag}</span>
                  {l.label}
                </Chip>
              ))}
            </div>

            <div className="mb-2.5 text-[11px] font-bold uppercase tracking-[1.5px] text-muted">
              Para birimi
            </div>
            <div className="grid grid-cols-2 gap-2">
              {currencyOptions.map((c) => (
                <Chip
                  key={c.code}
                  active={currency === c.code}
                  onClick={() => setCurrency(c.code)}
                >
                  {CURRENCY_FLAGS[c.code] && (
                    <span className="mr-1.5 text-[15px] leading-none">
                      {CURRENCY_FLAGS[c.code]}
                    </span>
                  )}
                  {c.code} {c.symbol}
                </Chip>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
