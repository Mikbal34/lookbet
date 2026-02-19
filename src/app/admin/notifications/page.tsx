"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bell, CheckCheck, Send, Circle, CheckCircle2, Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

// ---- Types ----------------------------------------------------------------

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "INFO" | "WARNING" | "SUCCESS" | "ERROR";
  isRead: boolean;
  createdAt: string;
  user?: { name: string; email: string } | null;
  role?: string | null;
}

interface NotificationsResponse {
  notifications: Notification[];
  total: number;
  unreadCount: number;
}

interface UsersResponse {
  users: { id: string; name: string; email: string }[];
}

// ---- Helpers ----------------------------------------------------------------

function notifTypeBadge(type: string) {
  const map: Record<string, "default" | "warning" | "success" | "error"> = {
    INFO: "default",
    WARNING: "warning",
    SUCCESS: "success",
    ERROR: "error",
  };
  const labels: Record<string, string> = {
    INFO: "Bilgi",
    WARNING: "Uyarı",
    SUCCESS: "Başarılı",
    ERROR: "Hata",
  };
  return <Badge variant={map[type] ?? "secondary"}>{labels[type] ?? type}</Badge>;
}

// ---- Create Notification Form ----------------------------------------------------------------

interface CreateFormProps {
  users: { id: string; name: string; email: string }[];
  onClose: () => void;
  onCreated: () => void;
}

function CreateNotificationForm({ users, onClose, onCreated }: CreateFormProps) {
  const [targetType, setTargetType] = useState<"user" | "role" | "all">("all");
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState("CUSTOMER");
  const [type, setType] = useState("INFO");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      toast.error("Başlık ve mesaj zorunludur");
      return;
    }
    setIsSubmitting(true);
    try {
      const payload: Record<string, unknown> = { type, title, message };
      if (targetType === "user" && userId) payload.userId = userId;
      if (targetType === "role") payload.role = role;

      const res = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Gönderme başarısız");
      toast.success("Bildirim gönderildi");
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Hata oluştu");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-blue-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h3 className="text-base font-semibold text-gray-900">Yeni Bildirim Oluştur</h3>
        <button
          onClick={onClose}
          aria-label="Formu kapat"
          className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="p-6 space-y-4 max-w-2xl">
        {/* Target type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Alıcı</label>
          <div className="flex gap-2">
            {(["all", "role", "user"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTargetType(t)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                  targetType === t
                    ? "bg-blue-600 border-blue-600 text-white"
                    : "border-gray-300 text-gray-600 hover:border-blue-400"
                }`}
              >
                {t === "all" ? "Herkese" : t === "role" ? "Rol" : "Kullanıcı"}
              </button>
            ))}
          </div>
        </div>

        {targetType === "user" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kullanıcı</label>
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Kullanıcı seç"
            >
              <option value="">Kullanıcı Seçin</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
          </div>
        )}

        {targetType === "role" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Rol seç"
            >
              <option value="CUSTOMER">Müşteri</option>
              <option value="AGENCY">Acente</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
        )}

        {/* Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tür</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Bildirim türü"
          >
            <option value="INFO">Bilgi</option>
            <option value="WARNING">Uyarı</option>
            <option value="SUCCESS">Başarılı</option>
            <option value="ERROR">Hata</option>
          </select>
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Başlık</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Bildirim başlığı"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        {/* Message */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mesaj</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Bildirim mesajı..."
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            required
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          {isSubmitting ? "Gönderiliyor..." : "Gönder"}
        </button>
      </form>
    </div>
  );
}

// ---- Page ----------------------------------------------------------------

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading } = useQuery<NotificationsResponse>({
    queryKey: ["admin-notifications"],
    queryFn: () => fetch("/api/admin/notifications").then((r) => r.json()),
  });

  const { data: usersData } = useQuery<UsersResponse>({
    queryKey: ["admin-users-list"],
    queryFn: () => fetch("/api/admin/users?limit=200").then((r) => r.json()),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () =>
      fetch("/api/admin/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      }).then((r) => {
        if (!r.ok) throw new Error("Güncelleme başarısız");
        return r.json();
      }),
    onSuccess: () => {
      toast.success("Tüm bildirimler okundu olarak işaretlendi");
      queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleReadMutation = useMutation({
    mutationFn: ({ id, isRead }: { id: string; isRead: boolean }) =>
      fetch(`/api/admin/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead }),
      }).then((r) => {
        if (!r.ok) throw new Error("Güncelleme başarısız");
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const notifications = data?.notifications ?? [];
  const users = usersData?.users ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bildirimler</h1>
          <p className="text-sm text-gray-500 mt-1">
            {data?.unreadCount ?? 0} okunmamış bildirim
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(data?.unreadCount ?? 0) > 0 && (
            <button
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              aria-label="Tümünü okundu olarak işaretle"
            >
              <CheckCheck className="h-4 w-4" />
              Tümünü Okundu İşaretle
            </button>
          )}
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Yeni Bildirim
          </button>
        </div>
      </div>

      {/* Create Form */}
      {showForm && (
        <CreateNotificationForm
          users={users}
          onClose={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false);
            queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
          }}
        />
      )}

      {/* Notifications List */}
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {isLoading ? (
          <div className="p-6 space-y-4 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-3">
                <div className="h-5 w-5 bg-gray-200 rounded-full flex-shrink-0 mt-1" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-48" />
                  <div className="h-3 bg-gray-100 rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Bell className="h-10 w-10 text-gray-300 mb-3" />
            <p className="text-gray-500 text-sm">Bildirim bulunamadı</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              className={`flex items-start gap-4 p-5 transition-colors ${
                !notif.isRead ? "bg-blue-50/50" : "hover:bg-gray-50"
              }`}
            >
              <button
                onClick={() =>
                  toggleReadMutation.mutate({ id: notif.id, isRead: !notif.isRead })
                }
                aria-label={notif.isRead ? "Okunmadı işaretle" : "Okundu işaretle"}
                disabled={toggleReadMutation.isPending}
                className="mt-0.5 flex-shrink-0 text-gray-400 hover:text-blue-600 transition-colors disabled:opacity-50"
              >
                {notif.isRead ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <Circle className="h-5 w-5 text-blue-500" />
                )}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-sm font-semibold ${
                      notif.isRead ? "text-gray-700" : "text-gray-900"
                    }`}
                  >
                    {notif.title}
                  </span>
                  {notifTypeBadge(notif.type)}
                  {!notif.isRead && (
                    <span className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{notif.message}</p>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                  <span>{formatDate(notif.createdAt)}</span>
                  {notif.user && (
                    <span>Alıcı: {notif.user.name}</span>
                  )}
                  {notif.role && !notif.user && (
                    <span>Rol: {notif.role}</span>
                  )}
                  {!notif.user && !notif.role && (
                    <span>Herkese</span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
