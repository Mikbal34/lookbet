"use client";

// Rezervasyon detayı.
//
// Kampanya detayıyla aynı iskelet: tepede otel fotoğrafı, üstünde otelin adı,
// ona binen özet kartı, altında bölümler. Eskiden sayfa doğrudan gri bir
// bilgi kartıyla başlıyordu — nerede kalacağını gösteren tek şey bir satır
// metindi. Fotoğraf hem sayfayı tanıtıyor hem de listeden gelen kartla
// arasındaki bağı kuruyor.
//
// Fotoğraf saydam kimlik çubuğunun altından başlıyor (.app-header-altina);
// web'de kimlik çubuğu olmadığı için o sınıf hiçbir şey yapmıyor ve fotoğraf
// navbar'ın hemen altında kalıyor.
//
// Özet kartı listedeki bilet kartının aynısı: rezervasyon no + durum,
// perforasyon, giriş — gece — çıkış. İki ekran arasında geçerken aynı nesneye
// baktığı belli oluyor.

import * as React from "react";
import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Building2, Moon, Star, Users, AlertCircle, XCircle } from "lucide-react";
import { AppHeader, Navbar, Footer } from "@/components/layout";
import {
  StatusBadge,
  CancelDialog,
  TicketPerforation,
} from "@/components/reservation";
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
  /** API'nin otelin yerel kaydından eklediği görsel bilgiler. */
  hotel?: {
    image?: string | null;
    stars?: number | null;
    address?: string | null;
    city?: string | null;
  } | null;
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
    <div className="flex items-start justify-between gap-4 border-b border-line/60 py-2.5 last:border-0">
      <span className="shrink-0 text-[13px] text-muted">{label}</span>
      <span className="text-right text-[13.5px] font-semibold text-ink">
        {value}
      </span>
    </div>
  );
}

/** Beyaz bölüm kartı — sayfadaki tüm bloklar aynı kabuğu kullanıyor. */
function Bolum({
  baslik,
  ikon: Ikon,
  children,
}: {
  baslik: string;
  ikon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-line bg-white p-4">
      <h2 className="mb-2 flex items-center gap-1.5 text-[13px] font-bold text-ink">
        {Ikon && <Ikon className="size-4 text-navy" aria-hidden="true" />}
        {baslik}
      </h2>
      {children}
    </section>
  );
}

