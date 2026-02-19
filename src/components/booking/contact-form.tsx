"use client";

// Usage:
// const { register, formState: { errors } } = useForm<CreateBookingInput>();
// <ContactForm register={register} errors={errors} />

import * as React from "react";
import { User, Mail, Phone } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { UseFormRegister, FieldErrors } from "react-hook-form";

export interface ContactFormProps {
  register: UseFormRegister<any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  errors: FieldErrors;
  className?: string;
}

interface FieldWrapperProps {
  label: string;
  error?: string;
  htmlFor: string;
  icon: React.ElementType;
  children: React.ReactNode;
}

function FieldWrapper({ label, error, htmlFor, icon: Icon, children }: FieldWrapperProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-gray-700">
        {label}
      </label>
      <div className="relative">
        <Icon
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
          aria-hidden="true"
        />
        {children}
      </div>
      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

const inputClass = (hasError: boolean) =>
  cn(
    "h-10 w-full rounded-lg border pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 bg-white",
    "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors",
    hasError
      ? "border-red-400 focus:ring-red-400"
      : "border-gray-300 hover:border-gray-400"
  );

export function ContactForm({ register, errors, className }: ContactFormProps) {
  const contactErrors = (errors as any)?.contact;

  return (
    <section
      className={cn(
        "bg-white rounded-2xl border border-gray-100 shadow-sm p-5",
        className
      )}
      aria-labelledby="contact-form-heading"
    >
      <h2
        id="contact-form-heading"
        className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2"
      >
        <User className="h-4 w-4 text-blue-500" aria-hidden="true" />
        Iletisim Bilgileri
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Name */}
        <FieldWrapper
          label="Ad"
          htmlFor="contact-name"
          icon={User}
          error={contactErrors?.name?.message as string | undefined}
        >
          <input
            id="contact-name"
            type="text"
            placeholder="Adiniz"
            autoComplete="given-name"
            aria-invalid={!!contactErrors?.name}
            className={inputClass(!!contactErrors?.name)}
            {...register("contact.name")}
          />
        </FieldWrapper>

        {/* Surname */}
        <FieldWrapper
          label="Soyad"
          htmlFor="contact-surname"
          icon={User}
          error={contactErrors?.surname?.message as string | undefined}
        >
          <input
            id="contact-surname"
            type="text"
            placeholder="Soyadiniz"
            autoComplete="family-name"
            aria-invalid={!!contactErrors?.surname}
            className={inputClass(!!contactErrors?.surname)}
            {...register("contact.surname")}
          />
        </FieldWrapper>

        {/* Email */}
        <FieldWrapper
          label="E-posta"
          htmlFor="contact-email"
          icon={Mail}
          error={contactErrors?.email?.message as string | undefined}
        >
          <input
            id="contact-email"
            type="email"
            placeholder="ornek@email.com"
            autoComplete="email"
            aria-invalid={!!contactErrors?.email}
            className={inputClass(!!contactErrors?.email)}
            {...register("contact.email")}
          />
        </FieldWrapper>

        {/* Phone */}
        <FieldWrapper
          label="Telefon"
          htmlFor="contact-phone"
          icon={Phone}
          error={contactErrors?.phone?.message as string | undefined}
        >
          <input
            id="contact-phone"
            type="tel"
            placeholder="+90 5XX XXX XX XX"
            autoComplete="tel"
            aria-invalid={!!contactErrors?.phone}
            className={inputClass(!!contactErrors?.phone)}
            {...register("contact.phone")}
          />
        </FieldWrapper>
      </div>
    </section>
  );
}
