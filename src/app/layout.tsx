import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { AppTabBar } from "@/components/layout";
import { APP_MODE_SCRIPT } from "@/lib/utils/app-mode";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700", "800"],
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
        className={`${manrope.variable} font-sans antialiased bg-paper text-ink min-h-dvh`}
      >
        <Providers>
          {children}
          <AppTabBar />
        </Providers>
      </body>
    </html>
  );
}
