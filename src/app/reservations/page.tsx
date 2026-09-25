import { Suspense } from "react";
import { Rezervasyonlar } from "@/components/rezervasyonlar/rezervasyonlar";

export default function RezervasyonlarSayfasi() {
  return (
    <Suspense>
      <Rezervasyonlar />
    </Suspense>
  );
}
