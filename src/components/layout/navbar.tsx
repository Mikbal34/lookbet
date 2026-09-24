"use client";

// LookBeds üst bar — CruiseScanner (Skyscanner-tarzı) tasarımın turuncu hali:
// dümdüz tek renk marka bandı, beyaz nav linkleri, outline auth butonları.
// Acente kullanıcısı sitenin neresinde olursa olsun panel header'ını görür.

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import {
  Menu,
  X,
  CircleUserRound,
  LogOut,
  LayoutDashboard,
  CalendarCheck,
  ChevronDown,
} from "lucide-react";
import { Logo } from "./logo";
import { AgencyHeader } from "./agency-header";
import { LocaleSwitcher } from "./locale-switcher";

const navLinkCls =
  "text-[15px] font-semibold tracking-[-0.005em] text-white/90 hover:text-white transition-colors";
const ghostBtnCls =
  "inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-[14.5px] font-semibold text-white/90 hover:bg-white/10 hover:text-white transition-colors";
const outlineBtnCls =
  "ml-1 inline-flex items-center gap-1.5 rounded-md border border-white/35 bg-transparent px-4 py-2 text-[14.5px] font-semibold text-white hover:border-white hover:bg-white/10 transition-colors";

export function Navbar({
  variant = "solid",
}: {
  /** "transparent": ana sayfada bant hero ile kesintisiz birleşir (gölgesiz) */
  variant?: "solid" | "transparent";
}) {
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const role = session?.user?.role;

  if (role === "AGENCY") {
    return <AgencyHeader />;
  }

  return (
    <header
      className={
        variant === "transparent"
          ? "w-full bg-navy text-white"
          : "w-full bg-navy text-white shadow-[0_1px_0_rgb(0_0_0/0.15),0_4px_18px_-8px_rgb(0_0_0/0.3)]"
      }
    >
      <div className="mx-auto flex h-[72px] max-w-[1200px] items-center gap-8 px-4 sm:px-6">
        <Logo variant="light" size="md" />

        <nav className="hidden flex-1 items-center gap-7 lg:flex">
          <Link href="/search" className={navLinkCls}>
            Otel Ara
          </Link>
          <Link href="/kampanyalar" className={navLinkCls}>
            Kampanyalar
          </Link>
          <Link href="/yardim" className={navLinkCls}>
            Yardım
          </Link>
          <Link href="/agency/login" className={navLinkCls}>
            Acenteler
          </Link>
        </nav>

        <div className="ml-auto hidden items-center gap-1 lg:flex">
          <LocaleSwitcher variant="transparent" />
          {session ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen((o) => !o)}
                aria-haspopup="menu"
                aria-expanded={userMenuOpen}
                className={ghostBtnCls}
              >
                <CircleUserRound className="size-4" aria-hidden />
                {session.user.name}
                <ChevronDown
                  className={`size-3.5 transition-transform ${userMenuOpen ? "rotate-180" : ""}`}
                  aria-hidden
                />
              </button>

              {userMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div
                    role="menu"
                    className="absolute right-0 top-[calc(100%+8px)] z-20 w-56 overflow-hidden rounded-lg border border-line bg-white py-1 text-ink shadow-[0_12px_28px_-10px_rgb(11_13_20/0.3)]"
                  >
                    <Link
                      href="/profile"
                      role="menuitem"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-[14px] font-semibold text-ink hover:bg-chip-blue"
                    >
                      <CircleUserRound className="size-4 text-navy" aria-hidden />
                      Profil Bilgileri
                    </Link>
                    <Link
                      href="/reservations"
                      role="menuitem"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-[14px] font-semibold text-ink hover:bg-chip-blue"
                    >
                      <CalendarCheck className="size-4 text-navy" aria-hidden />
                      Rezervasyonlarım
                    </Link>
                    {role === "ADMIN" && (
                      <Link
                        href="/admin"
                        role="menuitem"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-[14px] font-semibold text-ink hover:bg-chip-blue"
                      >
                        <LayoutDashboard className="size-4 text-navy" aria-hidden />
                        Admin Paneli
                      </Link>
                    )}
                    <div className="my-1 border-t border-line" />
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setUserMenuOpen(false);
                        signOut({ callbackUrl: "/" });
                      }}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[14px] font-semibold text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="size-4" aria-hidden />
                      Çıkış
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <>
              <Link href="/agency/login" className={ghostBtnCls}>
                Partner girişi
              </Link>
              <Link href="/login" className={outlineBtnCls}>
                Giriş yap
              </Link>
            </>
          )}
        </div>

        {/* Mobile */}
        {/* Hamburger yalnızca web: app modunda gezinme alt sekme
            çubuğunda, kalan maddeler Hesabım sekmesinde. */}
        <div className="web-only ml-auto flex items-center gap-1 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            className="-mr-2 flex size-11 items-center justify-center rounded-md text-white/90 active:bg-white/10"
            aria-label="Menü"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? (
              <X className="size-5" />
            ) : (
              <Menu className="size-5" />
            )}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="web-only max-h-[calc(100dvh-72px)] overflow-y-auto overscroll-contain border-t border-white/10 bg-navy lg:hidden">
          <div className="mx-auto max-w-[1200px] px-4 py-2 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-6">
            <nav className="flex flex-col">
              {[
                { name: "Otel Ara", href: "/search" },
                { name: "Kampanyalar", href: "/kampanyalar" },
                { name: "Yardım", href: "/yardim" },
                { name: "Acenteler", href: "/agency/login" },
              ].map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="flex min-h-12 items-center border-b border-white/10 text-[15px] font-semibold text-white/90 active:text-white"
                >
                  {item.name}
                </Link>
              ))}
              <div className="py-3">
                <LocaleSwitcher variant="transparent" />
              </div>

              {session ? (
                <>
                  <Link
                    href="/profile"
                    onClick={() => setMobileOpen(false)}
                    className="mt-2 inline-flex min-h-12 items-center gap-1.5 text-[15px] font-semibold text-white/90"
                  >
                    <CircleUserRound className="size-4" aria-hidden />
                    {session.user.name}
                  </Link>
                  <Link
                    href="/reservations"
                    onClick={() => setMobileOpen(false)}
                    className="inline-flex min-h-12 items-center gap-1.5 text-[15px] font-semibold text-white/90"
                  >
                    <CalendarCheck className="size-4" aria-hidden />
                    Rezervasyonlarım
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileOpen(false);
                      signOut({ callbackUrl: "/" });
                    }}
                    className="mt-1 mb-3 inline-flex h-12 items-center justify-center gap-1.5 rounded border border-white/35 bg-transparent text-[14px] font-semibold text-white"
                  >
                    <LogOut className="size-4" aria-hidden />
                    Çıkış yap
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/agency/login"
                    onClick={() => setMobileOpen(false)}
                    className="mt-2 inline-flex min-h-12 items-center text-[15px] font-semibold text-white/90"
                  >
                    Partner girişi
                  </Link>
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="mt-1 mb-3 inline-flex h-12 items-center justify-center rounded border border-white/35 bg-transparent text-[14px] font-semibold text-white"
                  >
                    Giriş yap
                  </Link>
                </>
              )}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
