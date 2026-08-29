"use client";

// "Son aramaların" — uygulama ana sayfasında yatay chip şeridi.
// Dokununca aynı aramayı doğrudan tekrar çalıştırır.
//
// Liste cihazdan okunuyor (bkz. lib/utils/recent-searches.ts), bu yüzden
// girişsiz kullanıcıda da çalışıyor. Kayıt yoksa hiçbir şey render edilmiyor.

import * as React from "react";
import Link from "next/link";
import { LbKapat, LbSaat } from "@/components/ui/icons";
import {
  clearRecentSearches,
  getRecentSearches,
  type RecentSearch,
} from "@/lib/utils/recent-searches";
import { formatDateRange } from "@/lib/utils";

function href(a: RecentSearch): string {
  const p = new URLSearchParams({
    destination: a.destination,
    checkIn: a.checkIn,
    checkOut: a.checkOut,
    adults: String(a.adults),
  });
  return `/search?${p.toString()}`;
}

export function RecentSearches() {
  // localStorage yalnızca istemcide var; sunucu render'ında boş liste ile
  // başlayıp hydration sonrası dolduruyoruz ki uyuşmazlık olmasın.
  const [aramalar, setAramalar] = React.useState<RecentSearch[]>([]);

  React.useEffect(() => {
    setAramalar(getRecentSearches());
  }, []);

  if (aramalar.length === 0) return null;

  return (
    <section className="b2c-only pt-5" aria-label="Son aramaların">
      <div className="flex items-center justify-between px-4 pb-2.5">
        <h2 className="flex items-center gap-1.5 text-[13px] font-bold text-ink">
          <LbSaat size={16} className="text-navy-text" />
          Son aramaların
        </h2>
        <button
          type="button"
          onClick={() => {
            clearRecentSearches();
            setAramalar([]);
          }}
          className="-mr-2 flex min-h-11 items-center gap-1 px-2 text-[12.5px] font-semibold text-muted active:text-ink"
        >
          Temizle
          <LbKapat size={14} />
        </button>
      </div>

      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-1">
        {aramalar.map((a) => (
          <Link
            key={`${a.destination}-${a.checkIn}-${a.ts}`}
            href={href(a)}
            className="flex min-h-11 shrink-0 flex-col justify-center rounded-lg border border-line-strong px-3.5 py-2 active:bg-chip"
          >
            <span className="text-[13.5px] font-bold text-ink">
              {a.destination}
            </span>
            <span className="text-[11.5px] text-muted">
              {formatDateRange(a.checkIn, a.checkOut)} · {a.adults} kişi
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
