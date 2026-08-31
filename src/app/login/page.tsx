// Müşteri girişi.
//
// İki kılık, tek form:
//   • app  → tam ekran manzara fotoğrafı, marka fotoğrafın üstünde, form
//            alta yapışan beyaz yaprak. Telefonda giriş ekranı bir kart
//            değil, ekranın kendisidir.
//   • web  → gradyan zemin üzerinde ortalanmış kart (eskisi gibi).
//
// Ayrım CSS'te (.giris-kap / .giris-kart, bkz. globals.css) çünkü app-only /
// web-only yalnızca gizliyor; konum ve köşe yarıçapı değiştirmiyor. Formu
// iki kez render etmek de olmazdı: CustomerLogin durum tutuyor, iki kopya
// iki ayrı OTP akışı demek olurdu. Statik metin mod başına ayrı yazıldı,
// form tek.

import { Suspense } from "react";
import Link from "next/link";
import { CustomerLogin } from "@/components/auth";
import { LbSolOk } from "@/components/ui/icons";
import { Logo } from "@/components/layout/logo";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Giriş yap — LookBeds",
  description: "LookBeds hesabına giriş yap veya saniyeler içinde hesap oluştur",
};

/** Giriş ekranının zemini — otel havuzu, gün batımı. */
const ZEMIN_FOTO =
  "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=1200&q=80&auto=format&fit=crop";

export default function LoginPage() {
  return (
    <div className="relative min-h-dvh bg-navy-deep">
      {/* APP: fotoğraf + karartma */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={ZEMIN_FOTO}
        alt=""
        aria-hidden="true"
        className="app-only absolute inset-0 h-full w-full object-cover"
      />
      {/* Alt uç çok koyu: form yaprağının üstündeki metin de burada duruyor
          ve fotoğrafın parlak yerine denk gelebiliyor. */}
      <div
        aria-hidden="true"
        className="app-only absolute inset-0 bg-gradient-to-t from-ink/95 via-ink/60 to-ink/45"
      />

      {/* WEB: gradyan zemin */}
      <div
        aria-hidden="true"
        className="web-only absolute inset-0"
        style={{ background: "linear-gradient(160deg,#F6F8FA 60%,#E3EDF8)" }}
      />

      {/* Bu ekranın app'te kimlik çubuğu yok: tam ekran fotoğrafı böler ve
          çubuktaki karşılama hapı /profile'a gider — girişsizde oradan
          tekrar buraya döner, döngü olur. Onun yerine yüzen geri oku. */}
      <Link
        href="/"
        aria-label="Geri"
        className="b2c-only absolute top-[calc(0.75rem+env(safe-area-inset-top))] left-3 z-10 flex size-11 items-center justify-center rounded-full bg-ink/40 text-white backdrop-blur active:bg-ink/60"
      >
        <LbSolOk size={20} />
      </Link>

      {/* APP: marka ve başlık fotoğrafın üstünde */}
      <div className="app-only absolute inset-x-0 top-[calc(5.5rem+env(safe-area-inset-top))] z-10 px-6">
        <Logo variant="light" size="lg" />
        <h1 className="mt-5 text-[26px] leading-tight font-extrabold text-white">
          Tekrar hoş geldin
        </h1>
        <p className="mt-1.5 text-[14px] text-white/85">
          Şifre yok. E-postana gelen kodla saniyeler içinde gir.
        </p>
      </div>

      <div className="giris-kap relative">
        <div className="giris-kart w-full max-w-[400px] rounded-2xl bg-paper p-6 shadow-[0_-8px_28px_-12px_rgb(11_13_20/0.35)] sm:p-8">
          {/* WEB: marka ve başlık kartın içinde */}
          <div className="web-only">
            <div className="text-center">
              <Logo size="lg" className="inline-block" />
            </div>
            <h1 className="mt-6 mb-1 text-center text-[22px] font-extrabold text-ink">
              Tekrar hoş geldin
            </h1>
            <p className="mb-6 text-center text-[13.5px] text-muted">
              Giriş yap veya saniyeler içinde hesap oluştur.
            </p>
          </div>

          <Suspense
            fallback={<div className="h-64 animate-pulse rounded-lg bg-chip" />}
          >
            <CustomerLogin />
          </Suspense>

          {/* Acente yönlendirmesi yalnızca web: tüketici uygulaması B2C-only,
              içinden acente paneline giden bir yol olmamalı. */}
          <div className="web-only mt-6 border-t border-line pt-4 text-center text-xs text-muted">
            Acente misin?{" "}
            <Link
              href="/agency/login"
              className="font-bold text-navy hover:text-navy-dark"
            >
              Partner girişi →
            </Link>
          </div>

          <p className="mt-5 text-center text-[11.5px] leading-relaxed text-muted">
            Devam ederek Kullanım Koşulları ve Gizlilik Politikası&apos;nı kabul
            etmiş olursun.
          </p>
        </div>
      </div>
    </div>
  );
}
