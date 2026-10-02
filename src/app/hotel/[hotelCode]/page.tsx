import { Suspense } from "react";
import { permanentRedirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { otelYolu } from "@/lib/otel-yolu";
import { OtelDetay } from "@/components/otel-detay/otel-detay";

// Eski otel adresi (/hotel/<Etscore kodu>). Okunur adresi olan otel oraya
// kalıcı yönlenir (paylaşılmış bağlantılar, e-postalar, uygulama); adresi
// olmayan (veritabanında henüz yok, ör. örnek veri) burada açılır.

export default async function OtelSayfasi({ params, searchParams }: {
  params: Promise<{ hotelCode: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { hotelCode } = await params;
  const otel = await prisma.hotel.findUnique({ where: { hotelCode }, select: { slug: true } });
  if (otel?.slug) {
    const sorgu = new URLSearchParams();
    for (const [k, v] of Object.entries(await searchParams)) for (const d of [v ?? []].flat()) sorgu.append(k, d);
    permanentRedirect(otelYolu(hotelCode, otel.slug, sorgu.toString() || undefined));
  }
  return (
    <Suspense>
      <OtelDetay kod={hotelCode} />
    </Suspense>
  );
}
