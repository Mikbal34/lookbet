// Müşteri girişi — lookbet. tasarım dili: gradyan zemin üzerinde ortalanmış
// kart, serif başlık. Şifresiz akış: Google / Apple veya email + kod.

import { Suspense } from "react";
import Link from "next/link";
import { CustomerLogin } from "@/components/auth";
import { Logo } from "@/components/layout/logo";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Giriş Yap — lookbet.",
  description: "lookbet hesabına giriş yap veya saniyeler içinde hesap oluştur",
};

export default function LoginPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-10"
      style={{ background: "linear-gradient(160deg,#F6F8FA 60%,#E3EDF8)" }}
    >
      <div className="w-full max-w-[400px]">
        <div className="bg-white rounded-md shadow-[0_12px_28px_-10px_rgb(11_13_20/0.25)] p-8 sm:p-10">
          <div className="text-center">
            <Logo size="lg" className="inline-block" />
          </div>
          <h1 className="font-serif text-2xl font-normal text-center mt-6 mb-1">
            Tekrar hoş geldin
          </h1>
          <p className="text-[13.5px] text-muted text-center mb-6">
            Giriş yap veya saniyeler içinde hesap oluştur.
          </p>

          <Suspense
            fallback={<div className="h-64 animate-pulse bg-paper rounded-md" />}
          >
            <CustomerLogin />
          </Suspense>

          <div className="text-xs text-muted text-center mt-6 border-t border-line pt-4">
            Acente misin?{" "}
            <Link
              href="/agency/login"
              className="text-navy font-bold hover:text-gold transition-colors"
            >
              Partner girişi →
            </Link>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-muted/80">
          Devam ederek Kullanım Koşulları ve Gizlilik Politikası&apos;nı kabul
          etmiş olursunuz.
        </p>
      </div>
    </div>
  );
}
