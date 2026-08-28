"use client";

// Uygulama kimlik çubuğu — Pegasus'taki gibi kaydırınca da yerinde kalan
// turuncu üst şerit: solda logo, sağda karşılama hapı.
//
// Karşılama hapı hesabın kapısı: alt sekme çubuğunda "Hesabım" sekmesi yok,
// hesaba buradan giriliyor (bkz. app-tab-bar.tsx).
//
// Yalnızca b2c uygulamasında görünür; web'de yerini normal Navbar alıyor.

import * as React from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ChevronRight, CircleUserRound } from "lucide-react";
import { Logo } from "./logo";

export function AppHeader() {
  const { data: session, status } = useSession();
  const ad = session?.user?.name;

  return (
    <header className="b2c-only sticky top-0 z-30 bg-navy pt-[env(safe-area-inset-top)]">
      <div className="flex items-center gap-3 px-4 py-2.5">
        {/* Logo kendi bağlantısını üretiyor; <Link> ile sarmak iç içe
            anchor olurdu. */}
        <Logo href="/" variant="light" size="sm" />

        <Link
          href="/profile"
          className="ml-auto flex min-h-11 min-w-0 items-center gap-2 rounded-full bg-white/15 py-1.5 pr-2 pl-3 text-white active:bg-white/25"
        >
          <CircleUserRound className="size-5 shrink-0" aria-hidden="true" />
          <span className="min-w-0 truncate text-[13px] font-semibold">
            {/* Oturum yüklenirken isim yerine boşluk yazmak yerine nötr
                metinde kalıyoruz; hap sonradan yerinden oynamasın. */}
            {status === "authenticated" && ad
              ? `Hoş geldin, ${ad}`
              : "Giriş yap"}
          </span>
          <ChevronRight className="size-4 shrink-0 opacity-70" aria-hidden="true" />
        </Link>
      </div>
    </header>
  );
}
