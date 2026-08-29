"use client";

// Hotel detail page
// Fetches hotel data from /api/hotels/[hotelCode], shows gallery + info + rooms CTA

import * as React from "react";
import { use } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { BedDouble, AlertCircle, Star, LogIn, LogOut } from "lucide-react";
import {AppHeader, Navbar, Footer } from "@/components/layout";
import {
  HotelGallery,
  HotelInfo,
  HotelReviews,
  InlineScore,
  HotelNearby,
  HotelPoliciesSection,
  HotelFaq,
} from "@/components/hotel";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import type { HotelDetailResponse, HotelImage } from "@/lib/royal-api/types";
import { formatDate, formatDateRange } from "@/lib/utils";
import { ShowMore } from "@/components/ui/show-more";

interface HotelDetailData extends Partial<HotelDetailResponse> {
  hotelCode: string;
}

async function fetchHotelDetail(hotelCode: string): Promise<HotelDetailData> {
  const res = await fetch(`/api/hotels/${hotelCode}`);
  if (!res.ok) throw new Error("Otel bilgisi alınamadı");
  return res.json();
}

function HotelDetailSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Otel bilgisi yükleniyor">
      <Skeleton className="w-full h-72 md:h-96 rounded-2xl" />
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-14 w-20 rounded-lg" />
        ))}
      </div>
      <div className="space-y-3">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    </div>
  );
}

export default function HotelDetailPage({
  params,
}: {
  params: Promise<{ hotelCode: string }>;
}) {
  return (
    <React.Suspense fallback={<div className="min-h-screen flex items-center justify-center">Yükleniyor...</div>}>
      <HotelDetailContent params={params} />
    </React.Suspense>
  );
}

