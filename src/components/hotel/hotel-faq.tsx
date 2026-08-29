"use client";

// Gezginlerden gelen sorular (Booking tarzı Q&A). Sorular otelin olanak ve
// politika verisinden türetilir; tıklanınca cevap açılır (accordion).

import * as React from "react";
import { ChevronDown, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { LbYardim } from "@/components/ui/icons";
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
    <section
      aria-labelledby="faq-heading"
      className={cn("space-y-4", className)}
    >
      <h2
        id="faq-heading"
        className="flex items-center gap-2 text-[15px] font-extrabold text-ink"
      >
        <LbYardim size={18} className="text-navy" />
        Sık sorulanlar
      </h2>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {faqs.map((f, i) => (
          <div
            key={i}
            className="rounded-2xl bg-paper shadow-[0_1px_2px_rgb(11_13_20/0.04),0_6px_16px_-12px_rgb(11_13_20/0.18)]"
          >
            <button
              type="button"
              onClick={() => setOpen(open === i ? null : i)}
              aria-expanded={open === i}
              className="flex w-full items-center gap-2 px-4 py-3 text-left"
            >
              <HelpCircle
                className="h-4 w-4 shrink-0 text-navy"
                aria-hidden="true"
              />
              <span className="flex-1 text-sm font-medium text-ink">{f.q}</span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 text-muted transition-transform",
                  open === i && "rotate-180",
                )}
                aria-hidden="true"
              />
            </button>
            {open === i && (
              <p className="px-4 pb-3 pl-10 text-sm leading-relaxed text-slate-text">
                {f.a}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
