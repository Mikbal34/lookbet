import { Navbar, Footer } from "@/components/layout";
import Link from "next/link";
import { CheckCircle2, CalendarCheck, Home } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rezervasyon Onaylandı - Lookbet",
};

interface ConfirmationPageProps {
  searchParams: Promise<{ bookingNumber?: string }>;
}

export default async function ConfirmationPage({
  searchParams,
}: ConfirmationPageProps) {
  const { bookingNumber } = await searchParams;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">
          {/* Success card */}
          <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm text-center">
            {/* Icon */}
            <div className="mb-6 flex justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2
                  className="h-10 w-10 text-green-600"
                  aria-hidden="true"
                />
              </div>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Rezervasyonunuz Onaylandı!
            </h1>
            <p className="text-gray-500 text-sm mb-6">
              Rezervasyonunuz başarıyla oluşturuldu. Onay bilgileri email
              adresinize gönderilecektir.
            </p>

            {/* Booking number */}
            {bookingNumber && (
              <div className="mb-8 rounded-xl border border-blue-100 bg-blue-50 px-6 py-4">
                <p className="text-xs font-medium text-blue-600 uppercase tracking-wider mb-1">
                  Rezervasyon Numarası
                </p>
                <p
                  className="text-2xl font-bold font-mono text-blue-700"
                  aria-label={`Rezervasyon numarası: ${bookingNumber}`}
                >
                  #{bookingNumber}
                </p>
                <p className="text-xs text-blue-500 mt-1">
                  Bu numarayı kaydedin
                </p>
              </div>
            )}

            {/* Info boxes */}
            <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <p className="text-xs font-medium text-gray-500 mb-1">Sonraki Adım</p>
                <p className="text-sm text-gray-700">
                  Rezervasyon detaylarınızı &quot;Rezervasyonlarım&quot; sayfasından
                  takip edebilirsiniz.
                </p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <p className="text-xs font-medium text-gray-500 mb-1">İptal Politikası</p>
                <p className="text-sm text-gray-700">
                  İptal koşulları rezervasyon detay sayfasında görüntülenebilir.
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/reservations"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                <CalendarCheck className="h-4 w-4" aria-hidden="true" />
                Rezervasyonlarım
              </Link>
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Home className="h-4 w-4" aria-hidden="true" />
                Ana Sayfa
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