function HotelDetailContent({
  params,
}: {
  params: Promise<{ hotelCode: string }>;
}) {
  const { hotelCode } = use(params);
  const searchParams = useSearchParams();

  const backHref = `/search?${searchParams.toString()}`;

  const { data, isLoading, isError } = useQuery<HotelDetailData>({
    queryKey: ["hotel-detail", hotelCode],
    queryFn: () => fetchHotelDetail(hotelCode),
    staleTime: 10 * 60 * 1000,
  });

  // Carry the hotel name into the rooms/booking flow so reservations don't
  // fall back to the raw hotel code.
  const roomsParams = new URLSearchParams(searchParams.toString());
  if (data?.name) roomsParams.set("hotelName", data.name);
  const roomsHref = `/hotel/${hotelCode}/rooms?${roomsParams.toString()}`;

  // Normalise images to GalleryImage format, main image first
  const galleryImages = React.useMemo(() => {
    const imgs: HotelImage[] = data?.images ?? [];
    return imgs
      .slice()
      .sort((a, b) => (b.isMain ? 1 : 0) - (a.isMain ? 1 : 0))
      .map((img) => ({ url: img.url, caption: img.caption ?? "" }));
  }, [data?.images]);

  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      <AppHeader geri={backHref} baslik="Otel" />
      <div className="web-only">
        <Navbar />
      </div>

      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">

          {isLoading && <HotelDetailSkeleton />}

          {isError && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <AlertCircle className="h-12 w-12 text-red-400 mb-4" aria-hidden="true" />
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Otel bilgisi yüklenemedi
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                Lütfen sayfayı yenileyerek tekrar deneyin.
              </p>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Tekrar Dene
              </Button>
            </div>
          )}

          {!isLoading && !isError && data && (
            <>
            {/* Üst blok: galeri + genel bilgi solda, rezervasyon kutusu sağda */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main content */}
              <div className="lg:col-span-2 space-y-6">
                <HotelGallery images={galleryImages} />

                {data.name && (
                  <div id="genel" className="scroll-mt-32 space-y-5">
                    {data.reviewSummary && (
                      <InlineScore summary={data.reviewSummary} />
                    )}
                    <HotelInfo hotel={data as HotelDetailResponse} />
                  </div>
                )}
              </div>

              {/* Sticky sidebar CTA — mobilde alttaki sabit çubuk devralır */}
              <div className="lg:col-span-1">
                <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm space-y-3 lg:sticky lg:top-6">
                  {data.reviewSummary && (
                    <div className="flex items-center gap-2.5">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg rounded-bl-none bg-navy-text text-base font-bold text-white">
                        {data.reviewSummary.score.toFixed(1)}
                      </span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-bold text-gray-900">
                            {data.reviewSummary.label}
                          </p>
                          <div className="flex" aria-label={`${data.reviewSummary.score} / 10`}>
                            {Array.from({ length: 5 }, (_, i) => (
                              <Star
                                key={i}
                                className={
                                  i < Math.round(data.reviewSummary!.score / 2)
                                    ? "h-3.5 w-3.5 fill-amber-400 text-amber-400"
                                    : "h-3.5 w-3.5 fill-gray-200 text-gray-200"
                                }
                                aria-hidden="true"
                              />
                            ))}
                          </div>
                        </div>
                        <p className="text-xs text-gray-500">
                          {data.reviewSummary.count.toLocaleString("tr-TR")} değerlendirme
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Giriş / çıkış — sade, ikonlu, turuncu zemin yok */}
                  {searchParams.get("checkIn") && (
                    <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 text-[13px]">
                      <div className="flex items-center gap-2 px-3 py-2">
                        <LogIn className="h-4 w-4 text-navy" aria-hidden="true" />
                        <span className="text-gray-500">Giriş</span>
                        <span className="ml-auto font-medium text-gray-900">
                          {formatDate(searchParams.get("checkIn")!)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-2">
                        <LogOut className="h-4 w-4 text-navy" aria-hidden="true" />
                        <span className="text-gray-500">Çıkış</span>
                        <span className="ml-auto font-medium text-gray-900">
                          {formatDate(searchParams.get("checkOut")!)}
                        </span>
                      </div>
                    </div>
                  )}

                  <Link href={roomsHref} className="hidden lg:block">
                    <Button className="w-full">
                      <BedDouble className="h-5 w-5" aria-hidden="true" />
                      Odaları Gör
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            {/* Alt bloklar tam genişlik — sağda boşluk kalmaz */}
            {data.name && (
              <div className="mt-8 space-y-8">
                <div id="cevre" className="scroll-mt-32">
                  <HotelNearby places={data.nearby} />
                </div>
                {/* Yorumlar ve kurallar mobilde sayfanın üçte birini
                    kaplıyordu (1044px + 705px). lg altında kırpılıp
                    "devamını gör" ile açılıyor; masaüstünde tam görünür. */}
                <div id="degerlendirme" className="scroll-mt-32">
                  <ShowMore
                    kapaliYukseklik={420}
                    acEtiketi={
                      data.reviews?.length
                        ? `Tüm ${data.reviews.length} yorumu gör`
                        : "Tüm yorumları gör"
                    }
                    kapatEtiketi="Yorumları kapat"
                  >
                    <HotelReviews
                      summary={data.reviewSummary}
                      reviews={data.reviews}
                    />
                  </ShowMore>
                </div>
                <div id="sorular" className="scroll-mt-32">
                  <HotelFaq facilities={data.facilities} policies={data.policies} />
                </div>
                <div id="kurallar" className="scroll-mt-32">
                  <ShowMore
                    kapaliYukseklik={300}
                    acEtiketi="Tüm tesis kurallarını gör"
                    kapatEtiketi="Kuralları kapat"
                  >
                    <HotelPoliciesSection policies={data.policies} />
                  </ShowMore>
                </div>
              </div>
            )}
            </>
          )}
        </div>
        {/* Mobil sabit CTA — sayfanın neresinde olursan ol rezervasyona bir dokunuş */}
        {!isLoading && !isError && data && (
          <div className="sticky bottom-0 z-30 border-t border-line bg-white/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-bold text-ink">
                  {data.name}
                </p>
                <p className="truncate text-[12px] text-muted">
                  {searchParams.get("checkIn") && searchParams.get("checkOut")
                    ? formatDateRange(
                        searchParams.get("checkIn")!,
                        searchParams.get("checkOut")!
                      )
                    : "Tarih seçilmedi"}
                </p>
              </div>
              <Link href={roomsHref} className="shrink-0">
                <Button className="min-h-12 px-6">
                  <BedDouble className="h-5 w-5" aria-hidden="true" />
                  Odaları Gör
                </Button>
              </Link>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
