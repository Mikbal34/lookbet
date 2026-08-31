"use client";

// Acente panel sidebar'ı — lookbet. tasarım dili: koyu (ink) zemin,
// üstte logo, altta kullanıcı kartı + çıkış.
// Mobil: yapışkan başlık çubuğu + açılır menü; lg'den itibaren yan panel.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Logo } from "./logo";

const navItems = [
  { href: "/agency/dashboard", label: "Genel bakış" },
  { href: "/search", label: "Otel ara" },
  { href: "/agency/reservations", label: "Rezervasyonlar" },
  { href: "/agency/company", label: "Şirket bilgilerim" },
];

export function AgencySidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);

  const activeLabel =
    navItems.find(
      (i) =>
        pathname === i.href ||
        (i.href !== "/search" && pathname.startsWith(i.href))
    )?.label ?? "Acente paneli";

  return (
    <aside className="sticky top-0 z-40 flex shrink-0 flex-col bg-ink lg:h-screen lg:w-[250px] lg:gap-1.5 lg:overflow-y-auto lg:px-5 lg:py-7">
      {/* ── Mobil başlık çubuğu ── */}
      <div className="flex items-center justify-between px-4 py-3 lg:hidden">
        <Logo variant="light" href="/agency/dashboard" size="sm" suffix="PARTNER" />
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label="Menü"
          className="-mr-2 flex size-11 items-center justify-center rounded-md text-paper/90 active:bg-paper/10"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>
      {!open && (
        <div className="border-t border-paper/10 px-4 py-2 text-[12px] font-semibold text-paper/60 lg:hidden">
          {activeLabel}
        </div>
      )}

      {/* ── Masaüstü başlığı ── */}
      <div className="hidden px-3 pb-6 lg:block">
        <Logo variant="light" href="/agency/dashboard" size="md" />
      </div>

      {/* ── Menü ── */}
      <nav
        className={cn(
          "flex-col gap-1.5 border-t border-paper/10 px-4 pb-4 pt-3 lg:flex lg:border-0 lg:p-0",
          open ? "flex" : "hidden"
        )}
      >
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/search" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "rounded-md px-3.5 py-3 text-sm font-semibold transition-colors lg:py-[11px]",
                isActive
                  ? "bg-paper/10 text-paper"
                  : "text-paper/55 hover:bg-paper/5 hover:text-paper"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* ── Kullanıcı kartı ── */}
      <div
        className={cn(
          "px-4 pb-4 lg:mt-auto lg:block lg:px-0 lg:pt-6",
          open ? "block" : "hidden"
        )}
      >
        <div className="rounded-md bg-paper/[0.06] p-3.5">
          <div className="truncate text-[13.5px] font-bold text-paper">
            {session?.user?.name}
          </div>
          <div className="truncate text-xs text-paper/55">
            {session?.user?.email}
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/agency/login" })}
            className="mt-2 cursor-pointer text-xs font-semibold text-gold hover:text-gold-dark"
          >
            Çıkış yap →
          </button>
        </div>
      </div>
    </aside>
  );
}
