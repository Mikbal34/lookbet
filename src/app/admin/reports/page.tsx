"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { DataTable, ChartCard } from "@/components/admin";
import { formatCurrency } from "@/lib/utils";

// ---- Types ----------------------------------------------------------------

type ReportTab = "revenue" | "agency-performance" | "hotel";

interface RevenueData {
  monthly: { month: string; revenue: number; reservations: number }[];
  total: number;
  avgMonthly: number;
}

interface AgencyPerformanceRow {
  id: string;
  companyName: string;
  reservationCount: number;
  totalRevenue: number;
  avgBookingValue: number;
}

interface HotelRow {
  hotelCode: string;
  hotelName: string;
  bookingCount: number;
  revenue: number;
}

interface AgencyReport {
  agencies: AgencyPerformanceRow[];
}

interface HotelReport {
  hotels: HotelRow[];
}

// ---- Revenue Tab ----------------------------------------------------------------

function RevenueTab() {
  const { data, isLoading } = useQuery<RevenueData>({
    queryKey: ["admin-reports-revenue"],
    queryFn: () => fetch("/api/admin/reports?type=revenue").then((r) => r.json()),
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-2 gap-4">
          <div className="h-24 bg-white rounded-xl border border-gray-200" />
          <div className="h-24 bg-white rounded-xl border border-gray-200" />
        </div>
        <div className="h-80 bg-white rounded-xl border border-gray-200" />
      </div>
    );
  }

  const monthly = data?.monthly ?? [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500">Toplam Ciro</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            {formatCurrency(data?.total ?? 0)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500">Aylık Ortalama</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            {formatCurrency(data?.avgMonthly ?? 0)}
          </p>
        </div>
      </div>

      <ChartCard title="Aylık Ciro ve Rezervasyon Trendi">
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={monthly} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
            <YAxis
              yAxisId="revenue"
              orientation="left"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`}
            />
            <YAxis
              yAxisId="count"
              orientation="right"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              // @ts-expect-error - recharts Formatter type mismatch
              formatter={(value: number | string, name: string) => [
                name === "revenue" ? formatCurrency(Number(value)) : String(value),
                name === "revenue" ? "Ciro" : "Rezervasyon",
              ]}
              contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13 }}
            />
            <Legend
              formatter={(value) => (value === "revenue" ? "Ciro" : "Rezervasyon")}
            />
            <Line
              yAxisId="revenue"
              type="monotone"
              dataKey="revenue"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              yAxisId="count"
              type="monotone"
              dataKey="reservations"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

// ---- Agency Performance Tab ----------------------------------------------------------------

function AgencyPerformanceTab() {
  const { data, isLoading } = useQuery<AgencyReport>({
    queryKey: ["admin-reports-agency"],
    queryFn: () => fetch("/api/admin/reports?type=agency-performance").then((r) => r.json()),
  });

  const asAgRow = (row: Record<string, unknown>) => row as unknown as AgencyPerformanceRow;

  const columns = [
    { key: "companyName", header: "Acente" },
    {
      key: "reservationCount",
      header: "Rezervasyon",
      render: (row: Record<string, unknown>) => (
        <span className="font-semibold">{asAgRow(row).reservationCount}</span>
      ),
    },
    {
      key: "totalRevenue",
      header: "Toplam Ciro",
      render: (row: Record<string, unknown>) => formatCurrency(asAgRow(row).totalRevenue),
    },
    {
      key: "avgBookingValue",
      header: "Ort. Rezervasyon",
      render: (row: Record<string, unknown>) => formatCurrency(asAgRow(row).avgBookingValue),
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 bg-gray-100 rounded" />
          ))}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={(data?.agencies ?? []) as unknown as Record<string, unknown>[]}
          keyField="id"
          emptyMessage="Acente performans verisi bulunamadı"
        />
      )}
    </div>
  );
}

// ---- Hotel Tab ----------------------------------------------------------------

function HotelTab() {
  const { data, isLoading } = useQuery<HotelReport>({
    queryKey: ["admin-reports-hotel"],
    queryFn: () => fetch("/api/admin/reports?type=hotel").then((r) => r.json()),
  });

  const asHotelRow = (row: Record<string, unknown>) => row as unknown as HotelRow;

  const columns = [
    { key: "hotelCode", header: "Otel Kodu" },
    { key: "hotelName", header: "Otel Adı" },
    {
      key: "bookingCount",
      header: "Rezervasyon",
      render: (row: Record<string, unknown>) => (
        <span className="font-semibold">{asHotelRow(row).bookingCount}</span>
      ),
    },
    {
      key: "revenue",
      header: "Ciro",
      render: (row: Record<string, unknown>) => formatCurrency(asHotelRow(row).revenue),
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 bg-gray-100 rounded" />
          ))}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={(data?.hotels ?? []) as unknown as Record<string, unknown>[]}
          keyField="hotelCode"
          emptyMessage="Otel rapor verisi bulunamadı"
        />
      )}
    </div>
  );
}

// ---- Page ----------------------------------------------------------------

const TABS: { value: ReportTab; label: string }[] = [
  { value: "revenue", label: "Ciro Raporu" },
  { value: "agency-performance", label: "Acente Performansı" },
  { value: "hotel", label: "Otel Raporu" },
];

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>("revenue");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Raporlar</h1>
        <p className="text-sm text-gray-500 mt-1">Performans ve ciro analizleri</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1" aria-label="Rapor sekmeleri">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.value
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
              aria-selected={activeTab === tab.value}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "revenue" && <RevenueTab />}
      {activeTab === "agency-performance" && <AgencyPerformanceTab />}
      {activeTab === "hotel" && <HotelTab />}
    </div>
  );
}
