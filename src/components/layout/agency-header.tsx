"use client";

// Acente kullanıcısının site genelinde (arama, otel, booking) gördüğü üst bar.
// Panel kimliğini taşır: PARTNER logosu, altın "Otel Ara" CTA'sı, kullanıcı menüsü.

import Link from "next/link";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import {
  Building2,
  User,
  LogOut,
  ChevronDown,
  Search,
  CalendarCheck,
  LayoutDashboard,
} from "lucide-react";
import { Logo } from "./logo";

export function AgencyHeader() {
  const { data: session } = useSession();
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <header className="bg-white border-b border-line">
      <div className="px-4 sm:px-6 lg:px-10">
        <div className="flex justify-between items-center h-16">
          <Logo href="/agency/dashboard" suffix="PARTNER" size="md" />

          <div className="flex items-center gap-3">
            <Link
              href="/search"
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2.5 rounded-md bg-gold text-ink text-sm font-bold hover:bg-gold-dark transition-colors"
            >
              <Search className="h-4 w-4" aria-hidden="true" />
              Otel Ara
            </Link>

            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 text-sm font-semibold text-ink hover:text-navy"
                aria-haspopup="menu"
                aria-expanded={profileOpen}
              >
                <div className="w-8 h-8 bg-navy rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-paper" aria-hidden="true" />
                </div>
                <span className="hidden sm:inline">{session?.user?.name}</span>
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              </button>

              {profileOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setProfileOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-[0_12px_28px_-10px_rgb(11_13_20/0.25)] border border-line py-1 z-20">
                    <div className="px-4 py-2.5 border-b border-line">
                      <p className="text-sm font-bold text-ink truncate">
                        {session?.user?.name}
                      </p>
                      <p className="text-xs text-muted truncate">
                        {session?.user?.email}
                      </p>
                    </div>
                    <Link
                      href="/search"
                      className="flex items-center gap-2 px-4 py-3 text-sm text-slate-text hover:bg-paper hover:text-ink sm:hidden"
                      onClick={() => setProfileOpen(false)}
                    >
                      <Search className="h-4 w-4" aria-hidden="true" />
                      Otel Ara
                    </Link>
                    <Link
                      href="/agency/dashboard"
                      className="flex items-center gap-2 px-4 py-3 text-sm text-slate-text hover:bg-paper hover:text-ink sm:py-2.5"
                      onClick={() => setProfileOpen(false)}
                    >
                      <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                      Panele dön
                    </Link>
                    <Link
                      href="/agency/reservations"
                      className="flex items-center gap-2 px-4 py-3 text-sm text-slate-text hover:bg-paper hover:text-ink sm:py-2.5"
                      onClick={() => setProfileOpen(false)}
                    >
                      <CalendarCheck className="h-4 w-4" aria-hidden="true" />
                      Rezervasyonlar
                    </Link>
                    <Link
                      href="/agency/company"
                      className="flex items-center gap-2 px-4 py-3 text-sm text-slate-text hover:bg-paper hover:text-ink sm:py-2.5"
                      onClick={() => setProfileOpen(false)}
                    >
                      <Building2 className="h-4 w-4" aria-hidden="true" />
                      Şirket bilgilerim
                    </Link>
                    <hr className="my-1 border-line" />
                    <button
                      onClick={() => signOut({ callbackUrl: "/agency/login" })}
                      className="flex w-full items-center gap-2 px-4 py-3 text-sm text-red-600 hover:bg-red-50 sm:py-2.5"
                    >
                      <LogOut className="h-4 w-4" aria-hidden="true" />
                      Çıkış yap
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
