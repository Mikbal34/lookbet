// Kampanyalar — lookbet. tasarım dili: koyu gradyan kupon kartları,
// kesikli çizgili kod kutuları, altın CTA.

import Link from "next/link";
import { Navbar, Footer } from "@/components/layout";
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
      <Navbar />

      <main className="flex-1 max-w-[1280px] w-full mx-auto px-4 sm:px-6 lg:px-10 py-11">
        <h1 className="font-serif text-3xl lg:text-4xl font-normal mb-1.5">
          Kampanyalar
        </h1>
        <p className="text-[14.5px] text-muted mb-8">
          Kodu rezervasyonda gir, indirim anında uygulansın.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {deals.map((d) => (
            <div
              key={d.code}
              className="rounded-md px-8 py-[30px] text-paper relative overflow-hidden flex flex-col gap-2"
              style={{ background: d.bg }}
            >
              <div
                className="absolute -right-10 -top-10 w-[180px] h-[180px] rounded-full bg-paper/[0.08]"
                aria-hidden="true"
              />
              <div className="flex justify-between items-center">
                <span className="bg-paper/15 rounded-sm px-3 py-[5px] text-xs font-bold tracking-[1px]">
                  {d.tag}
                </span>
                <span className="text-[12.5px] text-paper/65">{d.until}</span>
              </div>
              <div className="font-serif text-[42px] text-gold mt-2">
                {d.amount}
              </div>
              <div className="text-[17px] font-bold">{d.title}</div>
              <div className="text-[13.5px] text-paper/70 leading-relaxed max-w-[380px]">
                {d.desc}
              </div>
              <div className="flex justify-between items-center mt-3.5 flex-wrap gap-3">
                <span className="border border-dashed border-paper/40 rounded-sm px-4 py-2 text-sm font-bold tracking-[2px]">
                  {d.code}
                </span>
                <Link
                  href="/search"
                  className="bg-gold text-ink rounded-md px-5 py-[11px] text-[13px] font-bold hover:bg-gold-dark transition-colors"
                >
                  Otelleri gör
                </Link>
              </div>
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
