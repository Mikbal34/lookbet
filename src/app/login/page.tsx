import { Suspense } from "react";
import { Navbar, Footer } from "@/components/layout";
import { LoginForm } from "@/components/auth";
import Link from "next/link";
import { Hotel } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Giriş Yap - Lookbet",
  description: "Lookbet hesabınıza giriş yapın",
};

export default function LoginPage() {
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
                <Hotel className="h-7 w-7 text-white" aria-hidden="true" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Giriş Yap</h1>
              <p className="mt-1 text-sm text-gray-500">
                Lookbet hesabınıza giriş yapın
              </p>
            </div>

            <Suspense fallback={<div className="h-48 animate-pulse bg-gray-50 rounded-lg" />}>
              <LoginForm />
            </Suspense>

            {/* Links */}
            <div className="mt-6 space-y-3 text-center text-sm">
              <p className="text-gray-500">
                Hesabınız yok mu?{" "}
                <Link
                  href="/register"
                  className="font-medium text-blue-600 hover:text-blue-700 hover:underline"
                >
                  Kayıt Ol
                </Link>
              </p>
              <p className="text-gray-500">
                Acente misiniz?{" "}
                <Link
                  href="/register/agency"
                  className="font-medium text-blue-600 hover:text-blue-700 hover:underline"
                >
                  Acente Kaydı
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