/** "10 Eyl" + "Per" — bilet hattının iki ucu. */
function gunAy(tarih: string) {
  const d = new Date(tarih);
  if (Number.isNaN(d.getTime())) return { tarih: "", gun: "" };
  return {
    tarih: new Intl.DateTimeFormat("tr-TR", {
      day: "numeric",
      month: "short",
    }).format(d),
    gun: new Intl.DateTimeFormat("tr-TR", { weekday: "short" }).format(d),
  };
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

  const giris = data ? gunAy(data.checkIn) : null;
  const cikis = data ? gunAy(data.checkOut) : null;
  const otelAdi = data?.hotelName || data?.hotelCode || "";
  const otel = data?.hotel;

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <AppHeader geri="/reservations" baslik="Rezervasyon detayı" saydam />
      <div className="web-only">
        <Navbar />
      </div>

      <main className="flex-1">
        {isLoading && (
          <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
            <DetailSkeleton />
          </div>
        )}

        {isError && (
          <div className="flex flex-col items-center justify-center px-4 py-20 text-center">
            <AlertCircle className="mb-4 h-12 w-12 text-red-400" aria-hidden="true" />
            <h2 className="mb-2 text-lg font-semibold text-gray-900">
              Rezervasyon yüklenemedi
            </h2>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Tekrar Dene
            </Button>
          </div>
        )}

        {!isLoading && !isError && data && giris && cikis && (
          <>
            {/* Otel fotoğrafı — app'te saydam kimlik çubuğunun altından başlar */}
            <div className="app-header-altina relative h-56 bg-navy sm:h-72">
              {otel?.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={otel.image}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                // Otelin yerel kaydında görsel yoksa boş gri kutu yerine marka
                // zemini; üstündeki metin her iki durumda da aynı okunurlukta.
                <div
                  aria-hidden="true"
                  className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-navy to-navy-deep"
                >
                  <Building2 className="size-16 text-white/15" />
                </div>
              )}
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/40 to-ink/45"
              />

              <div className="relative mx-auto flex h-full max-w-3xl flex-col justify-end px-4 pt-14 pb-7 sm:px-6 lg:px-8">
                {otel?.city && (
                  <span className="text-[11px] font-bold tracking-[0.14em] text-white/85 uppercase">
                    {otel.city}
                  </span>
                )}
                <h1 className="mt-1 text-[22px] leading-tight font-extrabold text-white">
                  {otelAdi}
                </h1>
                {!!otel?.stars && (
                  <div
                    className="mt-1.5 flex items-center gap-0.5"
                    aria-label={`${otel.stars} yıldız`}
                  >
                    {Array.from({ length: otel.stars }, (_, i) => (
                      <Star
                        key={i}
                        className="size-3.5 fill-gold text-gold"
                        aria-hidden="true"
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mx-auto max-w-3xl space-y-4 px-4 pb-8 sm:px-6 lg:px-8">
              {/* Özet — fotoğrafa binen bilet kartı */}
              <div className="relative -mt-5 overflow-hidden rounded-xl border border-line bg-white shadow-[0_8px_20px_-10px_rgb(11_13_20/0.3)]">
                <div className="px-4 pt-3.5 pb-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="min-w-0 truncate text-[13px] text-slate-text">
                      Rezervasyon No:{" "}
                      <span className="font-mono font-bold text-ink">
                        {data.bookingNumber ?? "—"}
                      </span>
                    </p>
                    <StatusBadge status={data.status} />
                  </div>
                  {data.hotelConfirmationNumber && (
                    <p className="mt-1 truncate text-[12.5px] text-muted">
                      Otel konfirmasyon no:{" "}
                      <span className="font-mono">
                        {data.hotelConfirmationNumber}
                      </span>
                    </p>
                  )}
                </div>

                <TicketPerforation />

                <div className="flex items-end justify-between gap-2 px-4 pt-4 pb-4">
                  <div className="min-w-0">
                    <p className="text-[10.5px] font-semibold tracking-[0.08em] text-muted uppercase">
                      Giriş
                    </p>
                    <p className="mt-0.5 text-[17px] leading-none font-extrabold text-ink">
                      {giris.tarih}
                    </p>
                    <p className="mt-1 text-[12px] text-muted">{giris.gun}</p>
                  </div>

                  <div className="flex shrink-0 flex-col items-center gap-1 pb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="size-1.5 rounded-full bg-line-strong" />
                      <span className="h-px w-6 bg-line-strong" />
                      <Moon className="size-3.5 text-navy" aria-hidden="true" />
                      <span className="h-px w-6 bg-line-strong" />
                      <span className="size-1.5 rounded-full bg-line-strong" />
                    </div>
                    <span className="text-[11.5px] font-semibold text-slate-text">
                      {nights} gece
                    </span>
                  </div>

                  <div className="min-w-0 text-right">
                    <p className="text-[10.5px] font-semibold tracking-[0.08em] text-muted uppercase">
                      Çıkış
                    </p>
                    <p className="mt-0.5 text-[17px] leading-none font-extrabold text-ink">
                      {cikis.tarih}
                    </p>
                    <p className="mt-1 text-[12px] text-muted">{cikis.gun}</p>
                  </div>
                </div>
              </div>

              {otel?.address && (
                <Link
                  href={`/hotel/${data.hotelCode}`}
                  className="flex items-center gap-2.5 rounded-xl border border-line bg-white px-4 py-3 active:bg-chip"
                >
                  <Building2 className="size-4 shrink-0 text-navy" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate text-[13px] text-slate-text">
                    {otel.address}
                  </span>
                  <span className="shrink-0 text-[12.5px] font-bold text-navy">
                    Oteli gör
                  </span>
                </Link>
              )}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Bolum baslik="Konaklama Detayları">
                  <InfoRow label="Giriş" value={formatDate(data.checkIn)} />
                  <InfoRow label="Çıkış" value={formatDate(data.checkOut)} />
                  <InfoRow label="Gece" value={`${nights} gece`} />
                  {data.roomType && (
                    <InfoRow label="Oda Tipi" value={data.roomType} />
                  )}
                  {(data.boardTypeName || data.boardType) && (
                    <InfoRow
                      label="Pansiyon"
                      value={data.boardTypeName ?? data.boardType!}
                    />
                  )}
                </Bolum>

                <PriceBreakdown
                  originalPrice={data.totalPrice}
                  finalPrice={data.discountedPrice ?? data.totalPrice}
                  discount={data.discountAmount ?? 0}
                  appliedRules={data.appliedPriceRules?.map((r) => r.name)}
                  currency={data.currency}
                />
              </div>

              <Bolum baslik="İletişim ve Misafirler" ikon={Users}>
                {data.contactName && (
                  <div className="mb-3 border-b border-line/60 pb-3">
                    <p className="mb-1 text-[12px] font-semibold text-muted">
                      İletişim kişisi
                    </p>
                    <p className="text-[13.5px] text-ink">{data.contactName}</p>
                    {data.contactEmail && (
                      <p className="text-[13px] text-muted">{data.contactEmail}</p>
                    )}
                    {data.contactPhone && (
                      <p className="text-[13px] text-muted">{data.contactPhone}</p>
                    )}
                  </div>
                )}
                {data.guests && data.guests.length > 0 && (
                  <ul className="space-y-2">
                    {data.guests.map((guest, idx) => (
                      <li key={idx} className="text-[13.5px] text-slate-text">
                        {guest.name} {guest.surname} &mdash;{" "}
                        <span className="text-muted">
                          {guest.type === "Adult"
                            ? "Yetişkin"
                            : `Çocuk (${guest.age} yaş)`}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Bolum>

              {data.status === "CANCELLED" &&
                data.cancellationFee != null &&
                data.cancellationFee > 0 && (
                  <div className="rounded-xl border border-red-100 bg-red-50 p-4">
                    <h2 className="mb-1 text-[13px] font-bold text-red-900">
                      İptal ücreti
                    </h2>
                    <p className="text-[13.5px] text-red-800">
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

              {data.cancellationPolicy &&
                Array.isArray(data.cancellationPolicy) &&
                data.cancellationPolicy.length > 0 && (
                  <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
                    <h2 className="mb-2 text-[13px] font-bold text-amber-900">
                      İptal politikası
                    </h2>
                    <ul className="space-y-2">
                      {(data.cancellationPolicy as CancellationPolicy[]).map(
                        (policy, idx) => (
                          <li key={idx} className="text-[13px] text-amber-800">
                            <span className="font-semibold">
                              {formatDate(policy.fromDate)}
                              {policy.toDate && ` – ${formatDate(policy.toDate)}`}
                            </span>{" "}
                            tarihleri arasında iptal ücreti:{" "}
                            <span className="font-bold">
                              {policy.penalty > 0
                                ? formatCurrency(
                                    policy.penalty,
                                    policy.penaltyCurrency || data.currency
                                  )
                                : "Ücretsiz"}
                            </span>
                            {policy.description && (
                              <span className="mt-0.5 block text-[12px] text-amber-700/80">
                                {policy.description}
                              </span>
                            )}
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                )}

              {data.roomConfirmationCodes &&
                data.roomConfirmationCodes.length > 0 && (
                  <Bolum baslik="Oda Onay Kodları">
                    <div className="flex flex-wrap gap-2">
                      {data.roomConfirmationCodes.map((code, idx) => (
                        <span
                          key={idx}
                          className="rounded-md bg-chip-blue px-2.5 py-1 font-mono text-[12px] font-semibold text-navy-dark"
                        >
                          {code}
                        </span>
                      ))}
                    </div>
                  </Bolum>
                )}

              {/* İptal en altta: yıkıcı ve geri alınamaz bir işlem, sayfanın
                  ilk gördüğü şey olmamalı. Eskiden özet kartının içinde dolu
                  kırmızı bir düğmeydi ve ekranın en dikkat çeken öğesiydi. */}
              {canCancel && (
                <button
                  type="button"
                  onClick={() => setCancelOpen(true)}
                  className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-white py-3 text-[14px] font-bold text-red-600 active:bg-red-50"
                >
                  <XCircle className="size-4" aria-hidden="true" />
                  Rezervasyonu iptal et
                </button>
              )}
            </div>
          </>
        )}
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
