import { Suspense } from "react";
import { Odeme } from "@/components/odeme/odeme";
import { rezervasyonAcik } from "@/lib/rezervasyon-ayar";

// Rezervasyonun açık olup olmadığı çalışma anında okunur (REZERVASYON_ACIK).
export const dynamic = "force-dynamic";

export default function OdemeSayfasi() {
  return (
    <Suspense>
      <Odeme acik={rezervasyonAcik()} />
    </Suspense>
  );
}
