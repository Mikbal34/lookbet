"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Container } from "@/components/layout";
import { formatCurrency, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils/cn";
import Link from "next/link";
import { Search, Download } from "lucide-react";

const statusTabs = [
  { value: "", label: "Tümü" },
  { value: "CONFIRMED", label: "Onaylı" },
  { value: "PENDING", label: "Beklemede" },
  { value: "CANCELLED", label: "İptal" },
];

export default function AgencyReservationsPage() {
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["agency-reservations", status, search, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (status) params.set("status", status);
      if (search) params.set("search", search);
      const res = await fetch(`/api/reservations?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  return (
    <Container className="py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Acente Rezervasyonları
        </h1>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {statusTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => {
                setStatus(tab.value);
                setPage(1);
              }}
              className={cn(
                "px-4 py-1.5 text-sm font-medium rounded-md transition-colors",
                status === tab.value
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Booking # veya isim ara..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-12 text-center text-gray-500">
              Yükleniyor...
            </div>
          ) : !data?.data?.length ? (
            <div className="p-12 text-center text-gray-500">
              Rezervasyon bulunamadı
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
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
                    Çıkış
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
                {data.data.map(
                  (r: {
                    id: string;
                    bookingNumber: string;
                    hotelName: string;
                    contactName: string;
                    checkIn: string;
                    checkOut: string;
                    status: string;
                    totalPrice: number;
                    discountedPrice: number | null;
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
                      <td className="py-3 px-6 text-sm">{r.contactName}</td>
                      <td className="py-3 px-6 text-sm text-gray-500">
                        {formatDate(r.checkIn)}
                      </td>
                      <td className="py-3 px-6 text-sm text-gray-500">
                        {formatDate(r.checkOut)}
                      </td>
                      <td className="py-3 px-6">
                        <span
                          className={cn(
                            "inline-flex px-2 py-0.5 rounded-full text-xs font-medium",
                            r.status === "CONFIRMED" &&
                              "bg-green-100 text-green-700",
                            r.status === "PENDING" &&
                              "bg-yellow-100 text-yellow-700",
                            r.status === "CANCELLED" &&
                              "bg-red-100 text-red-700",
                            r.status === "FAILED" && "bg-gray-100 text-gray-700"
                          )}
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
                        {r.discountedPrice ? (
                          <div>
                            <span className="text-green-600">
                              {formatCurrency(r.discountedPrice, r.currency)}
                            </span>
                            <span className="text-xs text-gray-400 line-through ml-1">
                              {formatCurrency(r.totalPrice, r.currency)}
                            </span>
                          </div>
                        ) : (
                          formatCurrency(r.totalPrice, r.currency)
                        )}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {data?.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t">
            <p className="text-sm text-gray-500">
              Toplam {data.total} rezervasyon
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 text-sm border rounded-lg disabled:opacity-50"
              >
                Önceki
              </button>
              <span className="px-3 py-1 text-sm">
                {page} / {data.totalPages}
              </span>
              <button
                onClick={() =>
                  setPage((p) => Math.min(data.totalPages, p + 1))
                }
                disabled={page === data.totalPages}
                className="px-3 py-1 text-sm border rounded-lg disabled:opacity-50"
              >
                Sonraki
              </button>
            </div>
          </div>
        )}
      </div>
    </Container>
  );
}
