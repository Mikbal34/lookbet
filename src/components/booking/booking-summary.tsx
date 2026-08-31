"use client";

// Usage:
// <BookingSummary
//   bookingData={{
//     hotelName: "Rixos Premium Belek",
//     roomType: "Deluxe Room",
//     boardType: "All Inclusive",
//     checkIn: "2026-03-01",
//     checkOut: "2026-03-07",
//     originalPrice: 1200,
//     finalPrice: 960,
//     discount: 240,
//     currency: "EUR",
//     contact: { name: "Ahmet", surname: "Yilmaz", email: "a@b.com", phone: "+905001234567" }
//   }}
// />

import * as React from "react";
import {
  LbAy,
  LbBelge,
  LbEtiket,
  LbBina,
  LbKullanici,
  LbPansiyon,
  LbTakvimDuz,
  LbTelefon,
  LbYatak,
  LbZarf,
} from "@/components/ui/icons";
import { cn } from "@/lib/utils/cn";
import { formatCurrency, formatDate, getNightCount } from "@/lib/utils";

export interface BookingContactSummary {
  name: string;
  surname: string;
  email: string;
  phone: string;
}

export interface BookingData {
  hotelName?: string;
  roomType?: string;
  boardType?: string;
  checkIn: string;
  checkOut: string;
  originalPrice: number;
  finalPrice: number;
  discount?: number;
  currency?: string;
  contact?: BookingContactSummary;
}

export interface BookingSummaryProps {
  bookingData: BookingData;
  className?: string;
}

function SummaryRow({
  icon: Icon,
  label,
  value,
  valueClass,
}: {
  icon: React.ElementType;
  label?: string;
  value: React.ReactNode;
  valueClass?: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-navy" aria-hidden="true" />
      <div className="min-w-0">
        {label && <p className="mb-0.5 text-xs leading-none text-muted">{label}</p>}
        <p className={cn("text-sm text-ink font-medium leading-snug", valueClass)}>
          {value}
        </p>
      </div>
    </div>
  );
}

export function BookingSummary({ bookingData, className }: BookingSummaryProps) {
  const {
    hotelName,
    roomType,
    boardType,
    checkIn,
    checkOut,
    originalPrice,
    finalPrice,
    discount = 0,
    currency = "EUR",
    contact,
  } = bookingData;

  const nights = getNightCount(checkIn, checkOut);
  const hasDiscount = discount > 0;

  return (
    <aside
      className={cn(
        "sticky top-24 overflow-hidden rounded-2xl bg-paper shadow-[0_1px_2px_rgb(11_13_20/0.04),0_6px_16px_-12px_rgb(11_13_20/0.18)]",
        className
      )}
      aria-label="Rezervasyon özeti"
    >
      {/* Header */}
      <div className="px-4 pt-4">
        <h2 className="flex items-center gap-2 text-[15px] font-extrabold text-ink">
          <LbBelge size={18} className="text-navy" />
          Rezervasyon özeti
        </h2>
      </div>

      <div className="p-5 space-y-5">
        {/* Hotel + Room info */}
        <div className="space-y-3">
          {hotelName && (
            <SummaryRow icon={LbBina} label="Otel" value={hotelName} />
          )}
          {roomType && (
            <SummaryRow icon={LbYatak} label="Oda tipi" value={roomType} />
          )}
          {boardType && (
            <SummaryRow icon={LbPansiyon} label="Pansiyon" value={boardType} />
          )}
        </div>

        <hr className="border-line/60" />

        {/* Dates */}
        <div className="space-y-3">
          <SummaryRow
            icon={LbTakvimDuz}
            label="Tarihler"
            value={`${formatDate(checkIn)} - ${formatDate(checkOut)}`}
          />
          <SummaryRow
            icon={LbAy}
            label="Konaklama süresi"
            value={`${nights} gece`}
          />
        </div>

        {/* Contact info */}
        {contact && (
          <>
            <hr className="border-line/60" />
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted uppercase tracking-wide">
                İletişim
              </p>
              <SummaryRow
                icon={LbKullanici}
                value={`${contact.name} ${contact.surname}`}
              />
              {contact.email && (
                <SummaryRow icon={LbZarf} value={contact.email} />
              )}
              {contact.phone && (
                <SummaryRow icon={LbTelefon} value={contact.phone} />
              )}
            </div>
          </>
        )}

        {/* Price breakdown */}
        <hr className="border-line/60" />
        <div className="space-y-2">
          {hasDiscount && (
            <>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted">Liste fiyatı</span>
                <span className="text-muted line-through">
                  {formatCurrency(originalPrice, currency)}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gold-text font-medium flex items-center gap-1">
                  <LbEtiket size={14} />
                  İndirim
                </span>
                <span className="text-gold-text font-semibold">
                  -{formatCurrency(discount, currency)}
                </span>
              </div>
            </>
          )}
          <div className="flex justify-between items-center pt-2 border-t border-dashed border-gray-200">
            <span className="text-sm font-bold text-ink">Toplam</span>
            <span className="text-xl font-bold text-navy">
              {formatCurrency(finalPrice, currency)}
            </span>
          </div>
          {hasDiscount && (
            <p className="text-xs text-gold-text text-right">
              {formatCurrency(discount, currency)} tasarruf ettiniz
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}
