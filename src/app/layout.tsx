import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { Figtree, Nunito } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Suspense } from "react";
import { SayfaGecisi } from "@/components/layout/sayfa-gecisi";
import { UstCizgi } from "@/components/layout/ust-cizgi";

// Nunito — yuvarlak uçlu. Logonun kendi yazı tipi yığını zaten bunu istiyor
// (Arial Rounded MT Bold → Nunito → Quicksand); arayüz Manrope ile düz uçlu
// kalınca marka ile ekran farklı dil konuşuyordu.
//
// latin-ext şart: ı ğ ş İ Ğ Ş o alt kümede. next/font dosyayı derlemeye
// gömüyor, dışarıya istek çıkmıyor.
const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "600", "700", "800", "900"],
});

// Yeni tasarım: metin Figtree, başlık kendi yazı tipimiz LB Yastık.
// Eski sayfalar yeni tasarıma geçene kadar Nunito da yükleniyor.
const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
});
const yastik = localFont({
  variable: "--font-yastik",
  src: "./fonts/LBYastik-Bold.woff2",
  weight: "700",
  display: "block",
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("ortak.site");
  return { title: t("baslik"), description: t("aciklama") };
}

// Cihaz genişliği, çentik altına taşan tam ekran (viewport-fit=cover) ve
// tarayıcı çubuğu rengi.
// maximumScale 5 — erişilebilirlik için zoom'u tamamen kapatmıyoruz.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const dil = await getLocale();
  // Sunucu mesajları ve e-posta metinleri (api) tarayıcıya gönderilmez.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { api, ...istemciMetinleri } = await getMessages();
  return (
    <html lang={dil}>
      <body
        className={`${nunito.variable} ${figtree.variable} ${yastik.variable} font-sans antialiased bg-paper text-ink min-h-dvh`}
      >
        <NextIntlClientProvider messages={istemciMetinleri}>
          <Providers>
            <Suspense>
              <UstCizgi />
            </Suspense>
            <SayfaGecisi>{children}</SayfaGecisi>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
