import { Suspense } from "react";
import type { Metadata } from "next";
import { GirisSayfasi } from "@/components/lb/giris/giris-sayfasi";

export const metadata: Metadata = {
  title: "Giriş yap — LookBeds",
  description: "LookBeds hesabına giriş yap ya da saniyeler içinde üye ol",
};

export default function GirisSayfa() {
  return (
    <Suspense>
      <GirisSayfasi />
    </Suspense>
  );
}
