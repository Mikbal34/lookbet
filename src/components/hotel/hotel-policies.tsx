"use client";

// Tesis kuralları: check-in/out, iptal & ön ödeme, çocuk koşulları,
// kabul edilen kartlar ve önemli notlar.

import * as React from "react";
import {
  LogIn,
  LogOut,
  Baby,
  Info,
  CreditCard,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { LbBelge } from "@/components/ui/icons";
import type { HotelPolicies } from "@/lib/royal-api/types";

// Kart markası logoları (basit, tanınır temsili görseller)
function CardLogo({ card }: { card: string }) {
  const key = card.toLowerCase();
  const box = "h-7 w-11 shrink-0 rounded border border-line";

  if (key.includes("visa")) {
    return (
      <svg
        viewBox="0 0 48 32"
        className={cn(box, "bg-white")}
        role="img"
        aria-label="Visa"
      >
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
      <svg
        viewBox="0 0 48 32"
        className={cn(box, "bg-white")}
        role="img"
        aria-label="Mastercard"
      >
        <circle cx="20" cy="16" r="9" fill="#EB001B" />
        <circle cx="28" cy="16" r="9" fill="#F79E1B" fillOpacity="0.85" />
      </svg>
    );
  }
  if (key.includes("american") || key.includes("amex")) {
    return (
      <svg
        viewBox="0 0 48 32"
        className={cn(box, "border-[#2E77BC] bg-[#2E77BC]")}
        role="img"
        aria-label="American Express"
      >
        {/* Kısa form: uzun ad 48×32 kutuya ancak 5.5px ile sığıyordu ve o
            boyutta hiç okunmuyor. "AMEX" markanın kendi kısaltması. */}
        <text
          x="24"
          y="20"
          textAnchor="middle"
          fill="white"
          fontSize="11"
          fontWeight="bold"
          letterSpacing="0.5"
          fontFamily="Arial, sans-serif"
        >
          AMEX
        </text>
      </svg>
    );
  }
  return (
    <span className="rounded border border-line bg-canvas px-2 py-1 text-xs font-medium text-slate-text">
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
    <div className="flex gap-3 border-b border-line/60 py-3 last:border-0">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-navy" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink">{label}</p>
        <div className="mt-0.5 text-sm text-slate-text">{children}</div>
      </div>
    </div>
  );
}

export interface HotelPoliciesProps {
  policies?: HotelPolicies;
  className?: string;
}

export function HotelPoliciesSection({
  policies,
  className,
}: HotelPoliciesProps) {
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
    <section
      aria-labelledby="policies-heading"
      className={cn("space-y-4", className)}
    >
      <h2
        id="policies-heading"
        className="flex items-center gap-2 text-[15px] font-extrabold text-ink"
      >
        <LbBelge size={18} className="text-navy" />
        Tesis kuralları
      </h2>

      <div className="rounded-2xl bg-paper p-4 shadow-[0_1px_2px_rgb(11_13_20/0.04),0_6px_16px_-12px_rgb(11_13_20/0.18)]">
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
        <div className="rounded-2xl bg-paper p-4 shadow-[0_1px_2px_rgb(11_13_20/0.04),0_6px_16px_-12px_rgb(11_13_20/0.18)]">
          <h3 className="mb-2 flex items-center gap-1.5 text-[15px] font-extrabold text-ink">
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            Şu ayrıntılara dikkat
          </h3>
          <ul className="space-y-1.5">
            {importantInfo.map((info, i) => (
              <li key={i} className="flex gap-2 text-[13.5px] text-slate-text">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-navy" />
                {info}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
