"use client";

// Kapsül sekme — alt sekme çubuğunun küçük kardeşi.
//
// Alttaki yüzen kapsülle aynı dil: yumuşak zemin, üstünde kayan beyaz hap.
// Sayfa içindeki geçişler de aynı hareketi yapınca uygulama tek parça
// duruyor; altta hap kayıyor, üstte de hap kayıyor.
//
// Gösterge ayrı bir katman ve transform ile kayıyor — her butona ayrı ayrı
// arka plan verip renk geçirmek yerine. transform GPU'da çalışıyor, WebView'de
// arka plan geçişinden belirgin biçimde akıcı.
//
// Görünen hap 36px ama buton 44px: dokunma hedefi küçülmeden çubuk inceliyor.
//
// Pasif etiket text-muted değil text-slate-text: muted (#8a8377) chip zemininde
// 3.21 kontrast veriyordu, 13px metin için AA sınırı 4.5. Hangi sekmenin seçili
// olduğunu zaten kayan beyaz hap söylüyor, soluk metne gerek yok.
//
// Genişlik/öteleme inline style ile veriliyor; seçenek sayısına bağlı oldukları
// için Tailwind'in üretebileceği sabit sınıflar değiller.

import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedTabsProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Sekmelerin yönettiği panelin id'si — aria-controls için. */
  panelId?: string;
  ariaLabel: string;
  className?: string;
}

export function SegmentedTabs<T extends string>({
  options,
  value,
  onChange,
  panelId,
  ariaLabel,
  className,
}: SegmentedTabsProps<T>) {
  const id = React.useId();
  const aktif = Math.max(
    0,
    options.findIndex((o) => o.value === value)
  );

  // Sol/sağ ok ile gezinme — tablist'in beklenen klavye davranışı.
  const okTusu = (e: React.KeyboardEvent) => {
    const yon = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!yon) return;
    e.preventDefault();
    const sonraki = (aktif + yon + options.length) % options.length;
    onChange(options[sonraki].value);
    document.getElementById(`${id}-${sonraki}`)?.focus();
  };

  return (
    <div className={cn("rounded-full bg-chip px-1", className)}>
      <div
        role="tablist"
        aria-label={ariaLabel}
        onKeyDown={okTusu}
        className="relative flex"
      >
        <span
          aria-hidden="true"
          className="absolute inset-y-1 left-0 rounded-full bg-white shadow-[0_1px_3px_rgb(11_13_20/0.14)] transition-transform duration-300 ease-out motion-reduce:transition-none"
          style={{
            width: `${100 / options.length}%`,
            transform: `translateX(${aktif * 100}%)`,
          }}
        />

        {options.map((o, i) => {
          const secili = i === aktif;
          return (
            <button
              key={o.value}
              id={`${id}-${i}`}
              type="button"
              role="tab"
              aria-selected={secili}
              aria-controls={panelId}
              tabIndex={secili ? 0 : -1}
              onClick={() => onChange(o.value)}
              className={cn(
                "relative z-10 flex h-11 min-w-0 flex-1 items-center justify-center rounded-full px-2 text-[13px] font-semibold transition-colors duration-200",
                "focus-visible:ring-2 focus-visible:ring-navy focus-visible:outline-none",
                secili ? "text-ink" : "text-slate-text"
              )}
            >
              <span className="truncate">{o.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
