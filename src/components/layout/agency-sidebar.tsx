"use client";

// Acente panel sidebar'ı — lookbet. tasarım dili: koyu (ink) zemin,
// üstte logo, altta kullanıcı kartı + çıkış.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
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

  return (
    <aside className="bg-ink px-5 py-7 flex flex-col gap-1.5 w-full lg:w-[250px] lg:min-h-screen shrink-0">
      <div className="px-3 pb-6">
        <Logo variant="light" href="/agency/dashboard" size="md" />
      </div>

      <nav className="flex flex-col gap-1.5">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/search" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "px-3.5 py-[11px] rounded-md text-sm font-semibold transition-colors",
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
