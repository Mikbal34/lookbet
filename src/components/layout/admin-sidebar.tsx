"use client";

// Admin sidebar — lookbet. tasarım dili: koyu lacivert (navy-deep) zemin,
// altın ADMIN rozeti, altta kullanıcı kartı + çıkış.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
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

  return (
    <aside className="bg-navy-deep px-5 py-7 flex flex-col gap-1.5 w-full lg:w-[250px] lg:min-h-screen shrink-0">
      <div className="px-3 pb-2">
        <Logo variant="light" href="/admin" size="md" />
      </div>
      <div className="px-3 pb-5">
        <span className="bg-gold text-ink rounded-sm px-2.5 py-[3px] text-[11px] font-extrabold tracking-[1.5px]">
          ADMIN
        </span>
      </div>

      <nav className="flex flex-col gap-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/admin" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "px-3.5 py-2.5 rounded-md text-sm font-semibold transition-colors",
                isActive
                  ? "bg-paper/10 text-paper"
                  : "text-paper/55 hover:text-paper hover:bg-paper/5"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-6">
        <div className="p-3.5 bg-paper/[0.06] rounded-md">
          <div className="text-[13.5px] font-bold text-paper truncate">
            {session?.user?.name}
          </div>
          <div className="text-xs text-paper/55 truncate">
            {session?.user?.email}
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/agency/login" })}
            className="text-xs text-gold font-semibold mt-2 cursor-pointer hover:text-gold-dark"
          >
            Çıkış yap →
          </button>
        </div>
      </div>
    </aside>
  );
}
