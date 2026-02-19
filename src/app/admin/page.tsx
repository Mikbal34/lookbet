"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  CalendarCheck,
  DollarSign,
  Building2,
  Clock,
} from "lucide-react";
import { StatsCard, DataTable, ChartCard } from "@/components/admin";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";

// ---- Types ----------------------------------------------------------------

interface DashboardData {
  stats: {
    totalReservations: number;
    totalRevenue: number;
    activeAgencies: number;
    pendingApprovals: number;
  };
  monthlyRevenue: { month: string; revenue: number }[];
  recentReservations: {
    id: string;
    bookingNumber: string;
    hotelName: string;
    guestName: string;
    checkIn: string;
    checkOut: string;
    status: string;
    totalPrice: number;
    currency: string;
  }[];
}

// ---- Status badge helper --------------------------------------------------

function statusBadge(status: string) {
  const map: Record<string, { variant: "success" | "warning" | "error" | "secondary" | "default"; label: string }> = {
    CONFIRMED: { variant: "success", label: "Onaylı" },
    PENDING: { variant: "warning", label: "Bekliyor" },
    CANCELLED: { variant: "error", label: "İptal" },
    COMPLETED: { variant: "default", label: "Tamamlandı" },
  };
  const { variant, label } = map[status] ?? { variant: "secondary", label: status };
  return <Badge variant={variant}>{label}</Badge>;
}

// ---- Page ----------------------------------------------------------------

export default function AdminDashboardPage() {
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["admin-dashboard"],
    queryFn: () => fetch("/api/admin/dashboard").then((r) => r.json()),
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-white rounded-xl border border-gray-200" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-80 bg-white rounded-xl border border-gray-200" />
          <div className="h-80 bg-white rounded-xl border border-gray-200" />
        </div>
      </div>
    );
  }

  const stats = data?.stats;
  const monthlyRevenue = data?.monthlyRevenue ?? [];
  const recentReservations = data?.recentReservations ?? [];

  type RecentRow = DashboardData["recentReservations"][number];

  const columns = [
    {
      key: "bookingNumber",
      header: "Rezervasyon No",
      render: (row: Record<string, unknown>) => (
        <span className="font-mono text-xs font-medium">
          {(row as unknown as RecentRow).bookingNumber}
        </span>
      ),
    },
    { key: "hotelName", header: "Otel" },
    { key: "guestName", header: "Misafir" },
    {
      key: "checkIn",
      header: "Giriş",
      render: (row: Record<string, unknown>) =>
        formatDate((row as unknown as RecentRow).checkIn),
    },
    {
      key: "status",
      header: "Durum",
      render: (row: Record<string, unknown>) =>
        statusBadge((row as unknown as RecentRow).status),
    },
    {
      key: "totalPrice",
      header: "Tutar",
      render: (row: Record<string, unknown>) => {
        const r = row as unknown as RecentRow;
        return formatCurrency(r.totalPrice, r.currency);
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Lookbet admin paneline hoş geldiniz</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatsCard
          title="Toplam Rezervasyon"
          value={stats?.totalReservations ?? 0}
          icon={CalendarCheck}
          iconColor="text-blue-600 bg-blue-100"
        />
        <StatsCard
          title="Toplam Ciro"
          value={formatCurrency(stats?.totalRevenue ?? 0)}
          icon={DollarSign}
          iconColor="text-green-600 bg-green-100"
        />
        <StatsCard
          title="Aktif Acenteler"
          value={stats?.activeAgencies ?? 0}
          icon={Building2}
          iconColor="text-purple-600 bg-purple-100"
        />
        <StatsCard
          title="Bekleyen Onaylar"
          value={stats?.pendingApprovals ?? 0}
          icon={Clock}
          iconColor="text-orange-600 bg-orange-100"
          change={stats?.pendingApprovals ? "Onay bekliyor" : undefined}
          changeType="negative"
        />
      </div>

      {/* Revenue Chart */}
      <ChartCard
        title="Aylık Ciro"
        description="Son 6 ayın gelir grafiği"
      >
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={monthlyRevenue} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
            <YAxis
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              // @ts-expect-error - recharts Formatter type is overly strict
              formatter={(value: number | string) => [formatCurrency(Number(value)), "Ciro"]}
              contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13 }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#revenueGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Recent Reservations */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Son Rezervasyonlar</h3>
        <DataTable
          columns={columns}
          data={recentReservations as unknown as Record<string, unknown>[]}
          keyField="id"
          emptyMessage="Henüz rezervasyon bulunmuyor"
        />
      </div>
    </div>
  );
}
