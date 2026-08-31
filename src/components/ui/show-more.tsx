"use client";

// Uzun bölümleri lg altında kısaltır: içerik belirli bir yüksekliğe kırpılır,
// alta doğru beyaza eriyen bir maske ve "devamını gör" düğmesi konur.
//
// Neden CSS ile: kırpma `max-height` üzerinden yapıldığı için lg üstünde
// `lg:max-h-none` ile tamamen devre dışı kalıyor. Böylece masaüstünde ne
// ek JavaScript ne de düzen farkı oluyor; içerik sunucudan geldiği gibi
// duruyor ve arama motorları tamamını görüyor.

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface ShowMoreProps {
  children: React.ReactNode;
  /** Kapalıyken görünecek yükseklik (px) — lg altında geçerli. */
  kapaliYukseklik?: number;
  /** Düğme metni, ör. "Tüm 24 yorumu gör". */
  acEtiketi: string;
  kapatEtiketi?: string;
  className?: string;
}

export function ShowMore({
  children,
  kapaliYukseklik = 280,
  acEtiketi,
  kapatEtiketi = "Daha az göster",
  className,
}: ShowMoreProps) {
  const [acik, setAcik] = React.useState(false);

  return (
    <div className={className}>
      <div
        className={cn(
          "relative overflow-hidden lg:max-h-none lg:overflow-visible",
          acik && "max-h-none overflow-visible"
        )}
        style={acik ? undefined : { maxHeight: kapaliYukseklik }}
      >
        {children}

        {/* Kırpma maskesi — içeriğin kesildiği yerde sert bir çizgi kalmasın.
            Açıkken ve lg üstünde gizli. */}
        {!acik && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent lg:hidden"
          />
        )}
      </div>

      <button
        type="button"
        onClick={() => setAcik((a) => !a)}
        aria-expanded={acik}
        className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-md border border-line-strong px-4 text-[14px] font-bold text-ink active:bg-chip lg:hidden"
      >
        {acik ? kapatEtiketi : acEtiketi}
        <ChevronDown
          className={cn("size-4 transition-transform", acik && "rotate-180")}
          aria-hidden="true"
        />
      </button>
    </div>
  );
}
