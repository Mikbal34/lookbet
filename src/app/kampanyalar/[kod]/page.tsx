// Tek kampanya sayfası — Pegasus'un kampanya detayının karşılığı:
// tepede fotoğraf ve üstünde başlık, ona binen "geçerlilik tarihi" kartı,
// altında açıklama ve indirim kodu, en altta sabit CTA.
//
// Kapatma (X) app'te fotoğrafın üstünde duruyor; web'de normal navbar ve
// footer olduğu için gerek yok.

import Link from "next/link";
import { notFound } from "next/navigation";
import { X } from "lucide-react";
import { Navbar, Footer } from "@/components/layout";
import { CAMPAIGNS } from "@/lib/constants/campaigns";
import type { Metadata } from "next";

type RouteParams = { params: Promise<{ kod: string }> };

function bul(kod: string) {
  return CAMPAIGNS.find((k) => k.code.toLowerCase() === kod.toLowerCase());
}

export function generateStaticParams() {
  return CAMPAIGNS.map((k) => ({ kod: k.code.toLowerCase() }));
}

export async function generateMetadata({
  params,
}: RouteParams): Promise<Metadata> {
  const { kod } = await params;
  const k = bul(kod);
  return {
    title: k ? `${k.title} — lookbet.` : "Kampanya — lookbet.",
    description: k?.desc,
  };
}

export default async function KampanyaPage({ params }: RouteParams) {
  const { kod } = await params;
  const k = bul(kod);
  if (!k) notFound();

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <div className="web-only">
        <Navbar />
      </div>

      <main className="flex-1">
        {/* Hero — fotoğraf ve üstünde başlık */}
        <div className="relative h-64 bg-navy lg:h-80">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={k.image}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/40 to-ink/45"
          />

          <Link
            href="/kampanyalar"
            aria-label="Kapat"
            className="b2c-only absolute top-[calc(0.75rem+env(safe-area-inset-top))] right-3 flex size-11 items-center justify-center rounded-full bg-ink/40 text-white backdrop-blur active:bg-ink/60"
          >
            <X className="size-5" aria-hidden="true" />
          </Link>

          <div className="relative mx-auto flex h-full max-w-[900px] flex-col justify-end px-4 pb-8 sm:px-6">
            <span className="text-[11px] font-bold tracking-[0.14em] text-white/80 uppercase">
              {k.tag}
            </span>
            <div className="mt-1 flex items-end gap-2.5">
              <span className="text-[38px] leading-none font-extrabold text-gold">
                {k.amount}
              </span>
              <h1 className="pb-1 text-[19px] leading-tight font-extrabold text-white">
                {k.title}
              </h1>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-[900px] px-4 sm:px-6">
          {/* Geçerlilik — hero'ya binen kart */}
          <div className="relative -mt-5 rounded-xl border border-line bg-white px-4 py-3.5 shadow-[0_8px_20px_-10px_rgb(11_13_20/0.3)]">
            <p className="text-[12px] font-semibold text-muted">
              Geçerlilik tarihi
            </p>
            <p className="mt-0.5 text-[15px] font-bold text-ink">{k.until}</p>
          </div>

          <p className="mt-6 text-[15px] leading-relaxed text-slate-text">
            {k.desc}
          </p>

          <div className="mt-6 rounded-xl border border-dashed border-line-strong bg-chip px-4 py-4 text-center">
            <p className="text-[12px] font-semibold text-muted">
              Rezervasyonda bu kodu gir
            </p>
            <p className="mt-1 font-mono text-[20px] font-bold tracking-[3px] text-ink">
              {k.code}
            </p>
          </div>
        </div>
      </main>

      {/* Sabit CTA — app'te ekranın dibinde, web'de akış içinde */}
      <div className="sticky bottom-0 z-20 mt-8 border-t border-line bg-white/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur sm:px-6">
        <div className="mx-auto max-w-[900px]">
          <Link
            href="/search"
            className="flex h-12 w-full items-center justify-center rounded-lg bg-gold text-[15px] font-bold text-ink active:bg-gold-dark"
          >
            Otelleri gör
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}
