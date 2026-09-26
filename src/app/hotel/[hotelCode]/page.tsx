import { Suspense } from "react";
import { OtelDetay } from "@/components/otel-detay/otel-detay";

export default async function OtelSayfasi({ params }: { params: Promise<{ hotelCode: string }> }) {
  const { hotelCode } = await params;
  return (
    <Suspense>
      <OtelDetay kod={hotelCode} />
    </Suspense>
  );
}
