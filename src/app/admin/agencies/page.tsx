"use client";

// Admin: Acenteler & Başvurular
// - "Başvurular": bekleyen acente başvuruları; onayda hesap oluşturulur,
//   geçici şifre bir kez gösterilir.
// - "Acenteler": mevcut acente hesapları (isApproved bazlı durum).
// - "Başvuru Geçmişi": sonuçlandırılmış başvurular.

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2, Copy, KeyRound, X } from "lucide-react";
import {
  DataTable,
  ApplicationReviewCard,
  type AgencyApplicationItem,
  type ApproveOptions,
} from "@/components/admin";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";

// ---- Types ----------------------------------------------------------------

interface Agency {
  id: string;
  companyName: string;
  taxId: string;
  phone?: string | null;
  discountRate: number;
  commission: number;
  isApproved: boolean;
  user: { id: string; name: string; email: string; isActive: boolean };
  createdAt: string;
  _count?: { reservations: number };
}

interface AgenciesResponse {
  agencies: Agency[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

interface ApplicationsResponse {
  applications: AgencyApplicationItem[];
  pendingCount: number;
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

interface ApprovedCredentials {
  email: string;
  tempPassword: string;
  companyName: string;
}

// ---- Page -----------------------------------------------------------------

const TABS = ["applications", "agencies", "history"] as const;
type Tab = (typeof TABS)[number];

export default function AgenciesPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("applications");
  const [page, setPage] = useState(1);
  const [credentials, setCredentials] = useState<ApprovedCredentials | null>(null);

  // Bekleyen başvurular
  const pendingQuery = useQuery<ApplicationsResponse>({
    queryKey: ["admin-applications-pending"],
    queryFn: () =>
      fetch("/api/admin/agency-applications?status=PENDING&limit=50").then((r) =>
        r.json()
      ),
  });

  // Sonuçlanmış başvurular (geçmiş)
  const historyQuery = useQuery<ApplicationsResponse>({
    queryKey: ["admin-applications-history", page],
    queryFn: () =>
      fetch(`/api/admin/agency-applications?page=${page}`).then((r) => r.json()),
    enabled: tab === "history",
  });

  // Acente hesapları
  const agenciesQuery = useQuery<AgenciesResponse>({
    queryKey: ["admin-agencies-all", page],
    queryFn: () => fetch(`/api/admin/agencies?page=${page}`).then((r) => r.json()),
    enabled: tab === "agencies",
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-applications-pending"] });
    queryClient.invalidateQueries({ queryKey: ["admin-applications-history"] });
    queryClient.invalidateQueries({ queryKey: ["admin-agencies-all"] });
  };

  const approveMutation = useMutation({
    mutationFn: async ({ id, options }: { id: string; options: ApproveOptions }) => {
      const r = await fetch(`/api/admin/agency-applications/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(options),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? "Onaylama başarısız");
      return json as {
        credentials: { email: string; tempPassword: string };
        agency: { companyName: string };
      };
    },
    onSuccess: (data) => {
      toast.success("Başvuru onaylandı, hesap oluşturuldu");
      setCredentials({
        email: data.credentials.email,
        tempPassword: data.credentials.tempPassword,
        companyName: data.agency.companyName,
      });
      invalidateAll();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const r = await fetch(`/api/admin/agency-applications/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? "Red işlemi başarısız");
      return json;
    },
    onSuccess: () => {
      toast.success("Başvuru reddedildi");
      invalidateAll();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteAgencyMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/admin/agencies/${id}`, { method: "DELETE" });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? "Silme başarısız");
      return json;
    },
    onSuccess: () => {
      toast.success("Acente silindi");
      invalidateAll();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const pendingApplications = pendingQuery.data?.applications ?? [];
  const pendingCount = pendingQuery.data?.pendingCount ?? 0;
  const historyApplications = (historyQuery.data?.applications ?? []).filter(
    (a) => a.status !== "PENDING"
  );
  const agencies = agenciesQuery.data?.agencies ?? [];

  const asAgency = (row: Record<string, unknown>) => row as unknown as Agency;
  const asApplication = (row: Record<string, unknown>) =>
    row as unknown as AgencyApplicationItem;

  // ---- Kolonlar -----------------------------------------------------------

  const agencyColumns = [
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
      header: "İndirim",
      render: (row: Record<string, unknown>) => `%${asAgency(row).discountRate}`,
    },
    {
      key: "commission",
      header: "Komisyon",
      render: (row: Record<string, unknown>) => `%${asAgency(row).commission}`,
    },
    {
      key: "reservations",
      header: "Rezervasyon",
      render: (row: Record<string, unknown>) =>
        asAgency(row)._count?.reservations ?? 0,
    },
    {
      key: "status",
      header: "Durum",
      render: (row: Record<string, unknown>) => {
        const a = asAgency(row);
        if (!a.user.isActive) return <Badge variant="secondary">Pasif</Badge>;
        return a.isApproved ? (
          <Badge variant="success">Aktif</Badge>
        ) : (
          <Badge variant="warning">Onaysız</Badge>
        );
      },
    },
    {
      key: "actions",
      header: "İşlemler",
      render: (row: Record<string, unknown>) => {
        const a = asAgency(row);
        return (
          <button
            onClick={() => {
              if (confirm(`${a.companyName} acentesini silmek istediğinize emin misiniz?`)) {
                deleteAgencyMutation.mutate(a.id);
              }
            }}
            disabled={deleteAgencyMutation.isPending}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        );
      },
    },
  ];

  const historyColumns = [
    { key: "companyName", header: "Şirket" },
    { key: "contactName", header: "Yetkili" },
    { key: "email", header: "Email" },
    {
      key: "status",
      header: "Sonuç",
      render: (row: Record<string, unknown>) => {
        const a = asApplication(row);
        return a.status === "APPROVED" ? (
          <Badge variant="success">Onaylandı</Badge>
        ) : (
          <Badge variant="error">Reddedildi</Badge>
        );
      },
    },
    {
      key: "reviewedBy",
      header: "İnceleyen",
      render: (row: Record<string, unknown>) =>
        asApplication(row).reviewedBy?.name ?? "-",
    },
    {
      key: "reviewedAt",
      header: "Tarih",
      render: (row: Record<string, unknown>) => {
        const a = asApplication(row);
        return a.reviewedAt
          ? new Date(a.reviewedAt).toLocaleDateString("tr-TR")
          : "-";
      },
    },
    {
      key: "rejectionReason",
      header: "Red Sebebi",
      render: (row: Record<string, unknown>) =>
        asApplication(row).rejectionReason ?? "-",
    },
  ];

  const tabButton = (key: Tab, label: string, badge?: number) => (
    <button
      onClick={() => {
        setTab(key);
        setPage(1);
      }}
      className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
        tab === key
          ? "border-navy text-navy"
          : "border-transparent text-gray-500 hover:text-gray-700"
      }`}
      aria-selected={tab === key}
    >
      {label}
      {badge !== undefined && badge > 0 && (
        <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-orange-100 text-orange-700 rounded-full">
          {badge}
        </span>
      )}
    </button>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-serif text-[22px] font-normal text-ink sm:text-[28px]">Acenteler</h1>
        <p className="text-sm text-gray-500 mt-1">
          Acente başvuruları ve hesap yönetimi — hesaplar yalnızca başvuru
          onayıyla açılır
        </p>
      </div>

      {/* Geçici şifre modalı: onay sonrası bir kez gösterilir */}
      {credentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-green-100 rounded-lg">
                  <KeyRound className="h-5 w-5 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-900">Hesap Oluşturuldu</h3>
              </div>
              <button
                onClick={() => setCredentials(null)}
                aria-label="Kapat"
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-3 text-sm text-gray-600">
              <strong>{credentials.companyName}</strong> için acente hesabı
              açıldı. Giriş bilgilerini acenteye iletin —{" "}
              <span className="font-medium text-red-600">
                şifre bir daha görüntülenemez.
              </span>
            </p>
            <div className="mt-4 space-y-2 rounded-lg bg-gray-50 border border-gray-200 p-4 text-sm font-mono">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate">{credentials.email}</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(credentials.email);
                    toast.success("Email kopyalandı");
                  }}
                  className="text-gray-400 hover:text-gray-600 shrink-0"
                  aria-label="Email kopyala"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span>{credentials.tempPassword}</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(credentials.tempPassword);
                    toast.success("Şifre kopyalandı");
                  }}
                  className="text-gray-400 hover:text-gray-600 shrink-0"
                  aria-label="Şifre kopyala"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1" aria-label="Acente sekmeleri">
          {tabButton("applications", "Başvurular", pendingCount)}
          {tabButton("agencies", "Acenteler")}
          {tabButton("history", "Başvuru Geçmişi")}
        </nav>
      </div>

      {/* Başvurular */}
      {tab === "applications" && (
        <div>
          {pendingQuery.isLoading ? (
            <div className="space-y-3 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-white rounded-md border border-[rgb(26_24_20/0.08)]" />
              ))}
            </div>
          ) : pendingApplications.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-md border border-[rgb(26_24_20/0.08)]">
              <p className="text-gray-500">Bekleyen acente başvurusu bulunmuyor</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingApplications.map((app) => (
                <ApplicationReviewCard
                  key={app.id}
                  application={app}
                  onApprove={(id, options) => approveMutation.mutate({ id, options })}
                  onReject={(id, reason) => rejectMutation.mutate({ id, reason })}
                  loading={approveMutation.isPending || rejectMutation.isPending}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Acenteler */}
      {tab === "agencies" && (
        <div className="bg-white rounded-md border border-[rgb(26_24_20/0.08)] p-6">
          {agenciesQuery.isLoading ? (
            <div className="space-y-3 animate-pulse">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-10 bg-gray-100 rounded" />
              ))}
            </div>
          ) : (
            <DataTable
              columns={agencyColumns}
              data={agencies as unknown as Record<string, unknown>[]}
              keyField="id"
              emptyMessage="Acente bulunamadı"
            />
          )}

          {(agenciesQuery.data?.pagination.totalPages ?? 0) > 1 && (
            <div className="mt-4 flex justify-end">
              <Pagination
                currentPage={page}
                totalPages={agenciesQuery.data?.pagination.totalPages ?? 1}
                onPageChange={setPage}
              />
            </div>
          )}
        </div>
      )}

      {/* Başvuru geçmişi */}
      {tab === "history" && (
        <div className="bg-white rounded-md border border-[rgb(26_24_20/0.08)] p-6">
          {historyQuery.isLoading ? (
            <div className="space-y-3 animate-pulse">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-10 bg-gray-100 rounded" />
              ))}
            </div>
          ) : (
            <DataTable
              columns={historyColumns}
              data={historyApplications as unknown as Record<string, unknown>[]}
              keyField="id"
              emptyMessage="Sonuçlanmış başvuru bulunmuyor"
            />
          )}

          {(historyQuery.data?.pagination.totalPages ?? 0) > 1 && (
            <div className="mt-4 flex justify-end">
              <Pagination
                currentPage={page}
                totalPages={historyQuery.data?.pagination.totalPages ?? 1}
                onPageChange={setPage}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
