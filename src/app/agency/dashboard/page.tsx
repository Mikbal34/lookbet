"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { Container } from "@/components/layout";
import { StatsCard } from "@/components/admin/stats-card";
import {
  CalendarCheck,
  DollarSign,
  TrendingUp,
  Clock,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";

export default function AgencyDashboardPage() {
  const { data: session } = useSession();

  const { data: reservations, isLoading } = useQuery({
    queryKey: ["agency-reservations"],
    queryFn: async () => {
      const res = await fetch("/api/reservations?limit=50");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const stats = reservations
    ? {
        total: reservations.data?.length || 0,
        confirmed: reservations.data?.filter(
          (r: { status: string }) => r.status === "CONFIRMED"
        ).length || 0,
        totalRevenue: reservations.data?.reduce(
          (sum: number, r: { status: string; totalPrice: number }) =>
            r.status === "CONFIRMED" ? sum + r.totalPrice : sum,
          0
        ) || 0,
        pending: reservations.data?.filter(
          (r: { status: string }) => r.status === "PENDING"
        ).length || 0,
      }
    : { total: 0, confirmed: 0, totalRevenue: 0, pending: 0 };

  return (
    <Container className="py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Acente Paneli</h1>
        <p className="text-gray-500 mt-1">
          Hoş geldiniz, {session?.user?.name}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard
          title="Toplam Rezervasyon"
          value={stats.total}
          icon={CalendarCheck}
        />
        <StatsCard
          title="Onaylı Rezervasyon"
          value={stats.confirmed}
          icon={TrendingUp}
          iconColor="text-green-600 bg-green-100"
        />
        <StatsCard
          title="Toplam Ciro"
          value={formatCurrency(stats.totalRevenue)}
          icon={DollarSign}
          iconColor="text-emerald-600 bg-emerald-100"
        />
        <StatsCard
          title="Bekleyen"
          value={stats.pending}
          icon={Clock}
          iconColor="text-orange-600 bg-orange-100"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            Son Rezervasyonlar
          </h2>
          <Link
            href="/agency/reservations"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Tümünü Gör
          </Link>
        </div>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Yükleniyor...</div>
          ) : !reservations?.data?.length ? (
            <div className="p-8 text-center text-gray-500">
              Henüz rezervasyon yok
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
                    Tarih
                  </th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase py-3 px-6">
                    Durum
                  </th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase py-3 px-6">
                    Fiyat
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {reservations.data
                  .slice(0, 10)
                  .map(
                    (r: {
                      id: string;
                      bookingNumber: string;
                      hotelName: string;
                      checkIn: string;
                      status: string;
                      totalPrice: number;
                      currency: string;
                    }) => (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="py-3 px-6 text-sm font-mono">
                          <Link
                            href={`/reservations/${r.id}`}
                            className="text-blue-600 hover:underline"
                          >
                            {r.bookingNumber || r.id.slice(0, 8)}
                          </Link>
                        </td>
                        <td className="py-3 px-6 text-sm">{r.hotelName}</td>
                        <td className="py-3 px-6 text-sm text-gray-500">
                          {formatDate(r.checkIn)}
                        </td>
                        <td className="py-3 px-6">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                              r.status === "CONFIRMED"
                                ? "bg-green-100 text-green-700"
                                : r.status === "PENDING"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : r.status === "CANCELLED"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {r.status === "CONFIRMED"
                              ? "Onaylı"
                              : r.status === "PENDING"
                                ? "Beklemede"
                                : r.status === "CANCELLED"
                                  ? "İptal"
                                  : "Başarısız"}
                          </span>
                        </td>
                        <td className="py-3 px-6 text-sm font-medium">
                          {formatCurrency(r.totalPrice, r.currency)}
                        </td>
                      </tr>
                    )
                  )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Container>
  );
}
