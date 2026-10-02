// Yönetim paneli girişi. Siteden bağlantı verilmez, aranmaz (noindex); panel
// adresleri giriş yapmamışa "bulunamadı" döner (middleware). Yalnız var olan
// yönetici hesabı girer: e-posta kodu, "yonetici-otp" (lib/auth/auth-options).
import { Suspense } from "react";
import type { Metadata } from "next";
import { AcenteGirisi } from "@/components/lb/giris/acente-girisi";

export const metadata: Metadata = { title: "Yönetim — LookBeds", robots: { index: false, follow: false } };

export default function YonetimGirisSayfasi() {
  return (
    <Suspense>
      <AcenteGirisi yonetim />
    </Suspense>
  );
}
