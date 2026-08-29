import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { AppTabBar } from "@/components/layout";
import { APP_MODE_SCRIPT } from "@/lib/utils/app-mode";

// Nunito — yuvarlak uçlu. Logonun kendi yazı tipi yığını zaten bunu istiyor
// (Arial Rounded MT Bold → Nunito → Quicksand); arayüz Manrope ile düz uçlu
// kalınca marka ile ekran farklı dil konuşuyordu.
//
// latin-ext şart: ı ğ ş İ Ğ Ş o alt kümede. next/font dosyayı derlemeye
// gömüyor, WebView'de dışarı istek çıkmıyor ve çevrimdışı da çalışıyor.
const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "LookBeds — Otel Rezervasyon",
  description:
    "Türkiye'nin dört bir yanında 2.400+ otel. En iyi fiyat garantisi, ücretsiz iptal.",
};

// WebView paketlemesi için: cihaz genişliği, çentik altına taşan tam ekran
// (viewport-fit=cover) ve tarayıcı/durum çubuğu için marka rengi.
// maximumScale 5 — erişilebilirlik için zoom'u tamamen kapatmıyoruz.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#e06028",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning: <head>'teki script, React hydrate etmeden önce
    // <html> üstüne data-app ekliyor. Sunucu çıktısında bu attribute yok, bu
    // yüzden React uyarır; fark bilinçli ve yalnızca bu tek attribute.
    <html lang="tr" suppressHydrationWarning>
      <head>
        {/* App modu işaretini ilk boyamadan önce koyar; böylece uygulamada
            gizlenecek öğeler bir an görünüp kaybolmaz. */}
        <script dangerouslySetInnerHTML={{ __html: APP_MODE_SCRIPT }} />
      </head>
      <body
        className={`${nunito.variable} font-sans antialiased bg-paper text-ink min-h-dvh`}
      >
        <Providers>
          {children}
          <AppTabBar />
        </Providers>
      </body>
    </html>
  );
}
