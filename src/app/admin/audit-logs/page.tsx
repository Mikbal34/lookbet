"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, ScrollText } from "lucide-react";
import { Pagination } from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

// ---- Types ----------------------------------------------------------------

interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId?: string | null;
  details?: Record<string, unknown> | null;
  createdAt: string;
  user?: { id: string; name: string; email: string } | null;
}

interface AuditLogsResponse {
  logs: AuditLog[];
  total: number;
  totalPages: number;
}

interface UsersResponse {
  users: { id: string; name: string }[];
}

// ---- Helpers ----------------------------------------------------------------

const ENTITY_TYPES = [
  { value: "", label: "Tüm Varlıklar" },
  { value: "User", label: "Kullanıcı" },
  { value: "Agency", label: "Acente" },
  { value: "Reservation", label: "Rezervasyon" },
  { value: "PriceRule", label: "Fiyat Kuralı" },
  { value: "Commission", label: "Komisyon" },
  { value: "SystemSetting", label: "Ayar" },
];

function actionBadge(action: string) {
  const lower = action.toLowerCase();
  if (lower.includes("create") || lower.includes("add")) {
    return <Badge variant="success">{action}</Badge>;
  }
  if (lower.includes("delete") || lower.includes("remove")) {
    return <Badge variant="error">{action}</Badge>;
  }
  if (lower.includes("update") || lower.includes("edit") || lower.includes("patch")) {
    return <Badge variant="warning">{action}</Badge>;
  }
  return <Badge variant="secondary">{action}</Badge>;
}

// ---- Expandable Details ----------------------------------------------------------------

function DetailsCell({ details }: { details: Record<string, unknown> | null | undefined }) {
  const [expanded, setExpanded] = useState(false);

  if (!details || Object.keys(details).length === 0) {
    return <span className="text-gray-400 text-xs">-</span>;
  }

  return (
    <div>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
        aria-expanded={expanded}
        aria-label={expanded ? "Detayı gizle" : "Detayı göster"}
      >
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5" />
        )}
        {expanded ? "Gizle" : "Göster"}
      </button>
      {expanded && (
        <pre className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 overflow-auto max-h-48 max-w-xs font-mono leading-relaxed">
          {JSON.stringify(details, null, 2)}
        </pre>
      )}
    </div>
  );
}

// ---- Page ----------------------------------------------------------------

export default function AuditLogsPage() {
  const [entityType, setEntityType] = useState("");
  const [userId, setUserId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery<AuditLogsResponse>({
    queryKey: ["admin-audit-logs", entityType, userId, dateFrom, dateTo, page],
    queryFn: () => {
      const params = new URLSearchParams();
      if (entityType) params.set("entity", entityType);
      if (userId) params.set("userId", userId);
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);
      params.set("page", String(page));
      return fetch(`/api/admin/audit-logs?${params}`).then((r) => r.json());
    },
  });

  const { data: usersData } = useQuery<UsersResponse>({
    queryKey: ["admin-users-list"],
    queryFn: () => fetch("/api/admin/users?limit=200").then((r) => r.json()),
  });

  const logs = data?.logs ?? [];
  const users = usersData?.users ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Denetim Logları</h1>
        <p className="text-sm text-gray-500 mt-1">
          Toplam {data?.total ?? 0} log kaydı
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col sm:flex-row gap-3 flex-wrap">
        <select
          value={entityType}
          onChange={(e) => { setEntityType(e.target.value); setPage(1); }}
          className="w-full sm:w-48 py-2 px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Varlık türüne göre filtrele"
        >
          {ENTITY_TYPES.map((et) => (
            <option key={et.value} value={et.value}>
              {et.label}
            </option>
          ))}
        </select>

        <select
          value={userId}
          onChange={(e) => { setUserId(e.target.value); setPage(1); }}
          className="w-full sm:w-56 py-2 px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Kullanıcıya göre filtrele"
        >
          <option value="">Tüm Kullanıcılar</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
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

      {/* Logs Table */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {isLoading ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-10 bg-gray-100 rounded" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <ScrollText className="h-10 w-10 text-gray-300 mb-3" />
            <p className="text-gray-500 text-sm">Log kaydı bulunamadı</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  {["Tarih", "Kullanıcı", "İşlem", "Varlık", "Varlık ID", "Detaylar"].map(
                    (h) => (
                      <th
                        key={h}
                        className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-3 px-4"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 text-sm text-gray-700 whitespace-nowrap">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {log.user ? (
                        <div>
                          <div className="font-medium text-gray-900">{log.user.name}</div>
                          <div className="text-xs text-gray-500">{log.user.email}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">Sistem</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {actionBadge(log.action)}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700">
                      <Badge variant="secondary">{log.entity}</Badge>
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-500 font-mono">
                      {log.entityId ? (
                        <span title={log.entityId}>
                          {log.entityId.slice(0, 8)}...
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <DetailsCell details={log.details} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
