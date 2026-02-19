"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, X } from "lucide-react";
import { DataTable, PriceRuleForm, ChartCard } from "@/components/admin";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import type { PriceRuleInput } from "@/lib/validators";

// ---- Types ----------------------------------------------------------------

interface PriceRule {
  id: string;
  name: string;
  type: "PERCENTAGE_DISCOUNT" | "FIXED_DISCOUNT" | "MARKUP";
  value: number;
  appliesTo: "ALL_CUSTOMERS" | "ALL_AGENCIES" | "SPECIFIC_AGENCY";
  hotelCode?: string | null;
  boardType?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  priority: number;
  isActive: boolean;
  agency?: { companyName: string } | null;
}

interface PriceRulesResponse {
  rules: PriceRule[];
  total: number;
}

interface AgenciesResponse {
  agencies: { id: string; companyName: string }[];
}

// ---- Helpers ----------------------------------------------------------------

const TYPE_LABELS: Record<string, string> = {
  PERCENTAGE_DISCOUNT: "% İndirim",
  FIXED_DISCOUNT: "Sabit İndirim",
  MARKUP: "Kar Marjı",
};

const APPLIES_LABELS: Record<string, string> = {
  ALL_CUSTOMERS: "Tüm Müşteriler",
  ALL_AGENCIES: "Tüm Acenteler",
  SPECIFIC_AGENCY: "Belirli Acente",
};

function typeBadge(type: string) {
  const map: Record<string, "default" | "warning" | "secondary"> = {
    PERCENTAGE_DISCOUNT: "default",
    FIXED_DISCOUNT: "warning",
    MARKUP: "secondary",
  };
  return <Badge variant={map[type] ?? "secondary"}>{TYPE_LABELS[type] ?? type}</Badge>;
}

// ---- Page ----------------------------------------------------------------

export default function PriceRulesPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading } = useQuery<PriceRulesResponse>({
    queryKey: ["admin-price-rules"],
    queryFn: () => fetch("/api/admin/price-rules").then((r) => r.json()),
  });

  const { data: agenciesData } = useQuery<AgenciesResponse>({
    queryKey: ["admin-agencies-list"],
    queryFn: () => fetch("/api/admin/agencies?limit=200").then((r) => r.json()),
  });

  const createMutation = useMutation({
    mutationFn: (payload: PriceRuleInput) =>
      fetch("/api/admin/price-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then((r) => {
        if (!r.ok) throw new Error("Kayıt başarısız");
        return r.json();
      }),
    onSuccess: () => {
      toast.success("Fiyat kuralı oluşturuldu");
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ["admin-price-rules"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      fetch(`/api/admin/price-rules/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      }).then((r) => {
        if (!r.ok) throw new Error("Güncelleme başarısız");
        return r.json();
      }),
    onSuccess: (_, vars) => {
      toast.success(vars.isActive ? "Kural aktif edildi" : "Kural pasif edildi");
      queryClient.invalidateQueries({ queryKey: ["admin-price-rules"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/admin/price-rules/${id}`, { method: "DELETE" }).then((r) => {
        if (!r.ok) throw new Error("Silme başarısız");
        return r.json();
      }),
    onSuccess: () => {
      toast.success("Kural silindi");
      queryClient.invalidateQueries({ queryKey: ["admin-price-rules"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const rules = data?.rules ?? [];
  const agencies = agenciesData?.agencies ?? [];

  const asRule = (row: Record<string, unknown>) => row as unknown as PriceRule;

  const columns = [
    { key: "name", header: "Kural Adı" },
    {
      key: "type",
      header: "Tip",
      render: (row: Record<string, unknown>) => typeBadge(asRule(row).type),
    },
    {
      key: "value",
      header: "Değer",
      render: (row: Record<string, unknown>) => {
        const r = asRule(row);
        return r.type === "PERCENTAGE_DISCOUNT" || r.type === "MARKUP"
          ? `%${r.value}`
          : `€${r.value}`;
      },
    },
    {
      key: "appliesTo",
      header: "Hedef",
      render: (row: Record<string, unknown>) => {
        const r = asRule(row);
        return (
          <span className="text-sm">
            {r.agency ? r.agency.companyName : APPLIES_LABELS[r.appliesTo]}
          </span>
        );
      },
    },
    {
      key: "hotelCode",
      header: "Otel",
      render: (row: Record<string, unknown>) =>
        asRule(row).hotelCode ?? <span className="text-gray-400 text-xs">Tümü</span>,
    },
    {
      key: "dates",
      header: "Tarihler",
      render: (row: Record<string, unknown>) => {
        const r = asRule(row);
        return r.startDate && r.endDate ? (
          <span className="text-xs">
            {formatDate(r.startDate)} – {formatDate(r.endDate)}
          </span>
        ) : (
          <span className="text-gray-400 text-xs">Süresiz</span>
        );
      },
    },
    {
      key: "priority",
      header: "Öncelik",
      render: (row: Record<string, unknown>) => (
        <span className="font-mono text-xs">{asRule(row).priority}</span>
      ),
    },
    {
      key: "isActive",
      header: "Aktif",
      render: (row: Record<string, unknown>) => {
        const r = asRule(row);
        return (
          <button
            role="switch"
            aria-checked={r.isActive}
            aria-label={`${r.name} ${r.isActive ? "pasif yap" : "aktif yap"}`}
            onClick={() => toggleMutation.mutate({ id: r.id, isActive: !r.isActive })}
            disabled={toggleMutation.isPending}
            className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50 ${
              r.isActive ? "bg-blue-600" : "bg-gray-200"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                r.isActive ? "translate-x-4" : "translate-x-0"
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
        const r = asRule(row);
        return (
          <button
            onClick={() => {
              if (confirm(`"${r.name}" kuralını silmek istediğinize emin misiniz?`)) {
                deleteMutation.mutate(r.id);
              }
            }}
            disabled={deleteMutation.isPending}
            aria-label={`Sil: ${r.name}`}
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
          <h1 className="text-2xl font-bold text-gray-900">Fiyat Kuralları</h1>
          <p className="text-sm text-gray-500 mt-1">
            Toplam {data?.total ?? 0} kural
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Yeni Kural Ekle
        </button>
      </div>

      {/* Create Form Panel */}
      {showForm && (
        <div className="bg-white rounded-xl border border-blue-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h3 className="text-base font-semibold text-gray-900">Yeni Fiyat Kuralı</h3>
            <button
              onClick={() => setShowForm(false)}
              aria-label="Formu kapat"
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="p-6 max-w-2xl">
            <PriceRuleForm
              agencies={agencies}
              onSubmit={(data) => createMutation.mutate(data)}
              loading={createMutation.isPending}
            />
          </div>
        </div>
      )}

      {/* Rules Table */}
      <ChartCard title="Mevcut Kurallar">
        {isLoading ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 bg-gray-100 rounded" />
            ))}
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={(rules) as unknown as Record<string, unknown>[]}
            keyField="id"
            emptyMessage="Henüz fiyat kuralı eklenmemiş"
          />
        )}
      </ChartCard>
    </div>
  );
}
