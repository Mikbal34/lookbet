"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search, Pencil, Trash2 } from "lucide-react";
import { DataTable } from "@/components/admin";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { formatDate } from "@/lib/utils";

// ---- Types ----------------------------------------------------------------

interface User {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "AGENCY" | "CUSTOMER";
  isActive: boolean;
  createdAt: string;
}

interface UsersResponse {
  users: User[];
  total: number;
  totalPages: number;
}

// ---- Helpers ----------------------------------------------------------------

const ROLES = [
  { value: "", label: "Tüm Roller" },
  { value: "ADMIN", label: "Admin" },
  { value: "AGENCY", label: "Acente" },
  { value: "CUSTOMER", label: "Müşteri" },
];

function roleBadge(role: string) {
  const map: Record<string, "default" | "warning" | "secondary"> = {
    ADMIN: "default",
    AGENCY: "warning",
    CUSTOMER: "secondary",
  };
  const labels: Record<string, string> = {
    ADMIN: "Admin",
    AGENCY: "Acente",
    CUSTOMER: "Müşteri",
  };
  return <Badge variant={map[role] ?? "secondary"}>{labels[role] ?? role}</Badge>;
}

// ---- Page ----------------------------------------------------------------

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery<UsersResponse>({
    queryKey: ["admin-users", search, role, page],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (role) params.set("role", role);
      params.set("page", String(page));
      return fetch(`/api/admin/users?${params}`).then((r) => r.json());
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/admin/users/${id}`, { method: "DELETE" }).then((r) => {
        if (!r.ok) throw new Error("Silme başarısız");
        return r.json();
      }),
    onSuccess: () => {
      toast.success("Kullanıcı silindi");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleDelete = (id: string) => {
    if (confirm("Bu kullanıcıyı silmek istediğinize emin misiniz?")) {
      deleteMutation.mutate(id);
    }
  };

  const asUser = (row: Record<string, unknown>) => row as unknown as User;

  const columns = [
    { key: "name", header: "Ad Soyad" },
    { key: "email", header: "E-posta" },
    {
      key: "role",
      header: "Rol",
      render: (row: Record<string, unknown>) => roleBadge(asUser(row).role),
    },
    {
      key: "isActive",
      header: "Durum",
      render: (row: Record<string, unknown>) =>
        asUser(row).isActive ? (
          <Badge variant="success">Aktif</Badge>
        ) : (
          <Badge variant="error">Pasif</Badge>
        ),
    },
    {
      key: "createdAt",
      header: "Kayıt Tarihi",
      render: (row: Record<string, unknown>) => formatDate(asUser(row).createdAt),
    },
    {
      key: "actions",
      header: "İşlemler",
      render: (row: Record<string, unknown>) => {
        const u = asUser(row);
        return (
          <div className="flex items-center gap-2">
            <button
              onClick={() => toast.info(`Düzenleme: ${u.name}`)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              aria-label={`Düzenle: ${u.name}`}
            >
              <Pencil className="h-3.5 w-3.5" />
              Düzenle
            </button>
            <button
              onClick={() => handleDelete(u.id)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
              aria-label={`Sil: ${u.name}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Sil
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
        <h1 className="text-2xl font-bold text-gray-900">Kullanıcılar</h1>
        <p className="text-sm text-gray-500 mt-1">
          Toplam {data?.total ?? 0} kullanıcı
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="search"
            placeholder="Ad veya e-posta ile ara..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Kullanıcı ara"
          />
        </div>
        <select
          value={role}
          onChange={(e) => { setRole(e.target.value); setPage(1); }}
          className="w-full sm:w-44 py-2 px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Rol filtrele"
        >
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
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
            data={(data?.users ?? []) as unknown as Record<string, unknown>[]}
            keyField="id"
            emptyMessage="Kullanıcı bulunamadı"
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
