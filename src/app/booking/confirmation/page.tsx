// Rezervasyon onayı.
//
// Bu ekranın üç işi var: güven ver, numarayı ver, yoluna devam ettir.
// Eskiden iki "bilgi kutusu" vardı ve ikisi de "şu sayfaya bakın" diyordu —
// bilgi değil, ekranı doldurma. Kaldırıldı; numara ve iki bağlantı kaldı.
//
// Altın kuralı: ekranın seni ileri götüren birincil eylemi. Burada o
// "Rezervasyonlarım" — az önce yaptığın şeye gitmek. İkincil "Yeni arama"
// çerçeveli kalıyor.

import { AppHeader, Navbar, Footer } from "@/components/layout";
import Link from "next/link";
import { LbOnay, LbTakvim, LbAra } from "@/components/ui/icons";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rezervasyon onaylandı — LookBeds",
};

interface ConfirmationPageProps {
  searchParams: Promise<{ bookingNumber?: string }>;
}

export default async function ConfirmationPage({
  searchParams,
}: ConfirmationPageProps) {
  const { bookingNumber } = await searchParams;

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <AppHeader geri="/reservations" baslik="Rezervasyon onayı" />
      <div className="web-only">
        <Navbar />
      </div>

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-lg">
          <div className="rounded-2xl bg-paper p-6 text-center shadow-[0_1px_2px_rgb(11_13_20/0.04),0_6px_16px_-12px_rgb(11_13_20/0.18)] sm:p-8">
            <div className="mb-5 flex justify-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-emerald-50">
                <LbOnay size={34} className="text-emerald-700" />
              </div>
            </div>

            <h1 className="mb-2 text-[22px] font-extrabold text-ink">
              Rezervasyonun onaylandı
            </h1>
            <p className="mb-6 text-[14px] leading-relaxed text-muted">
              Onay bilgileri e-posta adresine gönderilecek.
            </p>

            {bookingNumber && (
              <div className="mb-6 rounded-xl bg-chip-blue px-5 py-4">
                <p className="mb-1 text-[10.5px] font-bold tracking-[0.12em] text-navy uppercase">
                  Rezervasyon numarası
                </p>
                <p
                  className="font-mono text-[22px] font-extrabold text-ink"
                  aria-label={`Rezervasyon numarası: ${bookingNumber}`}
                >
                  {bookingNumber}
                </p>
                <p className="mt-1 text-[12.5px] text-slate-text">
                  Otelde bu numara sorulabilir
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2.5 sm:flex-row sm:justify-center">
              <Link
                href="/reservations"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-gold px-5 text-[15px] font-bold text-ink active:bg-gold-dark"
              >
                <LbTakvim size={18} />
                Rezervasyonlarım
              </Link>
              <Link
                href="/"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-line-strong bg-paper px-5 text-[15px] font-semibold text-slate-text active:bg-chip"
              >
                <LbAra size={18} />
                Yeni arama
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
