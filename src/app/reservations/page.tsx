"use client";

// My Reservations page
// Fetches /api/reservations with optional status filter
// Tabs: Tümü, Onaylı, Beklemede, İptal

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarCheck, AlertCircle } from "lucide-react";
import { Navbar, Footer } from "@/components/layout";
import { ReservationCard } from "@/components/reservation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

type ReservationStatus = "ALL" | "CONFIRMED" | "PENDING" | "CANCELLED";

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

const STATUS_TABS: { value: ReservationStatus; label: string }[] = [
  { value: "ALL", label: "Tümü" },
  { value: "CONFIRMED", label: "Onaylı" },
  { value: "PENDING", label: "Beklemede" },
  { value: "CANCELLED", label: "İptal" },
];

async function fetchReservations(status: ReservationStatus): Promise<ReservationsResponse> {
  const qs = status !== "ALL" ? `?status=${status}` : "";
  const res = await fetch(`/api/reservations${qs}`);
  if (!res.ok) throw new Error("Rezervasyonlar alınamadı");
  return res.json();
}

function ReservationSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
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

function TabContent({ status }: { status: ReservationStatus }) {
  const { data, isLoading, isError } = useQuery<ReservationsResponse>({
    queryKey: ["reservations", status],
    queryFn: () => fetchReservations(status),
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
        <AlertCircle className="h-10 w-10 text-red-400 mb-3" aria-hidden="true" />
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
            <CalendarCheck className="h-14 w-14 text-blue-400" aria-hidden="true" />
          </div>
        </div>
        <h3 className="text-base font-semibold text-gray-900 mb-2">
          Rezervasyon bulunamadı
        </h3>
        <p className="text-sm text-gray-500 max-w-xs">
          {status === "ALL"
            ? "Henüz bir rezervasyonunuz bulunmuyor. Hemen otel arayın!"
            : `${STATUS_TABS.find((t) => t.value === status)?.label} durumunda rezervasyon yok.`}
        </p>
        {status === "ALL" && (
          <a
            href="/search"
            className="mt-4 inline-block bg-blue-600 text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors"
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
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
          {/* Page header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <CalendarCheck className="h-6 w-6 text-blue-600" aria-hidden="true" />
              Rezervasyonlarım
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Tüm rezervasyon geçmişinizi buradan yönetebilirsiniz.
            </p>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="ALL">
            <TabsList className="mb-6">
              {STATUS_TABS.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {STATUS_TABS.map((tab) => (
              <TabsContent key={tab.value} value={tab.value}>
                <TabContent status={tab.value} />
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
}
