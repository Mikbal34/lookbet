"use client";

// Bilet perforasyonu — kesikli ayraç ve iki yanda çentik.
//
// Çentikler sayfanın zemin rengiyle (varsayılan: bg-canvas) boyanmış
// yarım daireler; kartın
// kenarındaki çizgiyi tam o noktada kesip ısırık izlenimi veriyor. Bu yüzden
// `zemin`, kartın üstünde durduğu yüzeyin rengiyle aynı olmalı — beyaz bir
// yüzeye konursa çentikler gri leke gibi görünür.
//
// Ayraç Tailwind'in border-dashed'i değil: orada tarayıcı tireleri kutuya tam
// sığdırmak için esnetiyor ve her kart genişliğinde farklı ritim çıkıyor.
// repeating-linear-gradient'te tire ve boşluk sabit.
//
// Yüksekliği sıfır: kartın kendi dolgusunu bozmadan iki bloğun arasına girer.

import { cn } from "@/lib/utils/cn";

export interface TicketPerforationProps {
  /** Kartın üstünde durduğu yüzeyin rengi. */
  zemin?: string;
  className?: string;
}

export function TicketPerforation({
  zemin = "bg-canvas",
  className,
}: TicketPerforationProps) {
  return (
    <div className={cn("relative h-0", className)} aria-hidden="true">
      <span className={cn("absolute -top-2 -left-2 size-4 rounded-full", zemin)} />
      <span className={cn("absolute -top-2 -right-2 size-4 rounded-full", zemin)} />
      <div className="mx-3.5 h-px bg-[repeating-linear-gradient(to_right,var(--color-line-strong)_0_4px,transparent_4px_8px)]" />
    </div>
  );
}
