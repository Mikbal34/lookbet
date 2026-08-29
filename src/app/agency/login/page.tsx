// lookbet.partner girişi — split-screen tasarım: sol koyu gradyan tanıtım,
// sağda giriş formu. Girişte rol bazlı yönlendirme LoginForm içinde yapılır.

import { Suspense } from "react";
import Link from "next/link";
import { LoginForm } from "@/components/auth";
import { Logo } from "@/components/layout/logo";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Acente Girişi — lookbet.partner",
  description: "lookbet partner paneline giriş yapın",
};

export default function AgencyLoginPage() {
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      {/* Sol: tanıtım */}
      <div
        className="relative overflow-hidden flex flex-col justify-between p-6 sm:p-10 lg:p-14 min-h-[280px]"
        style={{
          background:
            "linear-gradient(160deg,#06163A 0%,#0B63E5 70%,#3D85EE 100%)",
        }}
      >
        <div
          className="absolute -left-[100px] -bottom-[100px] w-[420px] h-[420px] rounded-full border border-gold/35"
          aria-hidden="true"
        />
        <Logo variant="light" size="lg" suffix="PARTNER" />
        <div>
          <h2 className="font-serif text-3xl lg:text-[38px] font-normal text-paper leading-[1.2] mb-3.5">
            Acenteler için tek panel
          </h2>
          <p className="text-paper/70 text-[15.5px] leading-relaxed max-w-[400px]">
            Rezervasyonlar, komisyonlar ve kontenjan yönetimi — hepsi gerçek
            zamanlı.
          </p>
        </div>
        <div className="text-paper/50 text-[12.5px] hidden lg:block">
          © 2026 lookbet partner network
        </div>
      </div>

      {/* Sağ: form */}
      <div className="flex items-center justify-center p-6 sm:p-10 lg:p-14 bg-paper">
        <div className="w-full max-w-[380px]">
          <h1 className="font-serif text-[26px] sm:text-[28px] font-normal mb-1.5">
            lookbet<span className="text-gold">.</span>partner girişi
          </h1>
          <p className="text-sm text-muted mb-7">Partner hesabınla devam et.</p>

          <Suspense
            fallback={<div className="h-48 animate-pulse bg-white rounded-md" />}
          >
            <LoginForm />
          </Suspense>

          <div className="flex justify-between items-center text-[13px] mt-4">
            <a
              href="mailto:info@lookbet.com"
              className="font-semibold text-navy hover:text-gold transition-colors"
            >
              Şifremi unuttum
            </a>
            <Link
              href="/register/agency"
              className="font-semibold text-navy hover:text-gold transition-colors"
            >
              Partner başvurusu
            </Link>
          </div>

          <div className="text-xs text-muted mt-8 border-t border-line pt-4">
            Bireysel kullanıcı mısın?{" "}
            <Link
              href="/login"
              className="text-navy font-bold hover:text-gold transition-colors"
            >
              Üye girişi →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
