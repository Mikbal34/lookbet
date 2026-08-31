"use client";

// Bölüm kutusu ve başlığı — rezervasyon ve otel ekranlarının ortak kabuğu.
//
// Kutuyu çerçeve değil zemin farkı yapıyor: sayfa bej (bg-canvas), kartlar
// beyaz. Beyaz sayfaya çerçeveli kart koyunca ekran çizgi kalabalığına
// dönüyor; zemin ayrımıyla tek bir çizgi bile gerekmiyor. Gölge çok hafif —
// kartı zeminden koparmak değil, kenarını belli etmek için.
//
// Başlık kalın ve koyu yazılır: 15px/800/ink, yanında kendi ikon setimizden
// bir işaret, marka turuncusunda. İkonun arkasında rozet zemini yok — kart
// zaten beyaz bir kutu, içine ikinci bir kutu koymak kalabalık.
//
// Başlıklar cümle düzeninde: "İptal koşulları", "İptal Koşulları" değil. Her
// kelimeyi büyük harfle başlatmak İngilizce geleneği; Türkçe arayüzde makine
// çevirisi gibi okunuyor.

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import type { IkonProps } from "./icons";

/** Kart gölgesi — bölüm kutuları ve onlarla aynı katmandaki öğeler için. */
export const BOLUM_GOLGE =
  "shadow-[0_1px_2px_rgb(11_13_20/0.04),0_6px_16px_-12px_rgb(11_13_20/0.18)]";

export interface BaslikProps {
  ikon?: React.ComponentType<IkonProps>;
  className?: string;
  children: React.ReactNode;
}

export function Baslik({ ikon: Ikon, className, children }: BaslikProps) {
  return (
    <h2
      className={cn(
        "mb-3 flex items-center gap-2 text-[15px] font-extrabold text-ink",
        className
      )}
    >
      {Ikon && <Ikon size={18} className="text-navy" />}
      {children}
    </h2>
  );
}

export interface BolumProps {
  baslik?: string;
  ikon?: React.ComponentType<IkonProps>;
  /** Başlığı kendisi yazan bölümler için (ör. içinde id taşıyan h2). */
  baslikYok?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function Bolum({
  baslik,
  ikon,
  baslikYok = false,
  className,
  children,
}: BolumProps) {
  return (
    <section className={cn("rounded-2xl bg-paper p-4", BOLUM_GOLGE, className)}>
      {!baslikYok && baslik && <Baslik ikon={ikon}>{baslik}</Baslik>}
      {children}
    </section>
  );
}
