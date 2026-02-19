"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { RefreshCw, Hotel, MapPin, DollarSign, CheckCircle2, XCircle } from "lucide-react";
import { StatsCard } from "@/components/admin";
import { formatDate } from "@/lib/utils";

// ---- Types ----------------------------------------------------------------

interface ContentStatus {
  lastSync: string | null;
  counts: {
    hotels: number;
    locations: number;
    currencies: number;
  };
}

interface SyncResult {
  success: boolean;
  hotelsUpserted: number;
  locationsUpserted: number;
  currenciesUpserted: number;
  errors: string[];
  duration: number;
}

// ---- Page ----------------------------------------------------------------

export default function ContentSyncPage() {
  const queryClient = useQueryClient();
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

  const { data: status } = useQuery<ContentStatus>({
    queryKey: ["content-status"],
    queryFn: () => fetch("/api/content/sync").then((r) => r.json()),
  });

  const syncMutation = useMutation({
    mutationFn: () =>
      fetch("/api/content/sync", { method: "POST" }).then((r) => {
        if (!r.ok) throw new Error("Senkronizasyon başarısız");
        return r.json() as Promise<SyncResult>;
      }),
    onSuccess: (result) => {
      setSyncResult(result);
      if (result.success) {
        toast.success("Senkronizasyon tamamlandı");
      } else {
        toast.warning("Senkronizasyon hatalarla tamamlandı");
      }
      queryClient.invalidateQueries({ queryKey: ["content-status"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const counts = status?.counts;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Content Sync</h1>
          <p className="text-sm text-gray-500 mt-1">
            {status?.lastSync
              ? `Son senkronizasyon: ${formatDate(status.lastSync)}`
              : "Henüz senkronizasyon yapılmamış"}
          </p>
        </div>
        <button
          onClick={() => {
            setSyncResult(null);
            syncMutation.mutate();
          }}
          disabled={syncMutation.isPending}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          aria-label="Senkronizasyonu başlat"
        >
          <RefreshCw
            className={`h-4 w-4 ${syncMutation.isPending ? "animate-spin" : ""}`}
          />
          {syncMutation.isPending ? "Senkronize ediliyor..." : "Sync Başlat"}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard
          title="Otel Sayısı"
          value={counts?.hotels ?? 0}
          icon={Hotel}
          iconColor="text-blue-600 bg-blue-100"
        />
        <StatsCard
          title="Lokasyon Sayısı"
          value={counts?.locations ?? 0}
          icon={MapPin}
          iconColor="text-green-600 bg-green-100"
        />
        <StatsCard
          title="Para Birimi Sayısı"
          value={counts?.currencies ?? 0}
          icon={DollarSign}
          iconColor="text-purple-600 bg-purple-100"
        />
      </div>

      {/* Loading state */}
      {syncMutation.isPending && (
        <div className="bg-white rounded-xl border border-blue-200 p-8">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-blue-100" />
              <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-gray-900">Senkronizasyon devam ediyor...</p>
              <p className="text-sm text-gray-500 mt-1">
                Otel, lokasyon ve para birimi verileri güncelleniyor. Bu işlem birkaç dakika sürebilir.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Sync Result */}
      {syncResult && !syncMutation.isPending && (
        <div
          className={`bg-white rounded-xl border p-6 ${
            syncResult.success ? "border-green-200" : "border-orange-200"
          }`}
        >
          <div className="flex items-start gap-3 mb-5">
            {syncResult.success ? (
              <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
            ) : (
              <XCircle className="h-6 w-6 text-orange-600 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <h3 className="font-semibold text-gray-900">
                {syncResult.success
                  ? "Senkronizasyon Tamamlandı"
                  : "Senkronizasyon Hatalarla Tamamlandı"}
              </h3>
              <p className="text-sm text-gray-500 mt-0.5">
                Süre: {(syncResult.duration / 1000).toFixed(1)} saniye
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            {[
              { label: "Otel", count: syncResult.hotelsUpserted },
              { label: "Lokasyon", count: syncResult.locationsUpserted },
              { label: "Para Birimi", count: syncResult.currenciesUpserted },
            ].map((item) => (
              <div
                key={item.label}
                className="bg-gray-50 rounded-lg p-4 text-center"
              >
                <p className="text-2xl font-bold text-gray-900">{item.count}</p>
                <p className="text-xs text-gray-500 mt-1">{item.label} güncellendi</p>
              </div>
            ))}
          </div>

          {syncResult.errors.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-orange-700 mb-2">
                Hatalar ({syncResult.errors.length})
              </h4>
              <ul className="space-y-1 max-h-40 overflow-y-auto">
                {syncResult.errors.map((error, i) => (
                  <li
                    key={i}
                    className="text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded"
                  >
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Info card */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-blue-800 mb-2">Senkronizasyon Hakkında</h3>
        <ul className="space-y-1 text-sm text-blue-700">
          <li>Royal API&apos;dan otel, lokasyon ve para birimi verileri çekilir.</li>
          <li>Mevcut kayıtlar güncellenir, yeni kayıtlar eklenir.</li>
          <li>Senkronizasyon tamamlanana kadar sayfadan ayrılmayın.</li>
        </ul>
      </div>
    </div>
  );
}
