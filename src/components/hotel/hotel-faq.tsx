"use client";

// Gezginlerden gelen sorular (Booking tarzı Q&A). Sorular otelin olanak ve
// politika verisinden türetilir; tıklanınca cevap açılır (accordion).

import * as React from "react";
import { ChevronDown, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { HotelFacilityItem, HotelPolicies } from "@/lib/royal-api/types";

export interface HotelFaqProps {
  facilities?: HotelFacilityItem[];
  policies?: HotelPolicies;
  className?: string;
}

export function HotelFaq({ facilities, policies, className }: HotelFaqProps) {
  const [open, setOpen] = React.useState<number | null>(null);

  const has = (name: string) =>
    (facilities ?? []).some((f) => f.name.toLowerCase().includes(name));

  const faqs = [
    policies?.checkInFrom
      ? {
          q: "Giriş ve çıkış saatleri nedir?",
          a: `Giriş ${policies.checkInFrom} itibarıyla yapılabilir, çıkış ise en geç ${policies.checkOutUntil} olarak belirlenmiştir.`,
        }
      : null,
    {
      q: "Bu tesiste otopark var mı?",
      a: has("otopark")
        ? "Evet, tesis bünyesinde konuklar için otopark bulunmaktadır."
        : "Tesiste özel otopark bulunmamaktadır; çevredeki genel otoparkları kullanabilirsiniz.",
    },
    {
      q: "Yüzme havuzu var mı?",
      a: has("havuz")
        ? "Evet, tesiste yüzme havuzu mevcuttur."
        : "Bu tesiste yüzme havuzu bulunmamaktadır.",
    },
    {
      q: "Ücretsiz Wi-Fi sunuluyor mu?",
      a: has("wi-fi")
        ? "Evet, tesisin tüm alanlarında ücretsiz Wi-Fi sunulmaktadır."
        : "Wi-Fi hizmetinin detayları için lütfen tesisle iletişime geçin.",
    },
    {
      q: "Evcil hayvan kabul ediliyor mu?",
      a: "Maalesef bu tesiste evcil hayvan kabul edilmemektedir.",
    },
    {
      q: "Kahvaltı sunuluyor mu?",
      a: has("restoran")
        ? "Evet, tesiste kahvaltı ve restoran hizmeti sunulmaktadır."
        : "Kahvaltı seçenekleri seçtiğiniz oda ve pansiyon tipine göre değişiklik gösterir.",
    },
  ].filter(Boolean) as { q: string; a: string }[];

  if (faqs.length === 0) return null;

  return (
    <section aria-labelledby="faq-heading" className={cn("space-y-4", className)}>
      <h2 id="faq-heading" className="text-lg font-semibold text-gray-900">
        Gezginlerden Gelen Sorular
      </h2>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {faqs.map((f, i) => (
          <div key={i} className="rounded-xl border border-gray-100 bg-white shadow-sm">
            <button
              type="button"
              onClick={() => setOpen(open === i ? null : i)}
              aria-expanded={open === i}
              className="flex w-full items-center gap-2 px-4 py-3 text-left"
            >
              <HelpCircle className="h-4 w-4 shrink-0 text-navy" aria-hidden="true" />
              <span className="flex-1 text-sm font-medium text-gray-800">{f.q}</span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 text-gray-400 transition-transform",
                  open === i && "rotate-180"
                )}
                aria-hidden="true"
              />
            </button>
            {open === i && (
              <p className="px-4 pb-3 pl-10 text-sm leading-relaxed text-gray-600">
                {f.a}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
