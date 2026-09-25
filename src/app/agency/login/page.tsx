import { Suspense } from "react";
import type { Metadata } from "next";
import { AcenteGirisi } from "@/components/lb/giris/acente-girisi";

export const metadata: Metadata = {
  title: "Acente girişi — LookBeds Partner",
  description: "LookBeds Partner paneline giriş yap",
};

export default function AcenteGirisSayfasi() {
  return (
    <Suspense>
      <AcenteGirisi />
    </Suspense>
  );
}
