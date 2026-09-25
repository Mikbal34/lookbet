import type { Metadata, Viewport } from "next";
import { Figtree, Nunito } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "@/components/providers";
import { SayfaGecisi } from "@/components/layout/sayfa-gecisi";

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

export const metadata: Metadata = {
  title: "LookBeds — Otel Rezervasyon",
  description:
    "Türkiye'nin dört bir yanında 2.400+ otel. En iyi fiyat garantisi, ücretsiz iptal.",
};

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body
        className={`${nunito.variable} ${figtree.variable} ${yastik.variable} font-sans antialiased bg-paper text-ink min-h-dvh`}
      >
        <Providers>
          <SayfaGecisi>{children}</SayfaGecisi>
        </Providers>
      </body>
    </html>
  );
}
