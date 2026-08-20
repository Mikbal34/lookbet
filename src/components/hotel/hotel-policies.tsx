"use client";

// Tesis kuralları: check-in/out, iptal & ön ödeme, çocuk koşulları,
// kabul edilen kartlar ve önemli notlar.

import * as React from "react";
import { LogIn, LogOut, Baby, Info, CreditCard, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { HotelPolicies } from "@/lib/royal-api/types";

// Kart markası logoları (basit, tanınır temsili görseller)
function CardLogo({ card }: { card: string }) {
  const key = card.toLowerCase();
  const box = "h-7 w-11 shrink-0 rounded border border-gray-200";

  if (key.includes("visa")) {
    return (
      <svg viewBox="0 0 48 32" className={cn(box, "bg-white")} role="img" aria-label="Visa">
        <text
          x="24"
          y="21"
          textAnchor="middle"
          fill="#1a1f71"
          fontSize="13"
          fontWeight="bold"
          fontStyle="italic"
          fontFamily="Arial, sans-serif"
        >
          VISA
        </text>
      </svg>
    );
  }
  if (key.includes("master")) {
    return (
      <svg viewBox="0 0 48 32" className={cn(box, "bg-white")} role="img" aria-label="Mastercard">
        <circle cx="20" cy="16" r="9" fill="#EB001B" />
        <circle cx="28" cy="16" r="9" fill="#F79E1B" fillOpacity="0.85" />
      </svg>
    );
  }
  if (key.includes("american") || key.includes("amex")) {
    return (
      <svg viewBox="0 0 48 32" className={cn(box, "border-[#2E77BC] bg-[#2E77BC]")} role="img" aria-label="American Express">
        <text x="24" y="14" textAnchor="middle" fill="white" fontSize="5.5" fontWeight="bold" fontFamily="Arial, sans-serif">
          AMERICAN
        </text>
        <text x="24" y="22" textAnchor="middle" fill="white" fontSize="5.5" fontWeight="bold" fontFamily="Arial, sans-serif">
          EXPRESS
        </text>
      </svg>
    );
  }
  return (
    <span className="rounded border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-medium text-gray-700">
      {card}
    </span>
  );
}

function Row({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 border-b border-gray-50 py-3 last:border-0">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-navy" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-900">{label}</p>
        <div className="mt-0.5 text-sm text-gray-600">{children}</div>
      </div>
    </div>
  );
}

export interface HotelPoliciesProps {
  policies?: HotelPolicies;
  className?: string;
}

export function HotelPoliciesSection({ policies, className }: HotelPoliciesProps) {
  if (!policies) return null;

  const {
    checkInFrom,
    checkOutUntil,
    cancellationText,
    childrenText,
    acceptedCards,
    importantInfo,
  } = policies;

  return (
    <section aria-labelledby="policies-heading" className={cn("space-y-4", className)}>
      <h2 id="policies-heading" className="text-lg font-semibold text-gray-900">
        Tesis Kuralları
      </h2>

      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        {(checkInFrom || checkOutUntil) && (
          <div className="grid grid-cols-1 sm:grid-cols-2">
            {checkInFrom && (
              <Row icon={LogIn} label="Giriş (Check-in)">
                {checkInFrom} itibarıyla
              </Row>
            )}
            {checkOutUntil && (
              <Row icon={LogOut} label="Çıkış (Check-out)">
                {checkOutUntil} itibarıyla en geç
              </Row>
            )}
          </div>
        )}

        {cancellationText && (
          <Row icon={Info} label="İptal / Ön Ödeme">
            {cancellationText}
          </Row>
        )}

        {childrenText && (
          <Row icon={Baby} label="Çocuklar ve Yataklar">
            {childrenText}
          </Row>
        )}

        {acceptedCards && acceptedCards.length > 0 && (
          <Row icon={CreditCard} label="Kabul Edilen Kartlar">
            <div className="flex flex-wrap items-center gap-2">
              {acceptedCards.map((card) => (
                <CardLogo key={card} card={card} />
              ))}
            </div>
          </Row>
        )}
      </div>

      {importantInfo && importantInfo.length > 0 && (
        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5">
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-amber-900">
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            Şu ayrıntılara dikkat
          </h3>
          <ul className="space-y-1.5">
            {importantInfo.map((info, i) => (
              <li key={i} className="flex gap-2 text-sm text-amber-800">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-400" />
                {info}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
