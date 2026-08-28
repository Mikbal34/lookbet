"use client";

// Uygulama ana sayfasının turuncu bloğu: tam genişlik kampanya karuseli ve
// üstüne binen arama kartı.
//
// Arama kartı üç satıra bölündü (nereye / tarih / kişi). Üçü de aynı tam
// ekran arama katmanını açıyor — mobilde satır içi form doldurmak yerine
// odaklı bir ekrana geçmek, Pegasus'un ve Booking'in yaptığı.

import * as React from "react";
import { CalendarDays, MapPin, Search, Users } from "lucide-react";
import { CAMPAIGNS } from "@/lib/constants/campaigns";
import { cn } from "@/lib/utils/cn";
import { formatDateRange } from "@/lib/utils";

export interface AppHomeHeroProps {
  destination?: string;
  checkIn?: string;
  checkOut?: string;
  adults?: number;
  onAc: () => void;
}

export function AppHomeHero({
  destination,
  checkIn,
  checkOut,
  adults = 2,
  onAc,
}: AppHomeHeroProps) {
  const [aktif, setAktif] = React.useState(0);
  const seritRef = React.useRef<HTMLDivElement | null>(null);

  const seritKaydi = () => {
    const el = seritRef.current;
    if (!el || el.clientWidth === 0) return;
    setAktif(Math.round(el.scrollLeft / el.clientWidth));
  };

  const tarihMetni =
    checkIn && checkOut ? formatDateRange(checkIn, checkOut) : "Tarih seç";

  return (
    <div className="b2c-only bg-navy">
      {/* Kampanya karuseli — tam genişlik, nokta göstergeli */}
      <div
        ref={seritRef}
        onScroll={seritKaydi}
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto"
        aria-label="Kampanyalar"
      >
        {CAMPAIGNS.map((k) => (
          <div
            key={k.code}
            className="flex h-40 w-full shrink-0 snap-center flex-col justify-end px-4 pb-5"
            style={{ background: k.bg }}
          >
            <span className="text-[10.5px] font-bold tracking-[0.14em] text-white/75 uppercase">
              {k.tag} · {k.until}
            </span>
            <div className="mt-1 flex items-end gap-2">
              <span className="text-[34px] leading-none font-extrabold text-gold">
                {k.amount}
              </span>
              <span className="pb-1 text-[15px] leading-tight font-bold text-white">
                {k.title}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-center gap-1.5 py-2.5" aria-hidden="true">
        {CAMPAIGNS.map((k, i) => (
          <span
            key={k.code}
            className={cn(
              "h-1.5 rounded-full transition-all",
              i === aktif ? "w-4 bg-white" : "w-1.5 bg-white/40"
            )}
          />
        ))}
      </div>

      {/* Arama kartı — turuncuya biniyor */}
      <div className="px-4 pb-5">
        <div className="overflow-hidden rounded-xl bg-white shadow-[0_12px_28px_-10px_rgb(11_13_20/0.35)]">
          <SatirDugmesi
            ikon={MapPin}
            etiket="Nereye?"
            deger={destination || "Şehir, bölge veya otel"}
            dolu={!!destination}
            onClick={onAc}
          />
          <SatirDugmesi
            ikon={CalendarDays}
            etiket="Tarih"
            deger={tarihMetni}
            dolu={!!(checkIn && checkOut)}
            onClick={onAc}
          />
          <SatirDugmesi
            ikon={Users}
            etiket="Kişi"
            deger={`${adults} Yetişkin`}
            dolu
            onClick={onAc}
            sonSatir
          />

          <button
            type="button"
            onClick={onAc}
            className="flex min-h-14 w-full items-center justify-center gap-2.5 bg-gold text-[16px] font-bold text-ink active:bg-gold-dark"
          >
            <Search className="size-4" aria-hidden="true" />
            Otel Ara
          </button>
        </div>
      </div>
    </div>
  );
}

function SatirDugmesi({
  ikon: Ikon,
  etiket,
  deger,
  dolu,
  onClick,
  sonSatir = false,
}: {
  ikon: React.ComponentType<{ className?: string }>;
  etiket: string;
  deger: string;
  dolu: boolean;
  onClick: () => void;
  sonSatir?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-14 w-full items-center gap-3 px-4 text-left active:bg-chip",
        !sonSatir && "border-b border-line"
      )}
    >
      <Ikon className="size-[18px] shrink-0 text-navy" aria-hidden="true" />
      <span className="w-16 shrink-0 text-[12px] font-semibold text-muted">
        {etiket}
      </span>
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-right text-[15px] font-bold",
          dolu ? "text-ink" : "text-muted/70"
        )}
      >
        {deger}
      </span>
    </button>
  );
}
