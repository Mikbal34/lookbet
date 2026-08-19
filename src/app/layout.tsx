import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body
        className={`${manrope.variable} font-sans antialiased bg-paper text-ink`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
