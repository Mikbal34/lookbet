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
import { AppHeader, Navbar, Footer } from "@/components/layout";
import {
  StatusBadge,
  CancelDialog,
  TicketPerforation,
  StayTimeline,
} from "@/components/reservation";
import { PriceBreakdown } from "@/components/room";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LbAy,
  LbBelge,
  LbBina,
  LbEtiket,
  LbMisafir,
  LbTelefon,
  LbYatak,
  LbUyari,
  LbYildiz,
  type IkonProps,
} from "@/components/ui/icons";
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
    phone?: string | null;
    latitude?: number | null;
    longitude?: number | null;
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

/**
 * Bölüm başlığı.
 *
 * Küçük soluk büyük harf etiketti; başlık gibi değil dipnot gibi duruyordu.
 * Başlık kalın ve koyu yazılır — 15px, 800, ink. Yanında kendi ikon
 * setimizden bir işaret, yumuşak turuncu rozette (bkz. ui/icons.tsx).
 *
 * Cümle düzeni: "İptal koşulları", "İptal Koşulları" değil. Her kelimeyi
 * büyük harfle başlatmak İngilizce geleneği, Türkçe arayüzde makine
 * çevirisi gibi okunuyor.
 */
function Baslik({
  ikon: Ikon,
  children,
}: {
  ikon: React.ComponentType<IkonProps>;
  children: React.ReactNode;
}) {
  return (
    <h2 className="mb-3 flex items-center gap-2 text-[15px] font-extrabold text-ink">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-chip-blue text-navy-text">
        <Ikon size={16} />
      </span>
      {children}
    </h2>
  );
}

/**
 * Bölüm kutusu.
 *
 * Kutuyu çerçeve değil zemin farkı yapıyor: sayfa bej (canvas), kartlar
 * beyaz. Çerçeveli kartları beyaz sayfaya koyduğunuzda ekran çizgi
 * kalabalığına dönüyor — kutuyu görmek için her kenarına bir çizgi çekmek
 * gerekiyor. Zemin ayrımıyla tek bir çizgi bile gerekmiyor.
 *
 * Gölge çok hafif: kartı zeminden koparmak değil, kenarını belli etmek için.
 */
