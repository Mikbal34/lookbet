import { Navbar, Footer } from "@/components/layout";
import { RegisterForm } from "@/components/auth";
import Link from "next/link";
import { UserPlus, Building2 } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kayıt Ol - Lookbet",
  description: "Ücretsiz hesap oluşturun ve otel rezervasyonlarına başlayın",
};

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
            {/* Header */}
            <div className="mb-8 text-center">
              <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-blue-600">
                <UserPlus className="h-7 w-7 text-white" aria-hidden="true" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Kayıt Ol</h1>
              <p className="mt-1 text-sm text-gray-500">
                Ücretsiz hesap oluşturun, hemen rezervasyon yapın
              </p>
            </div>

            <RegisterForm />

            {/* Links */}
            <div className="mt-6 space-y-3 text-center text-sm">
              <p className="text-gray-500">
                Zaten hesabınız var mı?{" "}
                <Link
                  href="/login"
                  className="font-medium text-blue-600 hover:text-blue-700 hover:underline"
                >
                  Giriş Yap
                </Link>
              </p>

              <div className="relative flex items-center gap-3 py-1">
                <div className="flex-1 border-t border-gray-200" />
                <span className="text-xs text-gray-400">veya</span>
                <div className="flex-1 border-t border-gray-200" />
              </div>

              <Link
                href="/register/agency"
                className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                <Building2 className="h-4 w-4 text-blue-600" aria-hidden="true" />
                Acente olarak kayıt ol
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
