import { notFound, permanentRedirect } from "next/navigation";
import { adiylaOtelBul } from "@/lib/otel-adresi";

// Tek parçalı adres: ilk sürümün otel adresi (lookbeds.com/club-hotel-sera).
// Otel adresleri artık il'li (/antalya/club-hotel-sera); adıyla bulunan otel
// oraya kalıcı yönlenir, bulunamazsa 404. Sitenin kendi yolları (search,
// yardim…) önce eşleşir. Bu klasöre loading.tsx koyma (404 ve 308 bozulur).

export default async function TekParcaliAdres({ params, searchParams }: {
  params: Promise<{ bolum: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ad = decodeURIComponent((await params).bolum).toLowerCase();
  const otel = await adiylaOtelBul(ad);
  if (!otel?.slug) notFound();
  const sorgu = new URLSearchParams();
  for (const [k, v] of Object.entries(await searchParams)) for (const d of [v ?? []].flat()) sorgu.append(k, d);
  permanentRedirect(`/${otel.slug}${sorgu.size ? `?${sorgu}` : ""}`);
}
