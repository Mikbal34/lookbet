"use client";

// iOS 26 tarzı yüzen kapsül alt çubuk — YALNIZCA tüketici (b2c)
// uygulamasında. Görünürlüğü `b2c-only` sınıfı yönetir; partner uygulaması
// kendi sekmelerini alacak, bu çubuğu değil.
//
// Genişlikten bağımsız: app modundaysan app tasarımını görürsün.
//
// "Hesabım" sekme olarak yok: hesaba üst kimlik çubuğundaki karşılama
// hapından giriliyor (bkz. app-header.tsx). Yardım ve yasal sayfalar
// "Daha Fazla" sekmesinde — app'te footer olmadığı için tek kapıları orası.
//
// Rezervasyon hunisinde (otel detayı, odalar, ödeme, kampanya detayı)
// gizleniyor: o sayfaların kendi sabit alt CTA'ları var ve üst üste
// binerlerdi.
//
// İKİ VARYANT — karşılaştırma için, seçim sonrası biri silinecek:
//   "sabit"   kapsül hep tam boy, etiketler hep görünür
//   "kuculen" aşağı kaydırınca etiketler düşer, kapsül daralır (Revolut)
// Geçiş: ?cubuk=kuculen

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck } from "@phosphor-icons/react/dist/csr/CalendarCheck";
import { DotsThree } from "@phosphor-icons/react/dist/csr/DotsThree";
import { MagnifyingGlass } from "@phosphor-icons/react/dist/csr/MagnifyingGlass";
import { Percent } from "@phosphor-icons/react/dist/csr/Percent";
import { cn } from "@/lib/utils/cn";

type Sekme = {
  href: string;
  etiket: string;
  ikon: React.ComponentType<{ size?: number; weight?: "regular" | "fill" }>;
  aktif: (yol: string) => boolean;
};

const SEKMELER: Sekme[] = [
  {
    href: "/",
    etiket: "Ara",
    ikon: MagnifyingGlass,
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
    ikon: DotsThree,
    aktif: (y) => y.startsWith("/daha-fazla"),
  },
];

function cubukGorunur(yol: string): boolean {
  if (yol.startsWith("/admin") || yol.startsWith("/agency")) return false;
  if (yol.startsWith("/hotel") || yol.startsWith("/booking")) return false;
  // /login ve /register bilerek DAHİL: girişsiz kullanıcı "Rezervasyonlar"a
  // dokunup buraya düştüğünde çubuk olmazsa geri dönecek hiçbir yolu kalmıyor
  // (bu sayfalarda geri bağlantısı yok ve app modunda hamburger de yok).
  if (/^\/reservations\/.+/.test(yol)) return false;
  // Kampanya listesi sekme sayfası; tek kampanya sayfasının kendi sabit
  // CTA'sı var, çubuk onun üstüne biniyordu.
  if (/^\/kampanyalar\/.+/.test(yol)) return false;
  return true;
}

export function AppTabBar() {
  const yol = usePathname() ?? "/";
  const [varyant, setVaryant] = React.useState<"sabit" | "kuculen">("sabit");
  const [kucuk, setKucuk] = React.useState(false);

  // Varyant seçimi URL'den; karşılaştırma bitince bu blok da gidecek.
  React.useEffect(() => {
    const v = new URLSearchParams(window.location.search).get("cubuk");
    if (v === "kuculen" || v === "sabit") setVaryant(v);
  }, [yol]);

  // Küçülen varyant: aşağı kaydırınca daral, yukarı kaydırınca aç.
  React.useEffect(() => {
    if (varyant !== "kuculen") return;
    let sonY = window.scrollY;
    const izle = () => {
      const y = window.scrollY;
      if (Math.abs(y - sonY) > 6) {
        setKucuk(y > sonY && y > 80);
        sonY = y;
      }
    };
    window.addEventListener("scroll", izle, { passive: true });
    return () => window.removeEventListener("scroll", izle);
  }, [varyant]);

  if (!cubukGorunur(yol)) return null;
  const daralt = varyant === "kuculen" && kucuk;

  return (
    <>
      {/* İçerik kapsülün altında kalmasın diye ayrılan yer. Kapsül daralsa da
          sabit kalıyor: sayfa sonunda zıplama olmasın. */}
      <div
        className="b2c-only h-[calc(5.5rem+env(safe-area-inset-bottom))]"
        aria-hidden="true"
      />

      <nav
        aria-label="Ana gezinme"
        className={cn(
          "b2c-only fixed inset-x-4 z-40 mx-auto max-w-md",
          "bottom-[calc(0.75rem+env(safe-area-inset-bottom))]",
          // Buzlu kapsül. Gerçek saydamlık metni okunmaz yapıyor; yoğun
          // tint + bulanıklık Apple'ın kendi çözümü de.
          "rounded-full border border-ink/5 bg-white/85 backdrop-blur-xl",
          "shadow-[0_8px_28px_-6px_rgb(11_13_20/0.28)]",
          "transition-all duration-300 ease-out"
        )}
      >
        <ul className="flex items-stretch">
          {SEKMELER.map((s) => {
            const aktif = s.aktif(yol);
            const Ikon = s.ikon;
            return (
              <li key={s.href} className="flex-1">
                <Link
                  href={s.href}
                  aria-current={aktif ? "page" : undefined}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 px-1",
                    "text-[10px] font-semibold leading-none transition-colors",
                    daralt ? "h-12" : "h-16",
                    aktif ? "text-navy" : "text-muted active:text-ink"
                  )}
                >
                  <Ikon size={24} weight={aktif ? "fill" : "regular"} />
                  <span
                    className={cn(
                      "max-w-full truncate transition-all duration-200",
                      daralt
                        ? "h-0 overflow-hidden opacity-0"
                        : "h-[10px] opacity-100"
                    )}
                  >
                    {s.etiket}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
