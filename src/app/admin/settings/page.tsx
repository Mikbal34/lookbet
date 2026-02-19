"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save, Settings2 } from "lucide-react";

// ---- Types ----------------------------------------------------------------

interface SystemSetting {
  key: string;
  value: string;
  description?: string | null;
}

interface SettingsResponse {
  settings: SystemSetting[];
}

// ---- Default settings template ----------------------------------------------------------------

const SETTING_META: Record<string, { label: string; description: string; placeholder?: string }> = {
  default_currency: {
    label: "Varsayılan Para Birimi",
    description: "Sistem genelinde kullanılacak para birimi kodu (ör. EUR, USD, TRY)",
    placeholder: "EUR",
  },
  default_nationality: {
    label: "Varsayılan Uyruk",
    description: "Varsayılan müşteri uyruk kodu (ör. TR, DE, GB)",
    placeholder: "TR",
  },
  feed_id_b2c: {
    label: "B2C Feed ID",
    description: "Bireysel müşteriler için Royal API feed kimliği",
    placeholder: "feed-b2c-001",
  },
  feed_id_b2b: {
    label: "B2B Feed ID",
    description: "Acenteler için Royal API feed kimliği",
    placeholder: "feed-b2b-001",
  },
};

const DEFAULT_KEYS = Object.keys(SETTING_META);

// ---- Page ----------------------------------------------------------------

export default function SettingsPage() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = useState(false);

  const { data, isLoading } = useQuery<SettingsResponse>({
    queryKey: ["admin-settings"],
    queryFn: () => fetch("/api/admin/settings").then((r) => r.json()),
  });

  // Populate state when data arrives
  useEffect(() => {
    if (!data) return;
    const map: Record<string, string> = {};
    // Start with defaults
    DEFAULT_KEYS.forEach((k) => (map[k] = ""));
    // Override with API values
    data.settings.forEach((s) => {
      map[s.key] = s.value;
    });
    setValues(map);
    setIsDirty(false);
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: values }),
      }).then((r) => {
        if (!r.ok) throw new Error("Kayıt başarısız");
        return r.json();
      }),
    onSuccess: () => {
      toast.success("Ayarlar kaydedildi");
      setIsDirty(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleChange = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  // Merge API settings with default keys so all are shown
  const allSettings: SystemSetting[] = DEFAULT_KEYS.map((key) => ({
    key,
    value: values[key] ?? "",
    description: data?.settings.find((s) => s.key === key)?.description ?? null,
  }));

  // Also show any extra keys from the API that aren't in defaults
  if (data) {
    data.settings.forEach((s) => {
      if (!DEFAULT_KEYS.includes(s.key)) {
        allSettings.push({ key: s.key, value: values[s.key] ?? s.value, description: s.description });
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sistem Ayarları</h1>
          <p className="text-sm text-gray-500 mt-1">Uygulama geneli yapılandırma değerleri</p>
        </div>
        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || !isDirty}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          aria-label="Ayarları kaydet"
        >
          <Save className="h-4 w-4" />
          {saveMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
        </button>
      </div>

      {/* Settings Form */}
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {isLoading ? (
          <div className="p-6 space-y-6 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-32" />
                <div className="h-9 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        ) : (
          allSettings.map((setting) => {
            const meta = SETTING_META[setting.key];
            return (
              <div key={setting.key} className="p-6 flex flex-col sm:flex-row sm:items-start gap-4">
                <div className="sm:w-64 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <Settings2 className="h-4 w-4 text-gray-400" />
                    <label
                      htmlFor={`setting-${setting.key}`}
                      className="text-sm font-semibold text-gray-900"
                    >
                      {meta?.label ?? setting.key}
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 ml-6">
                    {meta?.description ?? setting.description ?? ""}
                  </p>
                  <code className="text-xs text-gray-400 mt-1 ml-6 block font-mono">
                    {setting.key}
                  </code>
                </div>
                <div className="flex-1">
                  <input
                    id={`setting-${setting.key}`}
                    type="text"
                    value={values[setting.key] ?? ""}
                    onChange={(e) => handleChange(setting.key, e.target.value)}
                    placeholder={meta?.placeholder ?? ""}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    aria-describedby={`desc-${setting.key}`}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Unsaved changes indicator */}
      {isDirty && (
        <div className="flex items-center justify-between bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
          <p className="text-sm text-yellow-800 font-medium">
            Kaydedilmemiş değişiklikler var.
          </p>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="text-sm font-medium text-yellow-800 underline underline-offset-2 hover:text-yellow-900 disabled:opacity-50"
          >
            Şimdi Kaydet
          </button>
        </div>
      )}
    </div>
  );
}
