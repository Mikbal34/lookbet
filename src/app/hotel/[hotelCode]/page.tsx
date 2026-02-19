"use client";

// Hotel detail page
// Fetches hotel data from /api/hotels/[hotelCode], shows gallery + info + rooms CTA

import * as React from "react";
import { use } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BedDouble, AlertCircle } from "lucide-react";
import { Navbar, Footer } from "@/components/layout";
import { HotelGallery, HotelInfo } from "@/components/hotel";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import type { HotelDetailResponse, HotelImage } from "@/lib/royal-api/types";

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

  const roomsHref = `/hotel/${hotelCode}/rooms?${searchParams.toString()}`;
  const backHref = `/search?${searchParams.toString()}`;

  const { data, isLoading, isError } = useQuery<HotelDetailData>({
    queryKey: ["hotel-detail", hotelCode],
    queryFn: () => fetchHotelDetail(hotelCode),
    staleTime: 10 * 60 * 1000,
  });

  // Normalise images to GalleryImage format
  const galleryImages = React.useMemo(() => {
    const imgs: HotelImage[] = data?.images ?? [];
    return imgs.map((img) => ({ url: img.url, caption: img.caption ?? "" }));
  }, [data?.images]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          {/* Back link */}
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Sonuçlara Dön
          </Link>

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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main content */}
              <div className="lg:col-span-2 space-y-6">
                <HotelGallery images={galleryImages} />

                {data.name && (
                  <HotelInfo hotel={data as HotelDetailResponse} />
                )}
              </div>

              {/* Sticky sidebar CTA */}
              <div className="lg:col-span-1">
                <div className="sticky top-24 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Bu otelde yer bulmak ister misiniz?
                  </h2>
                  <p className="text-sm text-gray-500">
                    Müsait odaları görmek ve rezervasyon yapmak için tarihleri
                    seçin.
                  </p>

                  {/* Quick date summary if params exist */}
                  {searchParams.get("checkIn") && (
                    <div className="rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-800 space-y-1">
                      <p>
                        <span className="font-medium">Giriş:</span>{" "}
                        {searchParams.get("checkIn")}
                      </p>
                      <p>
                        <span className="font-medium">Çıkış:</span>{" "}
                        {searchParams.get("checkOut")}
                      </p>
                    </div>
                  )}

                  <Link href={roomsHref} className="block">
                    <Button className="w-full" size="lg">
                      <BedDouble className="h-5 w-5" aria-hidden="true" />
                      Odaları Gör
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
