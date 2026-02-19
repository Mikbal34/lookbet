"use client";

// Usage:
// <AgencyRegisterForm />
// Agency registration. POSTs to /api/auth/register with type "agency".
// On success, shows "onay bekleniyor" message (does NOT redirect).

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, Eye, EyeOff, AlertCircle, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import {
  agencyRegisterSchema,
  type AgencyRegisterInput,
} from "@/lib/validators/auth.schema";

export function AgencyRegisterForm() {
  const [showPass, setShowPass] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [submitted, setSubmitted] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AgencyRegisterInput>({
    resolver: zodResolver(agencyRegisterSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      companyName: "",
      taxId: "",
      address: "",
      companyPhone: "",
    },
  });

  const onSubmit = async (data: AgencyRegisterInput) => {
    setServerError(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          phone: data.phone,
          password: data.password,
          confirmPassword: data.confirmPassword,
          type: "agency",
          companyName: data.companyName,
          taxId: data.taxId,
          address: data.address || undefined,
          companyPhone: data.companyPhone || undefined,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setServerError(json.error ?? "Kayit sirasinda bir hata olustu.");
        return;
      }

      setSubmitted(true);
    } catch {
      setServerError("Kayit sirasinda bir hata olustu. Lutfen tekrar deneyin.");
    }
  };

  // Approval pending state
  if (submitted) {
    return (
      <div
        role="status"
        className="flex flex-col items-center gap-4 py-10 text-center px-4"
      >
        <div className="h-16 w-16 rounded-full bg-amber-50 flex items-center justify-center">
          <Clock className="h-8 w-8 text-amber-500" aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">
            Basvurunuz Alindi
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed max-w-sm">
            Acente basvurunuz incelemeye alindi. Onay sureci tamamlandiginda
            email adresinize bildirim gonderilecektir.
          </p>
        </div>
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-5 py-3 text-sm text-amber-700 font-medium">
          Onay Bekleniyor
        </div>
        <Link
          href="/login"
          className="text-sm text-blue-600 hover:text-blue-700 hover:underline transition-colors"
        >
          Giris sayfasina don
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      aria-label="Acente kayit formu"
      className="space-y-6"
    >
      {/* Server error */}
      {serverError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
          {serverError}
        </div>
      )}

      {/* Section 1: Personal info */}
      <fieldset className="space-y-4">
        <legend className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
            1
          </span>
          Kisisel Bilgiler
        </legend>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Ad Soyad"
            placeholder="Ahmet Yilmaz"
            autoComplete="name"
            error={errors.name?.message}
            {...register("name")}
          />
          <Input
            label="Email Adresi"
            type="email"
            placeholder="ornek@mail.com"
            autoComplete="email"
            error={errors.email?.message}
            {...register("email")}
          />
          <Input
            label="Telefon"
            type="tel"
            placeholder="+90 555 000 00 00"
            autoComplete="tel"
            error={errors.phone?.message}
            {...register("phone")}
          />

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label
              className="text-sm font-medium text-gray-700"
              htmlFor="agency-password"
            >
              Sifre
            </label>
            <div className="relative">
              <input
                id="agency-password"
                type={showPass ? "text" : "password"}
                placeholder="En az 6 karakter"
                autoComplete="new-password"
                aria-invalid={!!errors.password}
                className={cn(
                  "h-10 w-full rounded-lg border px-3 pr-10 text-sm text-gray-900 placeholder:text-gray-400 bg-white",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors",
                  errors.password
                    ? "border-red-400 focus:ring-red-400"
                    : "border-gray-300 hover:border-gray-400"
                )}
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                aria-label={showPass ? "Sifreyi gizle" : "Sifreyi goster"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                {showPass ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
            {errors.password && (
              <p role="alert" className="text-xs text-red-600">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Confirm Password */}
          <div className="flex flex-col gap-1.5 sm:col-span-2 sm:w-1/2">
            <label
              className="text-sm font-medium text-gray-700"
              htmlFor="agency-confirm"
            >
              Sifre Tekrar
            </label>
            <div className="relative">
              <input
                id="agency-confirm"
                type={showConfirm ? "text" : "password"}
                placeholder="Sifrenizi tekrar girin"
                autoComplete="new-password"
                aria-invalid={!!errors.confirmPassword}
                className={cn(
                  "h-10 w-full rounded-lg border px-3 pr-10 text-sm text-gray-900 placeholder:text-gray-400 bg-white",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors",
                  errors.confirmPassword
                    ? "border-red-400 focus:ring-red-400"
                    : "border-gray-300 hover:border-gray-400"
                )}
                {...register("confirmPassword")}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                aria-label={showConfirm ? "Sifreyi gizle" : "Sifreyi goster"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                {showConfirm ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <p role="alert" className="text-xs text-red-600">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>
        </div>
      </fieldset>

      {/* Section 2: Company info */}
      <fieldset className="space-y-4">
        <legend className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
            2
          </span>
          <Building2 className="h-4 w-4 text-blue-600" aria-hidden="true" />
          Sirket Bilgileri
        </legend>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Sirket Adi"
            placeholder="ABC Turizm A.S."
            error={errors.companyName?.message}
            {...register("companyName")}
          />
          <Input
            label="Vergi Numarasi"
            placeholder="1234567890"
            hint="10 haneli vergi numarasi"
            error={errors.taxId?.message}
            {...register("taxId")}
          />
          <Input
            label="Sirket Telefonu (opsiyonel)"
            type="tel"
            placeholder="+90 212 000 00 00"
            error={errors.companyPhone?.message}
            {...register("companyPhone")}
          />
          <Input
            label="Adres (opsiyonel)"
            placeholder="Istanbul, Turkiye"
            error={errors.address?.message}
            {...register("address")}
          />
        </div>
      </fieldset>

      {/* Submit */}
      <Button type="submit" loading={isSubmitting} className="w-full" size="lg">
        <Building2 className="h-4 w-4" aria-hidden="true" />
        Acente Basvurusu Yap
      </Button>

      {/* Links */}
      <p className="text-center text-sm text-gray-500">
        Zaten hesabiniz var mi?{" "}
        <Link
          href="/login"
          className="text-blue-600 font-medium hover:text-blue-700 hover:underline transition-colors"
        >
          Giris Yap
        </Link>
      </p>
    </form>
  );
}
