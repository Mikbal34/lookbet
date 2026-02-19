"use client";

// User profile page
// Shows user info from session, editable form for name/email/phone
// Change password section with show/hide toggle
// If agency user: shows company info section with approval status

import * as React from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  User,
  Building2,
  Lock,
  Save,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  BadgeCheck,
} from "lucide-react";
import { Navbar, Footer } from "@/components/layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// ---------- sub-components ----------

function SectionCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <h2 className="mb-5 flex items-center gap-2 text-base font-semibold text-gray-900">
        <Icon className="h-5 w-5 text-blue-600" aria-hidden="true" />
        {title}
      </h2>
      {children}
    </div>
  );
}

interface AgencyInfo {
  companyName: string;
  taxId: string;
  address?: string;
  phone?: string;
  status: string;
}

// ---------- page ----------

export default function ProfilePage() {
  const { data: session, status, update: updateSession } = useSession();
  const router = useRouter();

  // Profile form
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [profileErrors, setProfileErrors] = React.useState<{
    name?: string;
  }>({});
  const [profileLoading, setProfileLoading] = React.useState(false);

  // Password form
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [passErrors, setPassErrors] = React.useState<{
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
    general?: string;
  }>({});
  const [passLoading, setPassLoading] = React.useState(false);
  const [showCurrent, setShowCurrent] = React.useState(false);
  const [showNew, setShowNew] = React.useState(false);

  // Agency info
  const [agencyInfo, setAgencyInfo] = React.useState<AgencyInfo | null>(null);
  const [agencyLoading, setAgencyLoading] = React.useState(false);

  const isAgency = session?.user?.role === "AGENCY";
  const roleLabel =
    session?.user?.role === "ADMIN"
      ? "Admin"
      : session?.user?.role === "AGENCY"
      ? "Acente"
      : "Müşteri";

  // Pre-fill form from session
  React.useEffect(() => {
    if (session?.user) {
      setName(session.user.name ?? "");
    }
  }, [session]);

  // Fetch agency info
  React.useEffect(() => {
    if (!isAgency || !session?.user?.agencyId) return;
    setAgencyLoading(true);
    fetch(`/api/admin/agencies/${session.user.agencyId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data && !data.error) {
          setAgencyInfo({
            companyName: data.companyName ?? "",
            taxId: data.taxId ?? "",
            address: data.address ?? "",
            phone: data.phone ?? "",
            status: data.status ?? "PENDING",
          });
        }
      })
      .catch(() => {})
      .finally(() => setAgencyLoading(false));
  }, [isAgency, session?.user?.agencyId]);

  // Redirect unauthenticated users
  React.useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/profile");
    }
  }, [status, router]);

  // Profile save
  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: typeof profileErrors = {};
    if (!name.trim()) errs.name = "İsim gerekli";
    setProfileErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setProfileLoading(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone: phone || undefined }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Profil güncellenirken hata oluştu");
        return;
      }
      await updateSession({ name });
      toast.success("Profil bilgileriniz güncellendi");
    } catch {
      toast.error("Profil güncellenirken bir hata oluştu");
    } finally {
      setProfileLoading(false);
    }
  };

  // Password change
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: typeof passErrors = {};
    if (!currentPassword) errs.currentPassword = "Mevcut şifre gerekli";
    if (!newPassword || newPassword.length < 6)
      errs.newPassword = "Yeni şifre en az 6 karakter olmalı";
    if (newPassword !== confirmPassword)
      errs.confirmPassword = "Şifreler eşleşmiyor";
    setPassErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setPassLoading(true);
    try {
      const res = await fetch("/api/profile/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) {
        const data = await res.json();
        setPassErrors({ general: data.error ?? "Şifre değiştirilirken hata oluştu" });
        return;
      }
      toast.success("Şifreniz başarıyla değiştirildi");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPassErrors({});
    } catch {
      setPassErrors({ general: "Şifre değiştirilirken bir hata oluştu" });
    } finally {
      setPassLoading(false);
    }
  };

  // ---------- loading / unauthenticated ----------

  if (status === "loading") {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Navbar />
        <main className="flex-1">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8 space-y-4">
            <Skeleton className="h-8 w-32 mb-6" />
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl border border-gray-100 bg-white p-6 space-y-4">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (status === "unauthenticated") return null;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8 space-y-5">
          {/* Page heading */}
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
              <User className="h-7 w-7 text-blue-600" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {session?.user?.name ?? "Profilim"}
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-sm text-gray-500">{session?.user?.email}</p>
                <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                  {roleLabel}
                </span>
              </div>
            </div>
          </div>

          {/* Personal info */}
          <SectionCard title="Kişisel Bilgiler" icon={User}>
            <form onSubmit={handleProfileSave} noValidate className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Ad Soyad"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setProfileErrors({});
                  }}
                  error={profileErrors.name}
                  autoComplete="name"
                  placeholder="Ahmet Yılmaz"
                />
                <Input
                  label="Email Adresi"
                  type="email"
                  value={session?.user?.email ?? ""}
                  disabled
                  hint="Email adresi değiştirilemez"
                />
                <Input
                  label="Telefon"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+90 555 000 00 00"
                  autoComplete="tel"
                />
              </div>
              <div className="flex justify-end pt-1">
                <Button type="submit" loading={profileLoading}>
                  <Save className="h-4 w-4" aria-hidden="true" />
                  Kaydet
                </Button>
              </div>
            </form>
          </SectionCard>

          {/* Change password */}
          <SectionCard title="Şifre Değiştir" icon={Lock}>
            <form onSubmit={handlePasswordChange} noValidate className="space-y-4">
              {passErrors.general && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
                  {passErrors.general}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Current password */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700" htmlFor="curr-pass">
                    Mevcut Şifre
                  </label>
                  <div className="relative">
                    <input
                      id="curr-pass"
                      type={showCurrent ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => {
                        setCurrentPassword(e.target.value);
                        setPassErrors((p) => ({ ...p, currentPassword: undefined }));
                      }}
                      autoComplete="current-password"
                      className={cn(
                        "h-10 w-full rounded-lg border px-3 pr-10 text-sm text-gray-900 bg-white",
                        "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors",
                        passErrors.currentPassword ? "border-red-400" : "border-gray-300 hover:border-gray-400"
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent((v) => !v)}
                      aria-label={showCurrent ? "Gizle" : "Göster"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {passErrors.currentPassword && (
                    <p role="alert" className="text-xs text-red-600">{passErrors.currentPassword}</p>
                  )}
                </div>

                {/* New password */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700" htmlFor="new-pass">
                    Yeni Şifre
                  </label>
                  <div className="relative">
                    <input
                      id="new-pass"
                      type={showNew ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        setPassErrors((p) => ({ ...p, newPassword: undefined }));
                      }}
                      autoComplete="new-password"
                      placeholder="En az 6 karakter"
                      className={cn(
                        "h-10 w-full rounded-lg border px-3 pr-10 text-sm text-gray-900 bg-white",
                        "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors",
                        passErrors.newPassword ? "border-red-400" : "border-gray-300 hover:border-gray-400"
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew((v) => !v)}
                      aria-label={showNew ? "Gizle" : "Göster"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {passErrors.newPassword && (
                    <p role="alert" className="text-xs text-red-600">{passErrors.newPassword}</p>
                  )}
                </div>

                {/* Confirm password */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700" htmlFor="confirm-pass">
                    Yeni Şifre Tekrar
                  </label>
                  <input
                    id="confirm-pass"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setPassErrors((p) => ({ ...p, confirmPassword: undefined }));
                    }}
                    autoComplete="new-password"
                    placeholder="Yeni şifrenizi tekrar girin"
                    className={cn(
                      "h-10 w-full rounded-lg border px-3 text-sm text-gray-900 bg-white",
                      "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors",
                      passErrors.confirmPassword ? "border-red-400" : "border-gray-300 hover:border-gray-400"
                    )}
                  />
                  {passErrors.confirmPassword && (
                    <p role="alert" className="text-xs text-red-600">{passErrors.confirmPassword}</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <Button type="submit" loading={passLoading} variant="secondary">
                  <Lock className="h-4 w-4" aria-hidden="true" />
                  Şifreyi Güncelle
                </Button>
              </div>
            </form>
          </SectionCard>

          {/* Agency info section */}
          {isAgency && (
            <SectionCard title="Şirket Bilgileri" icon={Building2}>
              {agencyLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-5 w-full" />
                  ))}
                </div>
              ) : agencyInfo ? (
                <div className="space-y-4">
                  {/* Status banner */}
                  <div
                    className={cn(
                      "flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium",
                      agencyInfo.status === "APPROVED"
                        ? "bg-green-50 text-green-700 border border-green-100"
                        : agencyInfo.status === "PENDING"
                        ? "bg-yellow-50 text-yellow-700 border border-yellow-100"
                        : "bg-red-50 text-red-700 border border-red-100"
                    )}
                  >
                    {agencyInfo.status === "APPROVED" ? (
                      <BadgeCheck className="h-4 w-4" aria-hidden="true" />
                    ) : agencyInfo.status === "PENDING" ? (
                      <AlertCircle className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <AlertCircle className="h-4 w-4" aria-hidden="true" />
                    )}
                    {agencyInfo.status === "APPROVED"
                      ? "Acente onaylı — B2B fiyatlarına erişiminiz aktif"
                      : agencyInfo.status === "PENDING"
                      ? "Onay bekleniyor"
                      : "Onay reddedildi"}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Şirket Adı</p>
                      <p className="text-sm text-gray-900">{agencyInfo.companyName}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Vergi Numarası</p>
                      <p className="text-sm text-gray-900">{agencyInfo.taxId}</p>
                    </div>
                    {agencyInfo.phone && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">Şirket Telefonu</p>
                        <p className="text-sm text-gray-900">{agencyInfo.phone}</p>
                      </div>
                    )}
                    {agencyInfo.address && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">Adres</p>
                        <p className="text-sm text-gray-900">{agencyInfo.address}</p>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-gray-400 border-t border-gray-50 pt-3">
                    Şirket bilgilerinizi güncellemek için destek ekibimizle iletişime geçin.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Şirket bilgileri yüklenemedi.</p>
              )}
            </SectionCard>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
