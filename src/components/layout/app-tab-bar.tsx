"use client";

// Booking tarzı alt sekme çubuğu — YALNIZCA tüketici (b2c) uygulamasında.
// Görünürlüğü `b2c-only` sınıfı yönetir (bkz. src/lib/utils/app-mode.ts);
// partner uygulaması kendi sekmelerini alacak, bu çubuğu değil.
// tarayıcıdan giren mobil kullanıcı mevcut hamburger menüyü kullanmaya
// devam eder. Booking'in kendisi de böyle: mobil sitesinde sekme çubuğu yok,
// uygulamasında var.
//
// Genişlikten bağımsız: app modundaysan app tasarımını görürsün.
//
// Rezervasyon hunisinde (otel detayı, odalar, ödeme) bilerek gizleniyor:
// o sayfaların kendi sabit alt CTA'ları var ve üst üste binerlerdi. Huniye
// girince tek eylem kalması zaten istenen davranış.
//
// "Hesabım" sekme olarak yok: hesaba üst kimlik çubuğundaki karşılama
// hapından giriliyor (bkz. app-header.tsx). Yardım ve yasal sayfalar ise
// "Daha Fazla" sekmesinde — app'te footer olmadığı için tek kapıları orası.

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck, MoreHorizontal, Percent, Search } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type Sekme = {
  href: string;
  etiket: string;
  ikon: React.ComponentType<{ className?: string }>;
  aktif: (yol: string) => boolean;
};

const SEKMELER: Sekme[] = [
  {
    href: "/",
    etiket: "Ara",
    ikon: Search,
    aktif: (y) => y === "/" || y.startsWith("/search"),
  },
  {
    href: "/kampanyalar",
    etiket: "Kampanyalar",
    ikon: Percent,
    aktif: (y) => y.startsWith("/kampanyalar"),
  },
  {
    href: "/reservations",
    etiket: "Rezervasyonlar",
    ikon: CalendarCheck,
    aktif: (y) => y.startsWith("/reservations"),
  },
  {
    href: "/daha-fazla",
    etiket: "Daha Fazla",
    ikon: MoreHorizontal,
    aktif: (y) => y.startsWith("/daha-fazla"),
  },
];

/**
 * Çubuk hangi sayfalarda görünsün?
 * Huni sayfaları ve panel rotaları dışarıda; kalan her şeyde görünür.
 */
function cubukGorunur(yol: string): boolean {
  if (yol.startsWith("/admin") || yol.startsWith("/agency")) return false;
  if (yol.startsWith("/hotel") || yol.startsWith("/booking")) return false;
  // /login ve /register bilerek DAHİL: girişsiz kullanıcı "Rezervasyonlar"a
  // dokunup buraya düştüğünde çubuk olmazsa geri dönecek hiçbir yolu kalmıyor
  // (bu sayfalarda geri bağlantısı yok ve app modunda hamburger de yok).
  // Rezervasyon listesi görünür, tek rezervasyon detayı gizli.
  if (/^\/reservations\/.+/.test(yol)) return false;
  return true;
}

export function AppTabBar() {
  const yol = usePathname() ?? "/";
  if (!cubukGorunur(yol)) return null;

  return (
    // Her iki parça da b2c-only: biri çubuğun kendisi, diğeri içeriğin
    // çubuğun altında kalmaması için ayırdığı yer.
    <>
      <div
        className="b2c-only h-[calc(3.5rem+env(safe-area-inset-bottom))]"
        aria-hidden="true"
      />
      <nav
        aria-label="Ana gezinme"
        className={cn(
          "b2c-only fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 backdrop-blur",
          "pb-[env(safe-area-inset-bottom)]"
        )}
      >
        <ul className="flex h-14 items-stretch">
          {SEKMELER.map((s) => {
            const aktif = s.aktif(yol);
            const Ikon = s.ikon;
            return (
              <li key={s.href} className="flex-1">
                <Link
                  href={s.href}
                  aria-current={aktif ? "page" : undefined}
                  className={cn(
                    "flex h-full flex-col items-center justify-center gap-1 px-1",
                    "text-[10px] font-semibold leading-none transition-colors",
                    aktif ? "text-navy" : "text-muted active:text-ink"
                  )}
                >
                  <Ikon
                    className={cn("size-[22px]", aktif && "stroke-[2.5]")}
                  />
                  <span className="max-w-full truncate">{s.etiket}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
