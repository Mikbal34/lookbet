"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search, Download, Eye } from "lucide-react";
import { DataTable } from "@/components/admin";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { formatCurrency, formatDate } from "@/lib/utils";

// ---- Types ----------------------------------------------------------------

interface Reservation {
  id: string;
  bookingNumber: string;
  hotelName: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  status: string;
  totalPrice: number;
  currency: string;
  source: "B2C" | "B2B" | "DIRECT";
}

interface ReservationsResponse {
  reservations: Reservation[];
  total: number;
  totalPages: number;
}

// ---- Helpers ----------------------------------------------------------------

const STATUSES = [
  { value: "", label: "Tüm Durumlar" },
  { value: "PENDING", label: "Bekliyor" },
  { value: "CONFIRMED", label: "Onaylı" },
  { value: "CANCELLED", label: "İptal" },
  { value: "COMPLETED", label: "Tamamlandı" },
];

function statusBadge(status: string) {
  const map: Record<string, "success" | "warning" | "error" | "default" | "secondary"> = {
    CONFIRMED: "success",
    PENDING: "warning",
    CANCELLED: "error",
    COMPLETED: "default",
  };
  const labels: Record<string, string> = {
    CONFIRMED: "Onaylı",
    PENDING: "Bekliyor",
    CANCELLED: "İptal",
    COMPLETED: "Tamamlandı",
  };
  return <Badge variant={map[status] ?? "secondary"}>{labels[status] ?? status}</Badge>;
}

function sourceBadge(source: string) {
  const map: Record<string, "default" | "secondary" | "warning"> = {
    B2C: "default",
    B2B: "secondary",
    DIRECT: "warning",
  };
  return <Badge variant={map[source] ?? "secondary"}>{source}</Badge>;
}

// ---- Page ----------------------------------------------------------------

export default function ReservationsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);

  const { data, isLoading } = useQuery<ReservationsResponse>({
    queryKey: ["admin-reservations", search, status, dateFrom, dateTo, page],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);
      params.set("page", String(page));
      return fetch(`/api/admin/reservations?${params}`).then((r) => r.json());
    },
  });

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);

      const res = await fetch(`/api/admin/reservations/export?${params}`);
      if (!res.ok) throw new Error("Dışa aktarma başarısız");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rezervasyonlar-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV indirildi");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Dışa aktarma hatası");
    } finally {
      setIsExporting(false);
    }
  };

  const reservations = data?.reservations ?? [];

  const asRes = (row: Record<string, unknown>) => row as unknown as Reservation;

  const columns = [
    {
      key: "bookingNumber",
      header: "Rezervasyon No",
      render: (row: Record<string, unknown>) => (
        <span className="font-mono text-xs font-semibold">
          {asRes(row).bookingNumber}
        </span>
      ),
    },
    { key: "hotelName", header: "Otel" },
    { key: "guestName", header: "Misafir" },
    {
      key: "checkIn",
      header: "Giriş",
      render: (row: Record<string, unknown>) => formatDate(asRes(row).checkIn),
    },
    {
      key: "checkOut",
      header: "Çıkış",
      render: (row: Record<string, unknown>) => formatDate(asRes(row).checkOut),
    },
    {
      key: "status",
      header: "Durum",
      render: (row: Record<string, unknown>) => statusBadge(asRes(row).status),
    },
    {
      key: "totalPrice",
      header: "Tutar",
      render: (row: Record<string, unknown>) => {
        const r = asRes(row);
        return formatCurrency(r.totalPrice, r.currency);
      },
    },
    {
      key: "source",
      header: "Kaynak",
      render: (row: Record<string, unknown>) => sourceBadge(asRes(row).source),
    },
    {
      key: "actions",
      header: "İşlemler",
      render: (row: Record<string, unknown>) => {
        const r = asRes(row);
        return (
          <button
            onClick={() => toast.info(`Rezervasyon: ${r.bookingNumber}`)}
            aria-label={`Detay: ${r.bookingNumber}`}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <Eye className="h-3.5 w-3.5" />
            Detay
          </button>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rezervasyonlar</h1>
          <p className="text-sm text-gray-500 mt-1">
            Toplam {data?.total ?? 0} rezervasyon
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          aria-label="CSV olarak indir"
        >
          <Download className="h-4 w-4" />
          {isExporting ? "İndiriliyor..." : "CSV İndir"}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="search"
            placeholder="Rezervasyon no veya misafir adı..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Rezervasyon ara"
          />
        </div>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="w-full sm:w-44 py-2 px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Duruma göre filtrele"
        >
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500 whitespace-nowrap">Tarih:</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            className="py-2 px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Başlangıç tarihi"
          />
          <span className="text-gray-400 text-sm">–</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            className="py-2 px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Bitiş tarihi"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {isLoading ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-10 bg-gray-100 rounded" />
            ))}
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={(reservations) as unknown as Record<string, unknown>[]}
            keyField="id"
            emptyMessage="Rezervasyon bulunamadı"
          />
        )}

        {(data?.totalPages ?? 0) > 1 && (
          <div className="mt-4 flex justify-end">
            <Pagination
              currentPage={page}
              totalPages={data?.totalPages ?? 1}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>
    </div>
  );
}
