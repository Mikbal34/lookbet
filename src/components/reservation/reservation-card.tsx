"use client";

// Rezervasyon kartı — bilet üslubunda.
//
// Pegasus'un uçuş kartındaki yapı: üstte rezervasyon numarası ve durum,
// altında kesikli ayraç ve iki yanda çentik (kartı "bilet" yapan şey bu),
// sonra kalkış–varış hattı. Konaklama karşılığı: giriş — gece sayısı — çıkış.
//
// Üst bloğun arkasında duruma göre renklenen çok açık bir gradyan var
// (onaylıda yeşil). Bilette koçanın renkli basılması gibi: kart daha ilk
// bakışta "her şey yolunda" veya "bir sorun var" diyor, rozeti okumadan.
//
// Kesikli ayraç ve çentikler ortak bileşende (ticket-perforation.tsx);
// rezervasyon detayındaki özet kartı da aynısını kullanıyor.
//
// Tek düzen: masaüstünde de aynı kart. Eskiden yatay bir liste satırıydı ve
// her bilgi aynı ağırlıktaydı, göz nereye bakacağını bilmiyordu.

import * as React from "react";
import Link from "next/link";
import { ChevronRight, Moon } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatCurrency, getNightCount } from "@/lib/utils";
import { StatusBadge, statusTint } from "./status-badge";
import { TicketPerforation } from "./ticket-perforation";

export interface ReservationItem {
  id: string;
  bookingNumber?: string | null;
  hotelName?: string | null;
  hotelCode: string;
  checkIn: string;
  checkOut: string;
  status: string;
  totalPrice: number;
  discountedPrice?: number | null;
  currency: string;
  boardType?: string | null;
  /** API'nin çevirdiği görünen ad ("Sadece Oda"); kod yedek. */
  boardTypeName?: string | null;
  roomType?: string | null;
  guests?: unknown[] | null;
}

export interface ReservationCardProps {
  reservation: ReservationItem;
  className?: string;
}

/** "10 Eyl" ve "Per" — bilet hattının iki ucu için. */
function gunAy(tarih: string) {
  const d = new Date(tarih);
  if (Number.isNaN(d.getTime())) return { tarih: "", gun: "" };
  return {
    tarih: new Intl.DateTimeFormat("tr-TR", {
      day: "numeric",
      month: "short",
    }).format(d),
    gun: new Intl.DateTimeFormat("tr-TR", { weekday: "short" }).format(d),
  };
}

export function ReservationCard({
  reservation: r,
  className,
}: ReservationCardProps) {
  const geceler = getNightCount(r.checkIn, r.checkOut);
  const indirimli =
    r.discountedPrice != null && r.discountedPrice < r.totalPrice;
  const fiyat = indirimli ? (r.discountedPrice as number) : r.totalPrice;

  const giris = gunAy(r.checkIn);
  const cikis = gunAy(r.checkOut);
  const misafir = Array.isArray(r.guests) ? r.guests.length : null;
  const pansiyon = r.boardTypeName ?? r.boardType;

  return (
    <article className={className}>
      <Link
        href={`/reservations/${r.id}`}
        className="group block overflow-hidden rounded-2xl bg-paper shadow-[0_1px_2px_rgb(11_13_20/0.04),0_6px_16px_-12px_rgb(11_13_20/0.18)] transition-shadow hover:shadow-[0_10px_26px_-12px_rgb(11_13_20/0.28)] focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2 focus-visible:outline-none"
        aria-label={`Rezervasyon ${r.bookingNumber ?? r.id} — ${r.hotelName ?? r.hotelCode}`}
      >
        {/* Üst şerit — rezervasyon numarası ve durum, arkasında durum rengi */}
        <div className="relative">
          <div
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-0 bg-gradient-to-b to-transparent",
              statusTint(r.status)
            )}
          />
          <div className="relative px-4 pt-3.5 pb-3.5">
            <div className="flex items-center justify-between gap-3">
              <p className="min-w-0 truncate text-[13px] text-slate-text">
                Rezervasyon No:{" "}
                <span className="font-mono font-bold text-ink">
                  {r.bookingNumber ?? "—"}
                </span>
              </p>
              <StatusBadge status={r.status} />
            </div>
            {misafir !== null && (
              <p className="mt-1 text-[12.5px] text-slate-text/80">
                {misafir} misafir
              </p>
            )}
          </div>
        </div>

        <TicketPerforation />

        {/* Gövde */}
        <div className="px-4 pt-4 pb-3.5">
          <h3 className="truncate text-[15px] font-bold text-ink transition-colors group-hover:text-navy">
            {r.hotelName ?? r.hotelCode}
          </h3>
          {(r.roomType || pansiyon) && (
            <p className="mt-0.5 truncate text-[12.5px] text-muted">
              {[r.roomType, pansiyon].filter(Boolean).join(" · ")}
            </p>
          )}

          {/* Giriş — gece sayısı — çıkış */}
          <div className="mt-3.5 flex items-end justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10.5px] font-semibold tracking-[0.08em] text-muted uppercase">
                Giriş
              </p>
              <p className="mt-0.5 text-[17px] leading-none font-extrabold text-ink">
                {giris.tarih}
              </p>
              <p className="mt-1 text-[12px] text-muted">{giris.gun}</p>
            </div>

            <div className="flex shrink-0 flex-col items-center gap-1 pb-1">
              <div className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-line-strong" />
                <span className="h-px w-6 bg-line-strong" />
                <Moon className="size-3.5 text-navy" aria-hidden="true" />
                <span className="h-px w-6 bg-line-strong" />
                <span className="size-1.5 rounded-full bg-line-strong" />
              </div>
              <span className="text-[11.5px] font-semibold text-slate-text">
                {geceler} gece
              </span>
            </div>

            <div className="min-w-0 text-right">
              <p className="text-[10.5px] font-semibold tracking-[0.08em] text-muted uppercase">
                Çıkış
              </p>
              <p className="mt-0.5 text-[17px] leading-none font-extrabold text-ink">
                {cikis.tarih}
              </p>
              <p className="mt-1 text-[12px] text-muted">{cikis.gun}</p>
            </div>
          </div>
        </div>

        {/* Alt — fiyat */}
        <div className="flex items-center justify-between gap-3 border-t border-line/70 px-4 py-3">
          <div className="flex items-baseline gap-2">
            {indirimli && (
              <span className="text-[12px] text-muted line-through">
                {formatCurrency(r.totalPrice, r.currency)}
              </span>
            )}
            <span className="text-[17px] font-extrabold text-ink">
              {formatCurrency(fiyat, r.currency)}
            </span>
          </div>
          <ChevronRight
            className="size-5 shrink-0 text-muted transition-colors group-hover:text-navy"
            aria-hidden="true"
          />
        </div>
      </Link>
    </article>
  );
}
