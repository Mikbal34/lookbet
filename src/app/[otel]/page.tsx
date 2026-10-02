import { Suspense, cache } from "react";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { OtelDetay } from "@/components/otel-detay/otel-detay";

// Otel sayfası, okunur adresle: lookbeds.com/club-hotel-sera (lib/otel-adresi).
// Sitenin kendi yolları (search, yardim…) önce eşleşir; kalan tek parçalı
// adresler buraya düşer: otel yoksa 404. Büyük harfle gelen adres
// (Etstur alışkanlığı: /Club-Hotel-Sera) küçük harfliye yönlenir.

type Parametre = { params: Promise<{ otel: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

const otelBul = cache(async (istenen: string) => {
  const adres = decodeURIComponent(istenen).toLowerCase();
  const otel = await prisma.hotel.findUnique({ where: { slug: adres }, select: { hotelCode: true, name: true } });
  return otel ? { ...otel, adres } : null;
});

export async function generateMetadata({ params }: Parametre): Promise<Metadata> {
  const otel = await otelBul((await params).otel);
  return otel ? { title: `${otel.name} — LookBeds` } : {};
}

export default async function OtelSayfasi({ params, searchParams }: Parametre) {
  const { otel: istenen } = await params;
  const otel = await otelBul(istenen);
  if (!otel) notFound();
  if (istenen !== otel.adres) {
    const sorgu = new URLSearchParams();
    for (const [k, v] of Object.entries(await searchParams)) for (const d of [v ?? []].flat()) sorgu.append(k, d);
    permanentRedirect(`/${otel.adres}${sorgu.size ? `?${sorgu}` : ""}`);
  }
  return (
    <Suspense>
      <OtelDetay kod={otel.hotelCode} />
    </Suspense>
  );
}