function Bolum({
  baslik,
  ikon,
  children,
}: {
  baslik: string;
  ikon: React.ComponentType<IkonProps>;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-paper p-4 shadow-[0_1px_2px_rgb(11_13_20/0.04),0_6px_16px_-12px_rgb(11_13_20/0.18)]">
      <Baslik ikon={ikon}>{baslik}</Baslik>
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
          result.cancellation?.currency ?? "EUR",
        )}`,
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
  const pansiyon = data?.boardTypeName ?? data?.boardType;

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
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
            <LbUyari size={44} className="mb-4 text-red-400" />
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
                  <LbBina size={64} className="text-white/15" />
                </div>
              )}
              {/* Okunabilirlik maskesi. Ara ton bilerek koyu: şehir etiketi
                  11px ve metin fotoğrafın en parlak yerine denk gelebiliyor.
                  Beş otelin fotoğrafında ölçüldü — bu değerlerle en kötü
                  kontrast 5.28 (çubuk başlığı, şehir ve otel adı için). Önceki
                  via-ink/40 ile şehir etiketi 3.11'e kadar düşüyordu. */}
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/60 to-ink/55"
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
                      <LbYildiz key={i} size={14} className="text-gold" />
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mx-auto max-w-3xl space-y-4 px-4 pb-10 sm:px-6 lg:px-8">
              {/* Bilet — sayfanın tek özet nesnesi.
                  Oda/pansiyon ve kodlar buraya alındı: eskiden ayrı iki bölüm
                  daha vardı ve "Konaklama Detayları" giriş/çıkış/gece'yi
                  biletin hemen altında ikinci kez, başka bir tipografiyle
                  tekrar ediyordu. Üretilen sayfa elindeki her alanı döker;
                  neyin gösterileceğine karar vermek gerekiyordu. */}
              <div className="relative -mt-5 overflow-hidden rounded-2xl bg-paper shadow-[0_2px_6px_rgb(11_13_20/0.06),0_12px_28px_-14px_rgb(11_13_20/0.35)]">
                <div className="px-4 pt-3.5 pb-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="min-w-0 truncate text-[13px] text-muted">
                      Rezervasyon No:{" "}
                      <span className="font-mono text-[14px] font-bold text-ink">
                        {data.bookingNumber ?? "—"}
                      </span>
                    </p>
                    <StatusBadge status={data.status} />
                  </div>
                  {(data.roomType || pansiyon) && (
                    <p className="mt-1 truncate text-[13px] text-muted">
                      {[data.roomType, pansiyon].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>

                <TicketPerforation zemin="bg-canvas" />

                <div className="flex items-end justify-between gap-2 px-4 pt-4 pb-4">
                  <div className="min-w-0">
                    <p className="text-[10.5px] font-bold tracking-[0.08em] text-muted uppercase">
                      Giriş
                    </p>
                    <p className="mt-0.5 text-[17px] leading-none font-extrabold text-ink">
                      {giris.tarih}
                    </p>
                    <p className="mt-1 text-[13px] text-muted">{giris.gun}</p>
                  </div>

                  <div className="flex shrink-0 flex-col items-center gap-1 pb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="size-1.5 rounded-full bg-line-strong" />
                      <span className="h-px w-6 bg-line-strong" />
                      <LbAy size={14} className="text-navy" />
                      <span className="h-px w-6 bg-line-strong" />
                      <span className="size-1.5 rounded-full bg-line-strong" />
                    </div>
                    <span className="text-[13px] font-semibold text-slate-text">
                      {nights} gece
                    </span>
                  </div>

                  <div className="min-w-0 text-right">
                    <p className="text-[10.5px] font-bold tracking-[0.08em] text-muted uppercase">
                      Çıkış
                    </p>
                    <p className="mt-0.5 text-[17px] leading-none font-extrabold text-ink">
                      {cikis.tarih}
                    </p>
                    <p className="mt-1 text-[13px] text-muted">{cikis.gun}</p>
                  </div>
                </div>

                {/* Otelde sorulan kodlar — biletin koçanı gibi, altta ve sessiz */}
                {(data.hotelConfirmationNumber ||
                  (data.roomConfirmationCodes?.length ?? 0) > 0) && (
                  <div className="flex flex-wrap gap-x-4 gap-y-1 bg-canvas px-4 py-2.5">
                    {data.hotelConfirmationNumber && (
                      <p className="text-[13px] text-muted">
                        Otel konfirmasyon{" "}
                        <span className="font-mono text-ink">
                          {data.hotelConfirmationNumber}
                        </span>
                      </p>
                    )}
                    {data.roomConfirmationCodes?.map((code) => (
                      <p key={code} className="text-[13px] text-muted">
                        Oda kodu{" "}
                        <span className="font-mono text-ink">{code}</span>
                      </p>
                    ))}
                  </div>
                )}
              </div>

              {/* Hızlı eylemler — Pegasus'un bilet altındaki "Bagaj Ekle |
                  Paket Yükselt" şeridinin karşılığı. Yalnızca gerçekten
                  yapılabilenler: otelin telefonu yoksa arama satırı hiç
                  çıkmıyor, uydurma bir düğme koymaktansa yer boş kalsın.
                  Adres burada değil, çizelgedeki "Giriş" adımında — oraya
                  giriş günü gidiliyor. */}
              <div className="flex divide-x divide-line overflow-hidden rounded-2xl bg-paper shadow-[0_1px_2px_rgb(11_13_20/0.04),0_6px_16px_-12px_rgb(11_13_20/0.18)]">
                {otel?.phone && (
                  <a
                    href={`tel:${otel.phone.replace(/\s/g, "")}`}
                    className="flex min-h-11 flex-1 items-center justify-center gap-2 py-3 text-[13px] font-semibold text-slate-text active:bg-chip"
                  >
                    <LbTelefon size={16} className="text-navy-text" />
                    Oteli ara
                  </a>
                )}
                <Link
                  href={`/hotel/${data.hotelCode}`}
                  className="flex min-h-11 flex-1 items-center justify-center gap-2 py-3 text-[13px] font-semibold text-slate-text active:bg-chip"
                >
                  <LbBina size={16} className="text-navy-text" />
                  Otel sayfası
                </Link>
              </div>

              <div className="space-y-3 pt-1">
                {/* İptal/başarısızda çizelge yok: olmayacak bir konaklamanın
                    adımlarını saymak yanıltıcı olur. */}
                {(data.status === "CONFIRMED" || data.status === "PENDING") && (
                  <Bolum baslik="Konaklaman" ikon={LbYatak}>
                    <StayTimeline
                      status={data.status}
                      createdAt={data.createdAt}
                      checkIn={data.checkIn}
                      checkOut={data.checkOut}
                      nights={nights}
                      roomType={data.roomType}
                      boardType={pansiyon}
                      address={otel?.address}
                      latitude={otel?.latitude}
                      longitude={otel?.longitude}
                    />
                  </Bolum>
                )}

                <Bolum baslik="Fiyat" ikon={LbEtiket}>
                  <PriceBreakdown
                    originalPrice={data.totalPrice}
                    finalPrice={data.discountedPrice ?? data.totalPrice}
                    discount={data.discountAmount ?? 0}
                    appliedRules={data.appliedPriceRules?.map((r) => r.name)}
                    currency={data.currency}
                  />
                </Bolum>

                <Bolum baslik="Misafirler" ikon={LbMisafir}>
                  {data.guests && data.guests.length > 0 && (
                    <ul className="space-y-1.5">
                      {data.guests.map((guest, idx) => (
                        <li key={idx} className="text-[14px] text-ink">
                          {guest.name} {guest.surname}{" "}
                          <span className="text-[13px] text-muted">
                            {guest.type === "Adult"
                              ? "Yetişkin"
                              : `Çocuk, ${guest.age} yaş`}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {data.contactName && (
                    <div className="mt-4">
                      <p className="text-[13px] text-muted">İletişim</p>
                      <p className="mt-0.5 text-[14px] text-ink">
                        {data.contactName}
                      </p>
                      {data.contactEmail && (
                        <p className="text-[13px] text-muted">
                          {data.contactEmail}
                        </p>
                      )}
                      {data.contactPhone && (
                        <p className="text-[13px] text-muted">
                          {data.contactPhone}
                        </p>
                      )}
                    </div>
                  )}
                </Bolum>

                {/* İptal koşulları ve ücreti: renkli dolgu yok.
                  Sarı ve kırmızı kutular sayfayı trafik lambasına çeviriyordu
                  ve hiçbiri acil değil — biri geçmiş bir işlemin faturası,
                  öbürü sözleşme metni. Rakam kalın, gerisi düz. */}
                {data.status === "CANCELLED" &&
                  data.cancellationFee != null &&
                  data.cancellationFee > 0 && (
                    <Bolum baslik="İptal ücreti" ikon={LbBelge}>
                      <p className="text-[14px] text-slate-text">
                        Bu rezervasyonun iptali için{" "}
                        <span className="font-semibold text-ink">
                          {formatCurrency(
                            data.cancellationFee,
                            data.cancellationFeeCurrency ?? data.currency,
                          )}
                        </span>{" "}
                        tahsil edildi.
                      </p>
                    </Bolum>
                  )}

                {data.cancellationPolicy &&
                  Array.isArray(data.cancellationPolicy) &&
                  data.cancellationPolicy.length > 0 && (
                    <Bolum baslik="İptal koşulları" ikon={LbBelge}>
                      <ul className="space-y-2.5">
                        {(data.cancellationPolicy as CancellationPolicy[]).map(
                          (policy, idx) => (
                            <li key={idx}>
                              <p className="text-[14px] text-slate-text">
                                {formatDate(policy.fromDate)}
                                {policy.toDate &&
                                  ` – ${formatDate(policy.toDate)}`}{" "}
                                arası iptalde{" "}
                                <span className="font-semibold text-ink">
                                  {policy.penalty > 0
                                    ? formatCurrency(
                                        policy.penalty,
                                        policy.penaltyCurrency || data.currency,
                                      )
                                    : "ücret alınmaz"}
                                </span>
                                {policy.penalty > 0 && " kesilir"}
                              </p>
                              {policy.description && (
                                <p className="mt-0.5 text-[13px] text-muted">
                                  {policy.description}
                                </p>
                              )}
                            </li>
                          ),
                        )}
                      </ul>
                    </Bolum>
                  )}

                {/* İptal: kutusuz ve ikonsuz. Geri alınamayan bir işlem sayfada
                  düğme gibi durup davet etmemeli; uyarının ağırlığını onay
                  penceresi taşıyor. */}
              </div>

              {canCancel && (
                <button
                  type="button"
                  onClick={() => setCancelOpen(true)}
                  className="flex min-h-11 w-full items-center justify-center text-[13px] font-semibold text-red-700 active:text-red-900"
                >
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
