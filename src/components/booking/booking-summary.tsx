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
  Hotel,
  CalendarDays,
  Moon,
  UtensilsCrossed,
  User,
  Mail,
  Phone,
  Tag,
} from "lucide-react";
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
      <Icon className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        {label && <p className="text-xs text-gray-400 leading-none mb-0.5">{label}</p>}
        <p className={cn("text-sm text-gray-700 font-medium leading-snug", valueClass)}>
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
        "bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden sticky top-24",
        className
      )}
      aria-label="Rezervasyon ozeti"
    >
      {/* Header */}
      <div className="bg-blue-600 px-5 py-4">
        <h2 className="text-white font-semibold text-base">Rezervasyon Ozeti</h2>
      </div>

      <div className="p-5 space-y-5">
        {/* Hotel + Room info */}
        <div className="space-y-3">
          {hotelName && (
            <SummaryRow icon={Hotel} label="Otel" value={hotelName} />
          )}
          {roomType && (
            <SummaryRow icon={Hotel} label="Oda tipi" value={roomType} />
          )}
          {boardType && (
            <SummaryRow icon={UtensilsCrossed} label="Pansiyon" value={boardType} />
          )}
        </div>

        <hr className="border-gray-100" />

        {/* Dates */}
        <div className="space-y-3">
          <SummaryRow
            icon={CalendarDays}
            label="Tarihler"
            value={`${formatDate(checkIn)} - ${formatDate(checkOut)}`}
          />
          <SummaryRow
            icon={Moon}
            label="Konaklama suresi"
            value={`${nights} gece`}
          />
        </div>

        {/* Contact info */}
        {contact && (
          <>
            <hr className="border-gray-100" />
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Iletisim
              </p>
              <SummaryRow
                icon={User}
                value={`${contact.name} ${contact.surname}`}
              />
              {contact.email && (
                <SummaryRow icon={Mail} value={contact.email} />
              )}
              {contact.phone && (
                <SummaryRow icon={Phone} value={contact.phone} />
              )}
            </div>
          </>
        )}

        {/* Price breakdown */}
        <hr className="border-gray-100" />
        <div className="space-y-2">
          {hasDiscount && (
            <>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">Liste fiyati</span>
                <span className="text-gray-400 line-through">
                  {formatCurrency(originalPrice, currency)}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-green-600 font-medium flex items-center gap-1">
                  <Tag className="h-3.5 w-3.5" aria-hidden="true" />
                  Indirim
                </span>
                <span className="text-green-600 font-semibold">
                  -{formatCurrency(discount, currency)}
                </span>
              </div>
            </>
          )}
          <div className="flex justify-between items-center pt-2 border-t border-dashed border-gray-200">
            <span className="text-sm font-bold text-gray-900">Toplam</span>
            <span className="text-xl font-bold text-blue-600">
              {formatCurrency(finalPrice, currency)}
            </span>
          </div>
          {hasDiscount && (
            <p className="text-xs text-green-600 text-right">
              {formatCurrency(discount, currency)} tasarruf ettiniz
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}
