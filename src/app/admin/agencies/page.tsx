"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import { DataTable, AgencyApprovalCard } from "@/components/admin";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";

// ---- Types ----------------------------------------------------------------

interface Agency {
  id: string;
  companyName: string;
  taxId: string;
  phone?: string | null;
  discountRate: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  user: { id: string; name: string; email: string };
  createdAt: string;
  _count?: { commissions: number };
}

interface AgenciesResponse {
  agencies: Agency[];
  total: number;
  totalPages: number;
}

// ---- Status badge helper --------------------------------------------------

function agencyStatusBadge(status: string) {
  const map: Record<string, "warning" | "success" | "error"> = {
    PENDING: "warning",
    APPROVED: "success",
    REJECTED: "error",
  };
  const labels: Record<string, string> = {
    PENDING: "Bekliyor",
    APPROVED: "Onaylı",
    REJECTED: "Reddedildi",
  };
  return <Badge variant={map[status] ?? "secondary"}>{labels[status] ?? status}</Badge>;
}

// ---- Page ----------------------------------------------------------------

const TABS = ["pending", "all"] as const;
type Tab = (typeof TABS)[number];

export default function AgenciesPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("pending");
  const [page, setPage] = useState(1);

  // Pending agencies
  const pendingQuery = useQuery<AgenciesResponse>({
    queryKey: ["admin-agencies-pending"],
    queryFn: () =>
      fetch("/api/admin/agencies?status=PENDING&limit=50").then((r) => r.json()),
    enabled: tab === "pending",
  });

  // All agencies
  const allQuery = useQuery<AgenciesResponse>({
    queryKey: ["admin-agencies-all", page],
    queryFn: () =>
      fetch(`/api/admin/agencies?page=${page}`).then((r) => r.json()),
    enabled: tab === "all",
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/admin/agencies/${id}/approve`, { method: "POST" }).then((r) => {
        if (!r.ok) throw new Error("Onaylama başarısız");
        return r.json();
      }),
    onSuccess: () => {
      toast.success("Acente onaylandı");
      queryClient.invalidateQueries({ queryKey: ["admin-agencies"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/admin/agencies/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "REJECTED" }),
      }).then((r) => {
        if (!r.ok) throw new Error("Red işlemi başarısız");
        return r.json();
      }),
    onSuccess: () => {
      toast.success("Acente reddedildi");
      queryClient.invalidateQueries({ queryKey: ["admin-agencies"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/admin/agencies/${id}`, { method: "DELETE" }).then((r) => {
        if (!r.ok) throw new Error("Silme başarısız");
        return r.json();
      }),
    onSuccess: () => {
      toast.success("Acente silindi");
      queryClient.invalidateQueries({ queryKey: ["admin-agencies"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const pendingAgencies = pendingQuery.data?.agencies ?? [];
  const allAgencies = allQuery.data?.agencies ?? [];

  const asAgency = (row: Record<string, unknown>) => row as unknown as Agency;

  const allColumns = [
    { key: "companyName", header: "Şirket" },
    { key: "taxId", header: "Vergi No" },
    {
      key: "contact",
      header: "İletişim",
      render: (row: Record<string, unknown>) => {
        const a = asAgency(row);
        return (
          <div className="text-xs">
            <div className="font-medium">{a.user.name}</div>
            <div className="text-gray-500">{a.user.email}</div>
          </div>
        );
      },
    },
    {
      key: "discountRate",
      header: "İndirim Oranı",
      render: (row: Record<string, unknown>) => `%${asAgency(row).discountRate}`,
    },
    {
      key: "commissions",
      header: "Komisyon",
      render: (row: Record<string, unknown>) => asAgency(row)._count?.commissions ?? 0,
    },
    {
      key: "status",
      header: "Durum",
      render: (row: Record<string, unknown>) => agencyStatusBadge(asAgency(row).status),
    },
    {
      key: "actions",
      header: "İşlemler",
      render: (row: Record<string, unknown>) => {
        const a = asAgency(row);
        return (
          <div className="flex items-center gap-2">
            {a.status === "PENDING" && (
              <button
                onClick={() => approveMutation.mutate(a.id)}
                disabled={approveMutation.isPending}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
              >
                Onayla
              </button>
            )}
            <button
              onClick={() => toast.info(`Düzenle: ${a.companyName}`)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => {
                if (confirm("Bu acenteyi silmek istediğinize emin misiniz?")) {
                  deleteMutation.mutate(a.id);
                }
              }}
              disabled={deleteMutation.isPending}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Acenteler</h1>
        <p className="text-sm text-gray-500 mt-1">Acente yönetimi ve onay işlemleri</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1" aria-label="Acente sekmeleri">
          <button
            onClick={() => { setTab("pending"); setPage(1); }}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === "pending"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
            aria-selected={tab === "pending"}
          >
            Onay Bekleyen
            {pendingAgencies.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-orange-100 text-orange-700 rounded-full">
                {pendingAgencies.length}
              </span>
            )}
          </button>
          <button
            onClick={() => { setTab("all"); setPage(1); }}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === "all"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
            aria-selected={tab === "all"}
          >
            Tümü
          </button>
        </nav>
      </div>

      {/* Pending tab */}
      {tab === "pending" && (
        <div>
          {pendingQuery.isLoading ? (
            <div className="space-y-3 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-white rounded-xl border border-gray-200" />
              ))}
            </div>
          ) : pendingAgencies.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
              <p className="text-gray-500">Onay bekleyen acente bulunmuyor</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingAgencies.map((agency) => (
                <AgencyApprovalCard
                  key={agency.id}
                  agency={agency}
                  onApprove={(id) => approveMutation.mutate(id)}
                  onReject={(id) => rejectMutation.mutate(id)}
                  loading={approveMutation.isPending || rejectMutation.isPending}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* All tab */}
      {tab === "all" && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          {allQuery.isLoading ? (
            <div className="space-y-3 animate-pulse">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-10 bg-gray-100 rounded" />
              ))}
            </div>
          ) : (
            <DataTable
              columns={allColumns}
              data={(allAgencies) as unknown as Record<string, unknown>[]}
              keyField="id"
              emptyMessage="Acente bulunamadı"
            />
          )}

          {(allQuery.data?.totalPages ?? 0) > 1 && (
            <div className="mt-4 flex justify-end">
              <Pagination
                currentPage={page}
                totalPages={allQuery.data?.totalPages ?? 1}
                onPageChange={setPage}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
