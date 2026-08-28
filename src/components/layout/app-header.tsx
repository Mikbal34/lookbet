"use client";

// Uygulama kimlik çubuğu — kampanya karuselinin ÜSTÜNE binen saydam şerit.
//
// Karuselin üstündeyken saydam: yalnızca yukarıdan aşağı hafifleyen bir
// karartma var, altındaki görsel görünmeye devam ediyor. Kullanıcı karuseli
// geçtiğinde altına beyaz içerik geliyor ve beyaz metin okunmaz hâle
// gelirdi; o yüzden kaydırma eşiği aşılınca çubuk dolu turuncuya dönüyor.
//
// Karşılama hapı hesabın kapısı: alt sekme çubuğunda "Hesabım" sekmesi yok
// (bkz. app-tab-bar.tsx).
//
// Yalnızca b2c uygulamasında görünür; web'de yerini normal Navbar alıyor.

import * as React from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ChevronRight, CircleUserRound } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Logo } from "./logo";

/** Karuselin altına inildiği kabul edilen kaydırma miktarı (px). */
const ESIK = 150;

export function AppHeader() {
  const { data: session, status } = useSession();
  const [kaydi, setKaydi] = React.useState(false);

  React.useEffect(() => {
    const izle = () => setKaydi(window.scrollY > ESIK);
    window.addEventListener("scroll", izle, { passive: true });
    return () => window.removeEventListener("scroll", izle);
  }, []);

  const ad = session?.user?.name;

  return (
    <header
      className={cn(
        "b2c-only sticky top-0 z-30 pt-[env(safe-area-inset-top)] transition-colors duration-200",
        kaydi ? "bg-navy" : "bg-gradient-to-b from-ink/35 to-transparent"
      )}
    >
      <div className="flex items-center gap-3 px-4 py-2">
        {/* Logo kendi bağlantısını üretiyor; <Link> ile sarmak iç içe
            anchor olurdu. */}
        <Logo href="/" variant="light" size="sm" />

        <Link
          href="/profile"
          className="ml-auto flex min-h-11 min-w-0 items-center gap-1.5 rounded-full bg-white/20 py-1.5 pr-1.5 pl-2.5 text-white backdrop-blur-sm active:bg-white/30"
        >
          <CircleUserRound className="size-[18px] shrink-0" aria-hidden="true" />
          <span className="min-w-0 truncate text-[12.5px] font-semibold">
            {status === "authenticated" && ad ? ad : "Giriş yap"}
          </span>
          <ChevronRight
            className="size-3.5 shrink-0 opacity-70"
            aria-hidden="true"
          />
        </Link>
      </div>
    </header>
  );
}
