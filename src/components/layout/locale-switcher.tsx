"use client";

// Dil + para birimi seçici — tasarımdaki küre butonlu panel.
// variant="transparent": ana sayfadaki foto üstü header için açık renk stil.

import * as React from "react";
import { Globe } from "lucide-react";
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

export function LocaleSwitcher({
  variant = "solid",
}: {
  variant?: "solid" | "transparent";
}) {
  const { lang, currency, setLang, setCurrency } = useLocale();
  const [open, setOpen] = React.useState(false);

  const curSymbol = CURRENCIES.find((c) => c.code === currency)?.symbol ?? "€";
  const transparent = variant === "transparent";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          "flex items-center gap-2 rounded-sm px-3.5 py-2 text-[13px] font-bold transition-colors",
          transparent
            ? "border border-paper/40 text-paper hover:border-gold"
            : "bg-white border border-line-strong text-ink hover:border-navy"
        )}
      >
        <Globe className="h-[15px] w-[15px]" aria-hidden="true" />
        {lang.toUpperCase()} · {curSymbol}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            className="absolute top-[calc(100%+8px)] right-0 bg-white border border-line rounded-md shadow-[0_12px_28px_-10px_rgb(11_13_20/0.25)] p-[18px] z-20"
            style={{ width: 300 }}
          >
            <div className="text-[11px] font-bold tracking-[1.5px] uppercase text-muted mb-2.5">
              Dil
            </div>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {LANGUAGES.map((l) => (
                <Chip
                  key={l.code}
                  active={lang === l.code}
                  onClick={() => setLang(l.code)}
                >
                  {l.label}
                </Chip>
              ))}
            </div>

            <div className="text-[11px] font-bold tracking-[1.5px] uppercase text-muted mb-2.5">
              Para birimi
            </div>
            <div className="grid grid-cols-2 gap-2">
              {CURRENCIES.map((c) => (
                <Chip
                  key={c.code}
                  active={currency === c.code}
                  onClick={() => {
                    setCurrency(c.code);
                    setOpen(false);
                  }}
                >
                  {c.code} {c.symbol}
                </Chip>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
