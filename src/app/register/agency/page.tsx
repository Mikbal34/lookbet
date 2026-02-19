import { Navbar, Footer } from "@/components/layout";
import { AgencyRegisterForm } from "@/components/auth";
import Link from "next/link";
import { Building2, Info } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Acente Kaydı - Lookbet",
  description: "Lookbet iş ortağı olmak için acente başvurusu yapın",
};

export default function AgencyRegisterPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl">
          {/* Card */}
          <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
            {/* Header */}
            <div className="mb-8 text-center">
              <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-indigo-600">
                <Building2 className="h-7 w-7 text-white" aria-hidden="true" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Acente Kaydı</h1>
              <p className="mt-1 text-sm text-gray-500">
                Lookbet iş ortağı olun, özel fiyatlardan yararlanın
              </p>
            </div>

            {/* Info note */}
            <div className="mb-6 flex gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4">
              <Info
                className="h-5 w-5 shrink-0 text-blue-600 mt-0.5"
                aria-hidden="true"
              />
              <div className="text-sm text-blue-800">
                <p className="font-semibold">Onay Süreci Hakkında</p>
                <p className="mt-1 leading-relaxed">
                  Başvurunuz alındıktan sonra ekibimiz en geç{" "}
                  <strong>2 iş günü</strong> içinde inceleyecek ve size email
                  ile bilgi verecektir. Onay sonrası özel B2B fiyatlarına
                  erişim sağlayabilirsiniz.
                </p>
              </div>
            </div>

            <AgencyRegisterForm />

            {/* Links */}
            <div className="mt-6 text-center text-sm">
              <p className="text-gray-500">
                Bireysel hesap mı istiyorsunuz?{" "}
                <Link
                  href="/register"
                  className="font-medium text-blue-600 hover:text-blue-700 hover:underline"
                >
                  Bireysel Kayıt
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
