import { Suspense, cache } from "react";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { adiylaOtelBul } from "@/lib/otel-adresi";
import { OtelDetay } from "@/components/otel-detay/otel-detay";

// Otel sayfası, okunur adresle: lookbeds.com/<il>/<otel> (lib/otel-adresi).
// Sitenin kendi yolları (yardim/…, hotel/…) önce eşleşir; kalan iki parçalı
// adresler buraya düşer. Büyük harfli adres küçük harfliye, ili yanlış adres
// doğrusuna yönlenir; otel yoksa 404. Bu klasöre ve üstüne loading.tsx
// koyma: sayfa akışla başlar, 404 ve yönlendirmeler 200 olur.

type Parametre = {
  params: Promise<{ bolum: string; otel: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const otelBul = cache(async (bolum: string, otel: string) => {
  const adres = `${decodeURIComponent(bolum)}/${decodeURIComponent(otel)}`.toLowerCase();
  const kayit = await prisma.hotel.findUnique({ where: { slug: adres }, select: { hotelCode: true, name: true } });
  return kayit ? { ...kayit, adres } : null;
});

export async function generateMetadata({ params }: Parametre): Promise<Metadata> {
  const { bolum, otel } = await params;
  const kayit = await otelBul(bolum, otel);
  return kayit ? { title: `${kayit.name} — LookBeds` } : {};
}

export default async function OtelSayfasi({ params, searchParams }: Parametre) {
  const { bolum, otel } = await params;
  const kayit = await otelBul(bolum, otel);
  const sorgu = async () => {
    const s = new URLSearchParams();
    for (const [k, v] of Object.entries(await searchParams)) for (const d of [v ?? []].flat()) s.append(k, d);
    return s.size ? `?${s}` : "";
  };
  if (!kayit) {
    // İli yanlış ya da değişmiş adres: otelin adıyla doğrusunu bul.
    const dogru = await adiylaOtelBul(decodeURIComponent(otel).toLowerCase());
    if (dogru?.slug) permanentRedirect(`/${dogru.slug}${await sorgu()}`);
    notFound();
  }
  if (`${bolum}/${otel}` !== kayit.adres) permanentRedirect(`/${kayit.adres}${await sorgu()}`);
  return (
    <Suspense>
      <OtelDetay kod={kayit.hotelCode} />
    </Suspense>
  );
}
