"use client";

// Usage:
// <RegisterForm />
// Customer registration. POSTs to /api/auth/register with type "customer".
// On success, redirects to /login.

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, UserPlus, AlertCircle, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { registerSchema, type RegisterInput } from "@/lib/validators/auth.schema";

export function RegisterForm() {
  const router = useRouter();
  const [showPass, setShowPass] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: RegisterInput) => {
    setServerError(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          phone: data.phone || undefined,
          password: data.password,
          confirmPassword: data.confirmPassword,
          type: "customer",
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setServerError(json.error ?? "Kayit sirasinda bir hata olustu.");
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch {
      setServerError("Kayit sirasinda bir hata olustu. Lutfen tekrar deneyin.");
    }
  };

  if (success) {
    return (
      <div
        role="status"
        className="flex flex-col items-center gap-3 py-8 text-center"
      >
        <CheckCircle2 className="h-12 w-12 text-green-500" aria-hidden="true" />
        <h3 className="text-base font-semibold text-gray-900">
          Hesabiniz olusturuldu
        </h3>
        <p className="text-sm text-gray-500">
          Giris sayfasina yonlendiriliyorsunuz...
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      aria-label="Kayit formu"
      className="space-y-4"
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

      {/* Name */}
      <Input
        label="Ad Soyad"
        placeholder="Ahmet Yilmaz"
        autoComplete="name"
        error={errors.name?.message}
        {...register("name")}
      />

      {/* Email */}
      <Input
        label="Email Adresi"
        type="email"
        placeholder="ornek@mail.com"
        autoComplete="email"
        error={errors.email?.message}
        {...register("email")}
      />

      {/* Phone */}
      <Input
        label="Telefon (opsiyonel)"
        type="tel"
        placeholder="+90 555 000 00 00"
        autoComplete="tel"
        error={errors.phone?.message}
        {...register("phone")}
      />

      {/* Password */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700" htmlFor="reg-password">
          Sifre
        </label>
        <div className="relative">
          <input
            id="reg-password"
            type={showPass ? "text" : "password"}
            placeholder="En az 6 karakter"
            autoComplete="new-password"
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? "reg-pass-error" : undefined}
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
          <p id="reg-pass-error" role="alert" className="text-xs text-red-600">
            {errors.password.message}
          </p>
        )}
      </div>

      {/* Confirm Password */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700" htmlFor="reg-confirm">
          Sifre Tekrar
        </label>
        <div className="relative">
          <input
            id="reg-confirm"
            type={showConfirm ? "text" : "password"}
            placeholder="Sifrenizi tekrar girin"
            autoComplete="new-password"
            aria-invalid={!!errors.confirmPassword}
            aria-describedby={errors.confirmPassword ? "reg-confirm-error" : undefined}
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
          <p id="reg-confirm-error" role="alert" className="text-xs text-red-600">
            {errors.confirmPassword.message}
          </p>
        )}
      </div>

      {/* Submit */}
      <Button type="submit" loading={isSubmitting} className="w-full" size="lg">
        <UserPlus className="h-4 w-4" aria-hidden="true" />
        Kayit Ol
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
