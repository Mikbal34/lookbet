// Kampanyalar listesi — fotoğraflı kartlar, köşede kurdele rozet.
// Detay, indirim kodu ve CTA tek kampanya sayfasında (./[kod]).

import Link from "next/link";
import {AppHeader, Navbar, Footer } from "@/components/layout";
import type { Metadata } from "next";
import { CAMPAIGNS } from "@/lib/constants/campaigns";

export const metadata: Metadata = {
  title: "Kampanyalar — lookbet.",
  description: "Kodu rezervasyonda gir, indirim anında uygulansın.",
};



const deals = CAMPAIGNS;

export default function DealsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-paper">
      <AppHeader />
      <div className="web-only">
        <Navbar />
      </div>

      <main className="flex-1 max-w-[1280px] w-full mx-auto px-4 sm:px-6 lg:px-10 py-11">
        <h1 className="font-serif text-3xl lg:text-4xl font-normal mb-1.5">
          Kampanyalar
        </h1>
        <p className="text-[14.5px] text-muted mb-8">
          Kodu rezervasyonda gir, indirim anında uygulansın.
        </p>

        {/* Fotoğraflı kartlar — köşede kurdele rozet, altta başlık.
            Dokununca kampanya sayfası açılıyor; detay, indirim kodu ve CTA
            orada. Eskiden hepsi kartın içine sıkıştırılmıştı. */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {deals.map((d) => (
            <Link
              key={d.code}
              href={`/kampanyalar/${d.code.toLowerCase()}`}
              className="group relative block h-52 overflow-hidden rounded-xl bg-navy"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={d.image}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                loading="lazy"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/35 to-transparent"
              />

              {/* Kurdele rozet */}
              <span className="absolute top-4 right-0 rounded-l-sm bg-gold px-3 py-1.5 text-[11px] font-bold tracking-[0.1em] text-ink uppercase shadow-[0_2px_0_rgb(11_13_20/0.2)]">
                {d.tag}
              </span>

              <div className="absolute inset-x-0 bottom-0 p-4">
                {/* Tutar üstte, başlık altında: yan yana dizilince iki
                    satırlık başlıklarda hiza bozuluyordu. */}
                <span className="block text-[32px] leading-none font-extrabold text-gold">
                  {d.amount}
                </span>
                <h2 className="mt-1 text-[17px] leading-tight font-extrabold text-white">
                  {d.title}
                </h2>
                <p className="mt-1 text-[12.5px] text-white/75">{d.until}</p>
              </div>
            </Link>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
