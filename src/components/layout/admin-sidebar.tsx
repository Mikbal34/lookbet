"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import {
  LayoutDashboard,
  Users,
  Building2,
  Tag,
  Percent,
  CalendarCheck,
  BarChart3,
  RefreshCw,
  Settings,
  Bell,
  ScrollText,
} from "lucide-react";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Kullanıcılar", icon: Users },
  { href: "/admin/agencies", label: "Acenteler", icon: Building2 },
  { href: "/admin/price-rules", label: "Fiyat Kuralları", icon: Tag },
  { href: "/admin/commissions", label: "Komisyonlar", icon: Percent },
  { href: "/admin/reservations", label: "Rezervasyonlar", icon: CalendarCheck },
  { href: "/admin/reports", label: "Raporlar", icon: BarChart3 },
  { href: "/admin/content", label: "Content Sync", icon: RefreshCw },
  { href: "/admin/settings", label: "Ayarlar", icon: Settings },
  { href: "/admin/notifications", label: "Bildirimler", icon: Bell },
  { href: "/admin/audit-logs", label: "Denetim Logları", icon: ScrollText },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-4rem)] hidden lg:block">
      <div className="p-4">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Admin Panel
        </h2>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
