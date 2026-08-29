"use client";

// Reservation detail page
// Fetches /api/reservations/[id], shows full details, cancel button

import * as React from "react";
import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  Hotel,
  CalendarDays,
  Moon,
  Users,
  AlertCircle,
  XCircle,
} from "lucide-react";
import {AppHeader, Navbar, Footer } from "@/components/layout";
import { StatusBadge, CancelDialog } from "@/components/reservation";
import { PriceBreakdown } from "@/components/room";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate, getNightCount } from "@/lib/utils";

interface Guest {
  name: string;
  surname: string;
  type: "Adult" | "Child";
  age?: number;
  gender: string;
  nationality: string;
}

interface CancellationPolicy {
  fromDate: string;
  toDate: string;
  penalty: number;
  penaltyCurrency: string;
  description: string;
}

interface ReservationDetail {
  id: string;
  bookingNumber?: string | null;
  hotelConfirmationNumber?: string | null;
  cancellationFee?: number | null;
  cancellationFeeCurrency?: string | null;
  clientReferenceId?: string | null;
  hotelCode: string;
  hotelName?: string | null;
  checkIn: string;
  checkOut: string;
  status: string;
  totalPrice: number;
  discountedPrice?: number | null;
  discountAmount?: number | null;
  currency: string;
  boardType?: string | null;
  /** API'nin çevirdiği görünen ad ("Sadece Oda"); kod yedek. */
  boardTypeName?: string | null;
  roomType?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  guests?: Guest[] | null;
  cancellationPolicy?: CancellationPolicy[] | null;
  roomConfirmationCodes?: string[] | null;
  appliedPriceRules?: { name: string }[] | null;
  createdAt: string;
}

async function fetchReservation(id: string): Promise<ReservationDetail> {
  const res = await fetch(`/api/reservations/${id}`);
  if (!res.ok) throw new Error("Rezervasyon alınamadı");
  return res.json();
}

interface CancelResult {
  cancellation?: {
    cancellationFee?: number;
    currency?: string;
  };
}

async function cancelReservation(id: string): Promise<CancelResult> {
  const res = await fetch(`/api/reservations/${id}/cancel`, {
    method: "POST",
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? "İptal işlemi başarısız");
  }
  return data;
}

function DetailSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="rounded-2xl border border-gray-100 bg-white p-6 space-y-4">
        <div className="flex justify-between">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-4 w-56" />
      </div>
      <div className="rounded-2xl border border-gray-100 bg-white p-6 space-y-3">
        <Skeleton className="h-5 w-32" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
        ))}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500 shrink-0">{label}</span>
      <span className="text-sm font-medium text-gray-900 text-right">{value}</span>
    </div>
  );
}

