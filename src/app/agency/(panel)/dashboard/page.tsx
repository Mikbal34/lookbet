"use client";

// Acente Dashboard — sunucuda hesaplanan istatistikler (/api/agency/dashboard),
// anlaşma koşulları kartı ve son rezervasyonlar.

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  CalendarCheck,
  TrendingUp,
  Clock,
  Wallet,
  Percent,
  BadgePercent,
  Search,
  Building2,
  ArrowRight,
} from "lucide-react";
import { StatsCard } from "@/components/admin/stats-card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";

interface DashboardData {
  agency: {
    companyName: string;
    taxId: string;
    discountRate: number;
    commission: number;
    isApproved: boolean;
    createdAt: string;
  };
  stats: {
    totalReservations: number;
    confirmedCount: number;
    pendingCount: number;
    cancelledCount: number;
    totalRevenue: number;
    monthRevenue: number;
    estimatedCommission: number;
  };
  recentReservations: {
    id: string;
    bookingNumber: string | null;
    hotelName: string | null;
    checkIn: string;
    checkOut: string;
    status: string;
    totalPrice: number;
    currency: string;
    contactName: string | null;
  }[];
}

function statusBadge(status: string) {
  const map: Record<string, { variant: "success" | "warning" | "error" | "secondary"; label: string }> = {
    CONFIRMED: { variant: "success", label: "Onaylı" },
    PENDING: { variant: "warning", label: "Beklemede" },
    CANCELLED: { variant: "error", label: "İptal" },
    FAILED: { variant: "secondary", label: "Başarısız" },
  };
  const s = map[status] ?? { variant: "secondary" as const, label: status };
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

export default function AgencyDashboardPage() {
  const { data: session } = useSession();

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["agency-dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/agency/dashboard");
      if (!res.ok) throw new Error("Panel verileri yüklenemedi");
      return res.json();
    },
  });

  const stats = data?.stats;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-[28px] font-normal text-ink">
            {data?.agency.companyName ?? "Acente Paneli"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Hoş geldiniz, {session?.user?.name}
          </p>
        </div>
        <Link
          href="/search"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-navy text-white text-sm font-semibold hover:bg-navy-dark transition-colors"
        >
          <Search className="h-4 w-4" aria-hidden="true" />
          Yeni Rezervasyon
        </Link>
      </div>

      {/* İstatistikler */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Toplam Rezervasyon"
          value={stats?.totalReservations ?? 0}
          icon={CalendarCheck}
        />
        <StatsCard
          title="Onaylı"
          value={stats?.confirmedCount ?? 0}
          icon={TrendingUp}
          iconColor="text-green-600 bg-green-100"
        />
        <StatsCard
          title="Bekleyen"
          value={stats?.pendingCount ?? 0}
          icon={Clock}
          iconColor="text-orange-600 bg-orange-100"
        />
        <StatsCard
          title="Toplam Ciro"
          value={formatCurrency(stats?.totalRevenue ?? 0)}
          icon={Wallet}
          iconColor="text-emerald-600 bg-emerald-100"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Anlaşma koşulları */}
        <div className="bg-white rounded-md border border-[rgb(26_24_20/0.08)] p-6">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="h-4 w-4 text-navy" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-gray-900">
              Anlaşma Koşullarınız
            </h2>
          </div>
          <dl className="space-y-3">
            <div className="flex items-center justify-between">
              <dt className="flex items-center gap-2 text-sm text-gray-500">
                <BadgePercent className="h-4 w-4 text-gray-400" aria-hidden="true" />
                B2B İndirim Oranı
              </dt>
              <dd className="text-sm font-semibold text-gray-900">
                %{data?.agency.discountRate ?? 0}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="flex items-center gap-2 text-sm text-gray-500">
                <Percent className="h-4 w-4 text-gray-400" aria-hidden="true" />
                Komisyon Oranı
              </dt>
              <dd className="text-sm font-semibold text-gray-900">
                %{data?.agency.commission ?? 0}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="flex items-center gap-2 text-sm text-gray-500">
                <Wallet className="h-4 w-4 text-gray-400" aria-hidden="true" />
                Tahmini Komisyon Kazancı
              </dt>
              <dd className="text-sm font-semibold text-emerald-600">
                {formatCurrency(stats?.estimatedCommission ?? 0)}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="flex items-center gap-2 text-sm text-gray-500">
                <Clock className="h-4 w-4 text-gray-400" aria-hidden="true" />
                Bu Ay Ciro
              </dt>
              <dd className="text-sm font-semibold text-gray-900">
                {formatCurrency(stats?.monthRevenue ?? 0)}
              </dd>
            </div>
          </dl>
          <Link
            href="/agency/company"
            className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-navy hover:text-navy-dark"
          >
            Şirket bilgilerini görüntüle
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        </div>

        {/* Son rezervasyonlar */}
        <div className="lg:col-span-2 bg-white rounded-md border border-[rgb(26_24_20/0.08)]">
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">
              Son Rezervasyonlar
            </h2>
            <Link
              href="/agency/reservations"
              className="text-sm text-navy hover:text-navy-dark font-medium"
            >
              Tümünü Gör
            </Link>
          </div>
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-8 space-y-3 animate-pulse">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-8 bg-gray-100 rounded" />
                ))}
              </div>
            ) : !data?.recentReservations.length ? (
              <div className="p-10 text-center">
                <p className="text-sm text-gray-500 mb-3">
                  Henüz rezervasyon bulunmuyor
                </p>
                <Link
                  href="/search"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-navy hover:text-navy-dark"
                >
                  <Search className="h-3.5 w-3.5" aria-hidden="true" />
                  İlk rezervasyonunuzu oluşturun
                </Link>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase py-3 px-6">
                      Booking #
                    </th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase py-3 px-6">
                      Otel
                    </th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase py-3 px-6">
                      Misafir
                    </th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase py-3 px-6">
                      Giriş
                    </th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase py-3 px-6">
                      Durum
                    </th>
                    <th className="text-right text-xs font-semibold text-gray-500 uppercase py-3 px-6">
                      Tutar
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.recentReservations.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="py-3 px-6 text-sm font-mono">
                        <Link
                          href={`/reservations/${r.id}`}
                          className="text-navy hover:underline"
                        >
                          {r.bookingNumber || r.id.slice(0, 8)}
                        </Link>
                      </td>
                      <td className="py-3 px-6 text-sm">{r.hotelName ?? "-"}</td>
                      <td className="py-3 px-6 text-sm text-gray-500">
                        {r.contactName ?? "-"}
                      </td>
                      <td className="py-3 px-6 text-sm text-gray-500">
                        {formatDate(r.checkIn)}
                      </td>
                      <td className="py-3 px-6">{statusBadge(r.status)}</td>
                      <td className="py-3 px-6 text-sm font-medium text-right">
                        {formatCurrency(r.totalPrice, r.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
