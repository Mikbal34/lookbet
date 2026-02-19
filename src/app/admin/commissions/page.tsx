"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, X } from "lucide-react";
import { DataTable, CommissionForm, ChartCard } from "@/components/admin";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import type { CommissionInput } from "@/lib/validators";

// ---- Types ----------------------------------------------------------------

interface Commission {
  id: string;
  type: "PERCENTAGE" | "FIXED";
  value: number;
  hotelCode?: string | null;
  boardType?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  isActive: boolean;
  agency: { id: string; companyName: string };
}

interface CommissionsResponse {
  commissions: Commission[];
  total: number;
}

interface AgenciesResponse {
  agencies: { id: string; companyName: string }[];
}

// ---- Page ----------------------------------------------------------------

export default function CommissionsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [agencyFilter, setAgencyFilter] = useState("");

  const { data, isLoading } = useQuery<CommissionsResponse>({
    queryKey: ["admin-commissions", agencyFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (agencyFilter) params.set("agencyId", agencyFilter);
      return fetch(`/api/admin/commissions?${params}`).then((r) => r.json());
    },
  });

  const { data: agenciesData } = useQuery<AgenciesResponse>({
    queryKey: ["admin-agencies-list"],
    queryFn: () => fetch("/api/admin/agencies?limit=200&status=APPROVED").then((r) => r.json()),
  });

  const createMutation = useMutation({
    mutationFn: (payload: CommissionInput) =>
      fetch("/api/admin/commissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then((r) => {
        if (!r.ok) throw new Error("Kayıt başarısız");
        return r.json();
      }),
    onSuccess: () => {
      toast.success("Komisyon oluşturuldu");
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ["admin-commissions"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/admin/commissions/${id}`, { method: "DELETE" }).then((r) => {
        if (!r.ok) throw new Error("Silme başarısız");
        return r.json();
      }),
    onSuccess: () => {
      toast.success("Komisyon silindi");
      queryClient.invalidateQueries({ queryKey: ["admin-commissions"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      fetch(`/api/admin/commissions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      }).then((r) => {
        if (!r.ok) throw new Error("Güncelleme başarısız");
        return r.json();
      }),
    onSuccess: (_, vars) => {
      toast.success(vars.isActive ? "Komisyon aktif edildi" : "Komisyon pasif edildi");
      queryClient.invalidateQueries({ queryKey: ["admin-commissions"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const commissions = data?.commissions ?? [];
  const agencies = agenciesData?.agencies ?? [];

  const asComm = (row: Record<string, unknown>) => row as unknown as Commission;

  const columns = [
    {
      key: "agency",
      header: "Acente",
      render: (row: Record<string, unknown>) => (
        <span className="font-medium">{asComm(row).agency.companyName}</span>
      ),
    },
    {
      key: "type",
      header: "Tip",
      render: (row: Record<string, unknown>) => {
        const c = asComm(row);
        return (
          <Badge variant={c.type === "PERCENTAGE" ? "default" : "warning"}>
            {c.type === "PERCENTAGE" ? "Yüzde" : "Sabit"}
          </Badge>
        );
      },
    },
    {
      key: "value",
      header: "Değer",
      render: (row: Record<string, unknown>) => {
        const c = asComm(row);
        return c.type === "PERCENTAGE" ? `%${c.value}` : `€${c.value}`;
      },
    },
    {
      key: "hotelCode",
      header: "Otel",
      render: (row: Record<string, unknown>) =>
        asComm(row).hotelCode ?? <span className="text-gray-400 text-xs">Tümü</span>,
    },
    {
      key: "boardType",
      header: "Board",
      render: (row: Record<string, unknown>) =>
        asComm(row).boardType ?? <span className="text-gray-400 text-xs">Tümü</span>,
    },
    {
      key: "dates",
      header: "Tarihler",
      render: (row: Record<string, unknown>) => {
        const c = asComm(row);
        return c.startDate && c.endDate ? (
          <span className="text-xs">
            {formatDate(c.startDate)} – {formatDate(c.endDate)}
          </span>
        ) : (
          <span className="text-gray-400 text-xs">Süresiz</span>
        );
      },
    },
    {
      key: "isActive",
      header: "Aktif",
      render: (row: Record<string, unknown>) => {
        const c = asComm(row);
        return (
          <button
            role="switch"
            aria-checked={c.isActive}
            aria-label={`Komisyon ${c.isActive ? "pasif yap" : "aktif yap"}`}
            onClick={() => toggleMutation.mutate({ id: c.id, isActive: !c.isActive })}
            disabled={toggleMutation.isPending}
            className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50 ${
              c.isActive ? "bg-blue-600" : "bg-gray-200"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                c.isActive ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
        );
      },
    },
    {
      key: "actions",
      header: "İşlemler",
      render: (row: Record<string, unknown>) => {
        const c = asComm(row);
        return (
          <button
            onClick={() => {
              if (confirm("Bu komisyonu silmek istediğinize emin misiniz?")) {
                deleteMutation.mutate(c.id);
              }
            }}
            disabled={deleteMutation.isPending}
            aria-label="Komisyonu sil"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Sil
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
          <h1 className="text-2xl font-bold text-gray-900">Komisyonlar</h1>
          <p className="text-sm text-gray-500 mt-1">
            Toplam {data?.total ?? 0} komisyon kaydı
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Yeni Komisyon
        </button>
      </div>

      {/* Create Form Panel */}
      {showForm && (
        <div className="bg-white rounded-xl border border-blue-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h3 className="text-base font-semibold text-gray-900">Yeni Komisyon</h3>
            <button
              onClick={() => setShowForm(false)}
              aria-label="Formu kapat"
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="p-6 max-w-2xl">
            <CommissionForm
              agencies={agencies}
              onSubmit={(data) => createMutation.mutate(data)}
              loading={createMutation.isPending}
            />
          </div>
        </div>
      )}

      {/* Agency Filter */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
            Acente Filtrele:
          </label>
          <select
            value={agencyFilter}
            onChange={(e) => setAgencyFilter(e.target.value)}
            className="w-64 py-2 px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Acenteye göre filtrele"
          >
            <option value="">Tüm Acenteler</option>
            {agencies.map((a) => (
              <option key={a.id} value={a.id}>
                {a.companyName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <ChartCard title="Komisyon Listesi">
        {isLoading ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 bg-gray-100 rounded" />
            ))}
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={(commissions) as unknown as Record<string, unknown>[]}
            keyField="id"
            emptyMessage="Komisyon bulunamadı"
          />
        )}
      </ChartCard>
    </div>
  );
}
