"use client";

// Room selection page
// Reads search params, fetches available rooms, renders countdown + room cards

import * as React from "react";
import { use } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BedDouble, AlertCircle } from "lucide-react";
import { Navbar, Footer } from "@/components/layout";
import { RoomCard, CountdownTimer } from "@/components/room";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import type { RoomResult } from "@/lib/royal-api/types";

interface RoomSearchResponse {
  roomSearchId: string;
  expiresAt: string;
  rooms: Array<
    RoomResult & {
      pricing?: {
        originalPrice: number;
        finalPrice: number;
        totalDiscount: number;
      };
    }
  >;
}

async function fetchRooms(
  hotelCode: string,
  params: URLSearchParams
): Promise<RoomSearchResponse> {
  const checkIn = params.get("checkIn") ?? "";
  const checkOut = params.get("checkOut") ?? "";
  const adults = parseInt(params.get("adults") ?? "2", 10);
  const childAges = (params.get("childAges") ?? "")
    .split(",")
    .filter(Boolean)
    .map(Number);
  const nationality = params.get("nationality") ?? "TR";
  const currency = params.get("currency") ?? "EUR";

  const res = await fetch("/api/rooms/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      hotelCode,
      checkIn,
      checkOut,
      nationality,
      currency,
      rooms: [{ adult: adults, childAges: childAges.length ? childAges : undefined }],
    }),
  });

  if (!res.ok) throw new Error("Oda bilgileri alınamadı");
  return res.json();
}

function RoomCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
      <div className="flex justify-between">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
        <Skeleton className="h-7 w-24 rounded-full" />
      </div>
      <div className="flex gap-4">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-20" />
      </div>
      <div className="flex justify-between items-end pt-2 border-t border-gray-50">
        <div className="space-y-1">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-28" />
        </div>
        <Skeleton className="h-10 w-24 rounded-xl" />
      </div>
    </div>
  );
}

export default function RoomsPage({
  params,
}: {
  params: Promise<{ hotelCode: string }>;
}) {
  return (
    <React.Suspense fallback={<div className="min-h-screen flex items-center justify-center">Yükleniyor...</div>}>
      <RoomsPageContent params={params} />
    </React.Suspense>
  );
}

function RoomsPageContent({
  params,
}: {
  params: Promise<{ hotelCode: string }>;
}) {
  const { hotelCode } = use(params);
  const searchParams = useSearchParams();
  const router = useRouter();

  const currency = searchParams.get("currency") ?? "EUR";

  const { data, isLoading, isError } = useQuery<RoomSearchResponse>({
    queryKey: ["rooms-search", hotelCode, searchParams.toString()],
    queryFn: () => fetchRooms(hotelCode, searchParams),
    staleTime: 5 * 60 * 1000,
  });

  const handleExpire = React.useCallback(() => {
    router.push(`/hotel/${hotelCode}?${searchParams.toString()}`);
  }, [router, hotelCode, searchParams]);

  const handleSelectRoom = (
    room: RoomResult & {
      pricing?: { originalPrice: number; finalPrice: number };
    },
    roomSearchId: string
  ) => {
    const qs = new URLSearchParams({
      roomSearchId,
      priceCode: room.priceCode,
      hotelCode,
      roomName: room.roomName,
      boardType: room.boardType,
      boardTypeName: room.boardTypeName,
      checkIn: searchParams.get("checkIn") ?? "",
      checkOut: searchParams.get("checkOut") ?? "",
      adults: searchParams.get("adults") ?? "2",
      childAges: searchParams.get("childAges") ?? "",
      nationality: searchParams.get("nationality") ?? "TR",
      currency,
      totalPrice: String(room.pricing?.finalPrice ?? room.totalPrice),
    });
    router.push(`/booking?${qs.toString()}`);
  };

  const backHref = `/hotel/${hotelCode}?${searchParams.toString()}`;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-6">
          {/* Back + timer row */}
          <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
            <Link
              href={backHref}
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Otel Detayına Dön
            </Link>

            {data?.expiresAt && !isLoading && (
              <CountdownTimer
                expiresAt={data.expiresAt}
                onExpire={handleExpire}
              />
            )}
          </div>

          {/* Heading */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <BedDouble className="h-6 w-6 text-blue-600" aria-hidden="true" />
              Müsait Odalar
            </h1>
            {searchParams.get("checkIn") && (
              <p className="text-sm text-gray-500 mt-1">
                {searchParams.get("checkIn")} &ndash;{" "}
                {searchParams.get("checkOut")} &bull;{" "}
                {searchParams.get("adults") ?? 2} yetişkin
              </p>
            )}
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="space-y-4" aria-busy="true" aria-label="Odalar yükleniyor">
              {Array.from({ length: 4 }, (_, i) => (
                <RoomCardSkeleton key={i} />
              ))}
            </div>
          )}

          {/* Error */}
          {isError && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <AlertCircle className="h-12 w-12 text-red-400 mb-4" aria-hidden="true" />
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Odalar yüklenemedi
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                Lütfen sayfayı yenileyerek tekrar deneyin.
              </p>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Tekrar Dene
              </Button>
            </div>
          )}

          {/* Empty */}
          {!isLoading && !isError && data && data.rooms.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <BedDouble className="h-12 w-12 text-gray-300 mb-4" aria-hidden="true" />
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Müsait oda bulunamadı
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                Seçtiğiniz tarihlerde uygun oda bulunmamaktadır. Farklı tarih
                deneyin.
              </p>
              <Link href={backHref}>
                <Button variant="outline">Tarihleri Değiştir</Button>
              </Link>
            </div>
          )}

          {/* Room list */}
          {!isLoading && data && data.rooms.length > 0 && (
            <div className="space-y-4">
              {data.rooms.map((room) => (
                <RoomCard
                  key={room.priceCode}
                  room={room}
                  calculatedPrice={room.pricing?.finalPrice ?? room.totalPrice}
                  originalPrice={room.pricing?.originalPrice ?? room.totalPrice}
                  currency={currency}
                  onSelect={() => handleSelectRoom(room, data.roomSearchId)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
