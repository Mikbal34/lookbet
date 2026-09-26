import { Suspense } from "react";
import { Rezervasyonlar } from "@/components/yonetim/rezervasyonlar";

export const metadata = { title: "Rezervasyonlar — LookBeds Yönetim" };

export default function YonetimRezervasyonlar() {
  return (
    <Suspense>
      <Rezervasyonlar />
    </Suspense>
  );
}