export default function ReservationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [cancelOpen, setCancelOpen] = React.useState(false);

  const { data, isLoading, isError } = useQuery<ReservationDetail>({
    queryKey: ["reservation-detail", id],
    queryFn: () => fetchReservation(id),
  });

  const handleCancel = async () => {
    const result = await cancelReservation(id);
    const fee = result.cancellation?.cancellationFee ?? 0;
    if (fee > 0) {
      toast.success(
        `Rezervasyonunuz iptal edildi. İptal ücreti: ${formatCurrency(
          fee,
          result.cancellation?.currency ?? "EUR"
        )}`
      );
    } else {
      toast.success("Rezervasyonunuz ücretsiz olarak iptal edildi.");
    }
    setCancelOpen(false);
    queryClient.invalidateQueries({ queryKey: ["reservation-detail", id] });
    queryClient.invalidateQueries({ queryKey: ["reservations"] });
    router.refresh();
  };

  const canCancel = data?.status === "CONFIRMED" || data?.status === "PENDING";
  const nights =
    data?.checkIn && data?.checkOut
      ? getNightCount(data.checkIn, data.checkOut)
      : 0;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <AppHeader geri="/reservations" baslik="Rezervasyon detayı" />
      <div className="web-only">
        <Navbar />
      </div>

      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">

          {isLoading && <DetailSkeleton />}

          {isError && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <AlertCircle className="h-12 w-12 text-red-400 mb-4" aria-hidden="true" />
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Rezervasyon yüklenemedi
              </h2>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Tekrar Dene
              </Button>
            </div>
          )}

          {!isLoading && !isError && data && (
            <div className="space-y-4">
              {/* Header card */}
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Hotel className="h-5 w-5 text-navy" aria-hidden="true" />
                      <h1 className="text-xl font-bold text-gray-900">
                        {data.hotelName || data.hotelCode}
                      </h1>
                    </div>
                    {data.bookingNumber && (
                      <p className="text-sm font-mono text-gray-400">
                        Rezervasyon No: #{data.bookingNumber}
                      </p>
                    )}
                    {data.hotelConfirmationNumber && (
                      <p className="text-sm font-mono text-gray-400">
                        Otel Konfirmasyon No: #{data.hotelConfirmationNumber}
                      </p>
                    )}
                  </div>
                  <StatusBadge status={data.status} />
                </div>

                {/* Quick dates */}
                <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <CalendarDays className="h-4 w-4 text-gray-400" aria-hidden="true" />
                    <span>
                      {formatDate(data.checkIn)} &ndash; {formatDate(data.checkOut)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Moon className="h-4 w-4 text-gray-400" aria-hidden="true" />
                    <span>{nights} gece</span>
                  </div>
                </div>

                {/* Cancel button */}
                {canCancel && (
                  <div className="mt-4 pt-4 border-t border-gray-50">
                    <Button
                      variant="destructive"
                      onClick={() => setCancelOpen(true)}
                    >
                      <XCircle className="h-4 w-4" aria-hidden="true" />
                      Rezervasyonu İptal Et
                    </Button>
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Stay info */}
                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <h2 className="text-sm font-semibold text-gray-900 mb-3">
                    Konaklama Detayları
                  </h2>
                  <div>
                    <InfoRow label="Giriş" value={formatDate(data.checkIn)} />
                    <InfoRow label="Çıkış" value={formatDate(data.checkOut)} />
                    <InfoRow label="Gece" value={`${nights} gece`} />
                    {data.roomType && <InfoRow label="Oda Tipi" value={data.roomType} />}
                    {(data.boardTypeName || data.boardType) && (
                      <InfoRow
                        label="Pansiyon"
                        value={data.boardTypeName ?? data.boardType!}
                      />
                    )}
                  </div>
                </div>

                {/* Price info */}
                <PriceBreakdown
                  originalPrice={data.totalPrice}
                  finalPrice={data.discountedPrice ?? data.totalPrice}
                  discount={data.discountAmount ?? 0}
                  appliedRules={data.appliedPriceRules?.map((r) => r.name)}
                  currency={data.currency}
                />
              </div>

              {/* Contact + Guests */}
              <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-gray-400" aria-hidden="true" />
                  İletişim ve Misafirler
                </h2>
                {data.contactName && (
                  <div className="mb-3 pb-3 border-b border-gray-50">
                    <p className="text-xs font-medium text-gray-500 mb-1">İletişim Kişisi</p>
                    <p className="text-sm text-gray-900">{data.contactName}</p>
                    {data.contactEmail && (
                      <p className="text-sm text-gray-500">{data.contactEmail}</p>
                    )}
                    {data.contactPhone && (
                      <p className="text-sm text-gray-500">{data.contactPhone}</p>
                    )}
                  </div>
                )}
                {data.guests && data.guests.length > 0 && (
                  <ul className="space-y-2">
                    {data.guests.map((guest, idx) => (
                      <li key={idx} className="text-sm text-gray-700">
                        {guest.name} {guest.surname} &mdash;{" "}
                        <span className="text-gray-500">
                          {guest.type === "Adult" ? "Yetişkin" : `Çocuk (${guest.age} yaş)`}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Cancellation fee (after cancellation) */}
              {data.status === "CANCELLED" &&
                data.cancellationFee != null &&
                data.cancellationFee > 0 && (
                  <div className="rounded-2xl border border-red-100 bg-red-50 p-5">
                    <h2 className="text-sm font-semibold text-red-900 mb-1">
                      İptal Ücreti
                    </h2>
                    <p className="text-sm text-red-800">
                      Bu rezervasyonun iptali için{" "}
                      <span className="font-semibold">
                        {formatCurrency(
                          data.cancellationFee,
                          data.cancellationFeeCurrency ?? data.currency
                        )}
                      </span>{" "}
                      iptal ücreti uygulanmıştır.
                    </p>
                  </div>
                )}

              {/* Cancellation policy */}
              {data.cancellationPolicy && Array.isArray(data.cancellationPolicy) &&
                data.cancellationPolicy.length > 0 && (
                  <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5">
                    <h2 className="text-sm font-semibold text-amber-900 mb-3">
                      İptal Politikası
                    </h2>
                    <ul className="space-y-2">
                      {(data.cancellationPolicy as CancellationPolicy[]).map((policy, idx) => (
                        <li key={idx} className="text-sm text-amber-800">
                          <span className="font-medium">
                            {formatDate(policy.fromDate)}
                            {policy.toDate && ` – ${formatDate(policy.toDate)}`}
                          </span>{" "}
                          tarihleri arasında iptal ücreti:{" "}
                          <span className="font-semibold">
                            {policy.penalty > 0
                              ? formatCurrency(policy.penalty, policy.penaltyCurrency || data.currency)
                              : "Ücretsiz"}
                          </span>
                          {policy.description && (
                            <span className="block text-xs text-amber-700/80 mt-0.5">
                              {policy.description}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              {/* Room confirmation codes */}
              {data.roomConfirmationCodes && data.roomConfirmationCodes.length > 0 && (
                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <h2 className="text-sm font-semibold text-gray-900 mb-3">
                    Oda Onay Kodları
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {data.roomConfirmationCodes.map((code, idx) => (
                      <span
                        key={idx}
                        className="rounded-md bg-chip-blue px-2.5 py-1 text-xs font-mono font-medium text-navy-dark"
                      >
                        {code}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <Footer />

      {data && (
        <CancelDialog
          isOpen={cancelOpen}
          onClose={() => setCancelOpen(false)}
          onConfirm={handleCancel}
          bookingNumber={data.bookingNumber ?? undefined}
        />
      )}
    </div>
  );
}
