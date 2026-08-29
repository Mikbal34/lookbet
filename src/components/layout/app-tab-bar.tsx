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
// Aşağı kaydırınca kapsül iki boyutta birden büzülüyor (358x66 -> 216x50) ve
// etiketler düşüyor; yukarı kaydırınca geri açılıyor. iOS 26'nın kendi
// davranışı çubuğu tek ikona indiriyor — o kısım bilerek alınmadı, gezinmeyi
// tamamen gizliyor.

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LbAra,
  LbDahaFazla,
  LbTakvim,
  LbYuzde,
  type IkonProps,
} from "@/components/ui/icons";
import { cn } from "@/lib/utils/cn";

type Sekme = {
  href: string;
  etiket: string;
  ikon: React.ComponentType<IkonProps>;
  aktif: (yol: string) => boolean;
};

const SEKMELER: Sekme[] = [
  {
    href: "/",
    etiket: "Ara",
    ikon: LbAra,
    aktif: (y) => y === "/" || y.startsWith("/search"),
  },
  {
    href: "/kampanyalar",
    etiket: "Kampanyalar",
    ikon: LbYuzde,
    aktif: (y) => y.startsWith("/kampanyalar"),
  },
  {
    href: "/reservations",
    etiket: "Rezervasyonlar",
    ikon: LbTakvim,
    aktif: (y) => y.startsWith("/reservations"),
  },
  {
    href: "/daha-fazla",
    etiket: "Daha Fazla",
    ikon: LbDahaFazla,
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
  const [daralt, setDaralt] = React.useState(false);

  // Aşağı kaydırınca daral, yukarı kaydırınca aç.
  React.useEffect(() => {
    let sonY = window.scrollY;
    const izle = () => {
      const y = window.scrollY;
      if (Math.abs(y - sonY) > 6) {
        setDaralt(y > sonY && y > 80);
        sonY = y;
      }
    };
    window.addEventListener("scroll", izle, { passive: true });
    return () => window.removeEventListener("scroll", izle);
  }, []);

  if (!cubukGorunur(yol)) return null;

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
          "b2c-only fixed inset-x-0 z-40 mx-auto",
          "bottom-[calc(0.75rem+env(safe-area-inset-bottom))]",
          // Daralınca hem yükseklik hem genişlik iniyor; kapsül ortadan
          // büzülüyor. Ortalama için inset-x-0 + mx-auto şart: inset-x-4 ile
          // genişlik animasyonu soldan başlıyordu.
          daralt ? "w-[13.5rem]" : "w-[calc(100%-2rem)] max-w-md",
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
            // min-w-0: etiket metni min-content genişliği dayatıyor,
            // flex-1 tek başına sekmeleri eşitleyemiyordu.
            return (
              <li key={s.href} className="min-w-0 flex-1">
                <Link
                  href={s.href}
                  aria-current={aktif ? "page" : undefined}
                  className={cn(
                    // w-full şart: etiket düşünce bağlantı ikona göre
                    // büzülüyor ve dokunma hedefi 24px'e iniyordu.
                    "flex w-full flex-col items-center justify-center gap-1 px-1",
                    "text-[10px] font-semibold leading-none transition-colors",
                    daralt ? "h-12" : "h-16",
                    aktif ? "text-navy" : "text-muted active:text-ink"
                  )}
                >
                  <Ikon
                    size={daralt ? 22 : 24}
                    strokeWidth={aktif ? 2.75 : 2}
                  />
                  <span
                    className={cn(
                      "max-w-full truncate transition-all duration-200",
                      daralt
                        ? "h-0 w-0 overflow-hidden opacity-0"
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
