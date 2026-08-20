"use client";

// Usage:
// <AgencyApplicationForm />
// Acente BAŞVURU formu — hesap oluşturmaz, şifre sormaz.
// POSTs to /api/agency-applications; başvuru admin panele düşer.

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Clock } from "lucide-react";
import {
  IdentificationCard,
  Buildings,
  PaperPlaneTilt,
} from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  agencyApplicationSchema,
  type AgencyApplicationInput,
} from "@/lib/validators/auth.schema";

export function AgencyApplicationForm() {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [submitted, setSubmitted] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AgencyApplicationInput>({
    resolver: zodResolver(agencyApplicationSchema),
    defaultValues: {
      contactName: "",
      email: "",
      phone: "",
      companyName: "",
      taxId: "",
      address: "",
      companyPhone: "",
      message: "",
    },
  });

  const onSubmit = async (data: AgencyApplicationInput) => {
    setServerError(null);
    try {
      const res = await fetch("/api/agency-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactName: data.contactName,
          email: data.email,
          phone: data.phone,
          companyName: data.companyName,
          taxId: data.taxId,
          address: data.address || undefined,
          companyPhone: data.companyPhone || undefined,
          message: data.message || undefined,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setServerError(json.error ?? "Başvuru sırasında bir hata oluştu.");
        return;
      }

      setSubmitted(true);
    } catch {
      setServerError("Başvuru sırasında bir hata oluştu. Lütfen tekrar deneyin.");
    }
  };

  // Başvuru alındı ekranı
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
            Başvurunuz Alındı
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed max-w-sm">
            Acente başvurunuz incelemeye alındı. Ekibimiz başvurunuzu
            onayladığında hesabınız oluşturulacak ve giriş bilgileriniz email
            adresinize iletilecektir.
          </p>
        </div>
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-5 py-3 text-sm text-amber-700 font-medium">
          Onay Bekleniyor
        </div>
        <Link
          href="/"
          className="text-sm text-blue-600 hover:text-blue-700 hover:underline transition-colors"
        >
          Ana sayfaya dön
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      aria-label="Acente başvuru formu"
      className="space-y-6"
    >
      {/* Server error */}
      {serverError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
          {serverError}
        </div>
      )}

      {/* Bölüm 1: Yetkili bilgileri */}
      <fieldset className="space-y-4">
        <legend className="mb-4 flex items-center gap-2.5 text-base font-bold text-ink">
          <IdentificationCard
            size={22}
            weight="duotone"
            className="text-navy"
            aria-hidden="true"
          />
          Yetkili Bilgileri
        </legend>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Ad Soyad"
            placeholder="Ahmet Yılmaz"
            autoComplete="name"
            error={errors.contactName?.message}
            {...register("contactName")}
          />
          <Input
            label="Email Adresi"
            type="email"
            placeholder="ornek@mail.com"
            autoComplete="email"
            hint="Onay sonrası giriş bilgileriniz bu adrese tanımlanır"
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
        </div>
      </fieldset>

      {/* Bölüm 2: Şirket bilgileri */}
      <fieldset className="space-y-4">
        <legend className="mb-4 flex items-center gap-2.5 text-base font-bold text-ink">
          <Buildings
            size={22}
            weight="duotone"
            className="text-navy"
            aria-hidden="true"
          />
          Şirket Bilgileri
        </legend>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Şirket Adı"
            placeholder="ABC Turizm A.Ş."
            error={errors.companyName?.message}
            {...register("companyName")}
          />
          <Input
            label="Vergi Numarası"
            placeholder="1234567890"
            hint="10 haneli vergi numarası"
            error={errors.taxId?.message}
            {...register("taxId")}
          />
          <Input
            label="Şirket Telefonu (opsiyonel)"
            type="tel"
            placeholder="+90 212 000 00 00"
            error={errors.companyPhone?.message}
            {...register("companyPhone")}
          />
          <Input
            label="Adres (opsiyonel)"
            placeholder="İstanbul, Türkiye"
            error={errors.address?.message}
            {...register("address")}
          />
        </div>

        {/* Mesaj */}
        <div className="flex flex-col gap-1.5">
          <label
            className="text-sm font-medium text-gray-700"
            htmlFor="application-message"
          >
            Mesajınız (opsiyonel)
          </label>
          <textarea
            id="application-message"
            rows={3}
            placeholder="Şirketiniz ve iş modeliniz hakkında kısaca bilgi verebilirsiniz"
            aria-invalid={!!errors.message}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
            {...register("message")}
          />
          {errors.message && (
            <p role="alert" className="text-xs text-red-600">
              {errors.message.message}
            </p>
          )}
        </div>
      </fieldset>

      {/* Submit */}
      <Button type="submit" loading={isSubmitting} className="w-full" size="lg">
        <PaperPlaneTilt size={17} weight="duotone" aria-hidden="true" />
        Başvuruyu Gönder
      </Button>

      {/* Links */}
      <p className="text-center text-sm text-gray-500">
        Zaten hesabınız var mı?{" "}
        <Link
          href="/agency/login"
          className="text-blue-600 font-medium hover:text-blue-700 hover:underline transition-colors"
        >
          Giriş Yap
        </Link>
      </p>
    </form>
  );
}
