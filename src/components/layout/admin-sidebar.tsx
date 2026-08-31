"use client";

// Admin sidebar — lookbet. tasarım dili: koyu lacivert (navy-deep) zemin,
// altın ADMIN rozeti, altta kullanıcı kartı + çıkış.
// Mobil: 11 maddelik menü sayfanın üstünü kaplamasın diye yapışkan bir
// başlık çubuğu + açılır menü; lg'den itibaren klasik yan panel.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Logo } from "./logo";

const navItems = [
  { href: "/admin", label: "Genel bakış" },
  { href: "/admin/users", label: "Kullanıcılar" },
  { href: "/admin/agencies", label: "Acenteler" },
  { href: "/admin/price-rules", label: "Fiyat kuralları" },
  { href: "/admin/commissions", label: "Komisyonlar" },
  { href: "/admin/reservations", label: "Rezervasyonlar" },
  { href: "/admin/reports", label: "Raporlar" },
  { href: "/admin/content", label: "Content sync" },
  { href: "/admin/settings", label: "Ayarlar" },
  { href: "/admin/notifications", label: "Bildirimler" },
  { href: "/admin/audit-logs", label: "Denetim logları" },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);

  const activeLabel =
    navItems.find(
      (i) =>
        pathname === i.href || (i.href !== "/admin" && pathname.startsWith(i.href))
    )?.label ?? "Admin";

  return (
    <aside className="sticky top-0 z-40 flex shrink-0 flex-col bg-navy-deep lg:h-screen lg:w-[250px] lg:gap-1.5 lg:overflow-y-auto lg:px-5 lg:py-7">
      {/* ── Mobil başlık çubuğu ── */}
      <div className="flex items-center justify-between px-4 py-3 lg:hidden">
        <div className="flex min-w-0 items-center gap-2.5">
          <Logo variant="light" href="/admin" size="sm" />
          <span className="shrink-0 rounded-sm bg-gold px-2 py-[2px] text-[10px] font-extrabold tracking-[1.2px] text-ink">
            ADMIN
          </span>
        </div>
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
      <div className="hidden px-3 pb-2 lg:block">
        <Logo variant="light" href="/admin" size="md" />
      </div>
      <div className="hidden px-3 pb-5 lg:block">
        <span className="rounded-sm bg-gold px-2.5 py-[3px] text-[11px] font-extrabold tracking-[1.5px] text-ink">
          ADMIN
        </span>
      </div>

      {/* ── Menü ── */}
      <nav
        className={cn(
          "flex-col gap-1 border-t border-paper/10 px-4 pb-4 pt-3 lg:flex lg:border-0 lg:p-0",
          open ? "flex" : "hidden"
        )}
      >
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/admin" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "rounded-md px-3.5 py-3 text-sm font-semibold transition-colors lg:py-2.5",
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
