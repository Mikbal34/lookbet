"use client";

// Rezervasyonlarım.
//
// Sekmeler alt çubuktaki kapsülün aynısı: başlığın hemen altında, ince ve
// kayan haplı. Eskiden alt çizgili klasik web sekmeleriydi — uygulamanın geri
// kalanıyla aynı dili konuşmuyordu.
//
// İki panel yerine tek panel var; içerik seçime göre değişiyor. React Query
// her iki dönemi ayrı anahtarda tuttuğu için geçiş, veri bir kez geldikten
// sonra ağa çıkmadan oluyor.

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { LbUyari, LbYatak } from "@/components/ui/icons";
import {AppHeader, Navbar, Footer } from "@/components/layout";
import { ReservationCard } from "@/components/reservation";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { Skeleton } from "@/components/ui/skeleton";

type Zaman = "gelecek" | "gecmis";

interface Reservation {
  id: string;
  bookingNumber?: string | null;
  hotelName?: string | null;
  hotelCode: string;
  checkIn: string;
  checkOut: string;
  status: string;
  totalPrice: number;
  discountedPrice?: number | null;
  currency: string;
  boardType?: string | null;
  roomType?: string | null;
}

interface ReservationsResponse {
  data: Reservation[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Durum ekseni yerine zaman ekseni: insan "gelecek konaklamam ne" veya
// "nerede kalmıştım" diye bakar, "beklemede olanlar hangileri" diye değil.
// Durum zaten her kartın üstünde rozet olarak duruyor.
//
// İptal ve başarısız kayıtlar tarihi ne olursa olsun "Geçmiş" tarafında
// (bkz. /api/reservations ?zaman) — eskiden FAILED'ın hiç sekmesi yoktu ve
// yalnızca "Tümü"de görünüyordu.
const ZAMAN_SEKMELERI: { value: Zaman; label: string }[] = [
  { value: "gelecek", label: "Gelecek konaklamalar" },
  { value: "gecmis", label: "Geçmiş" },
];

async function fetchReservations(zaman: Zaman): Promise<ReservationsResponse> {
  const res = await fetch(`/api/reservations?zaman=${zaman}`);
  if (!res.ok) throw new Error("Rezervasyonlar alınamadı");
  return res.json();
}

function ReservationSkeleton() {
  return (
    <div className="rounded-2xl bg-paper p-5 shadow-[0_1px_2px_rgb(11_13_20/0.04),0_6px_16px_-12px_rgb(11_13_20/0.18)]">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-3 w-52" />
        </div>
        <div className="flex items-center gap-3">
          <div className="space-y-1 text-right">
            <Skeleton className="h-6 w-24" />
          </div>
          <Skeleton className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function TabContent({ zaman }: { zaman: Zaman }) {
  const { data, isLoading, isError } = useQuery<ReservationsResponse>({
    queryKey: ["reservations", zaman],
    queryFn: () => fetchReservations(zaman),
    staleTime: 2 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Rezervasyonlar yükleniyor">
        {Array.from({ length: 4 }, (_, i) => (
          <ReservationSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <LbUyari size={38} className="mb-3 text-red-400" />
        <p className="text-sm text-gray-500">Rezervasyonlar yüklenirken hata oluştu.</p>
      </div>
    );
  }

  if (!data || data.data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="relative w-40 h-40 mb-6 rounded-2xl overflow-hidden shadow-md">
          <img
            src="https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=400&q=80&auto=format&fit=crop"
            alt=""
            className="w-full h-full object-cover opacity-30"
            aria-hidden="true"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <LbYatak size={52} className="text-navy/70" />
          </div>
        </div>
        <h3 className="text-base font-semibold text-gray-900 mb-2">
          Rezervasyon bulunamadı
        </h3>
        <p className="text-sm text-gray-500 max-w-xs">
          {zaman === "gelecek"
            ? "Yaklaşan bir konaklaman yok. Hemen otel ara!"
            : "Geçmiş konaklaman bulunmuyor."}
        </p>
        {zaman === "gelecek" && (
          <a
            href="/search"
            className="mt-4 inline-block bg-navy text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-navy-dark transition-colors"
          >
            Otel Ara
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.data.map((r) => (
        <ReservationCard key={r.id} reservation={r} />
      ))}
      {data.pagination.total > data.pagination.limit && (
        <p className="text-center text-sm text-gray-400 py-2">
          Toplam {data.pagination.total} rezervasyondan {data.data.length} tanesi gösteriliyor.
        </p>
      )}
    </div>
  );
}

export default function ReservationsPage() {
  const [zaman, setZaman] = React.useState<Zaman>("gelecek");

  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      <AppHeader baslik="Rezervasyonlarım" />
      <div className="web-only">
        <Navbar />
      </div>

      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-4 pb-8 sm:pt-8">
          {/* Başlık yalnızca web'de: app'te aynı başlık kimlik çubuğunda
              duruyor, iki kez yazmak yer kaplıyor. Açıklama ise her ikisinde
              de var — sekmelerin neyi böldüğünü söyleyen tek cümle o. */}
          <div className="mb-5">
            <h1 className="web-only mb-1 text-2xl font-bold text-gray-900 flex items-center gap-2">
              <LbYatak size={22} className="text-navy" />
              Rezervasyonlarım
            </h1>
            <p className="text-sm text-muted">
              Tüm rezervasyon geçmişinizi buradan yönetebilirsiniz.
            </p>
          </div>

          <SegmentedTabs
            className="mb-5 w-full max-w-sm"
            ariaLabel="Rezervasyon dönemi"
            panelId="rezervasyon-listesi"
            options={ZAMAN_SEKMELERI}
            value={zaman}
            onChange={setZaman}
          />

          <div id="rezervasyon-listesi" role="tabpanel">
            <TabContent zaman={zaman} />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
