// Kampanyalar — lookbet. tasarım dili: koyu gradyan kupon kartları,
// kesikli çizgili kod kutuları, altın CTA.

import Link from "next/link";
import { Navbar, Footer } from "@/components/layout";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kampanyalar — lookbet.",
  description: "Kodu rezervasyonda gir, indirim anında uygulansın.",
};

const deals = [
  {
    tag: "ERKEN REZERVASYON",
    until: "30 Eylül'e kadar",
    amount: "%25",
    title: "Yaz tatilini şimdiden planla",
    desc: "Seçili tatil otellerinde erken rezervasyona %25'e varan indirim. İptal koşulları esnek, girişte ödeme seçeneği geçerli.",
    code: "ERKEN25",
    bg: "linear-gradient(150deg,#E06028,#8F3A12)",
  },
  {
    tag: "HAFTA SONU",
    until: "Her hafta sonu",
    amount: "%15",
    title: "Şehir otellerinde hafta sonu kaçamağı",
    desc: "Cuma–Pazar konaklamalarında şehir otellerine özel %15 indirim. Kahvaltı dahil seçeneklerde de geçerli.",
    code: "HSONU15",
    bg: "linear-gradient(150deg,#9A7410,#6E4E28)",
  },
  {
    tag: "SON DAKİKA",
    until: "72 saat içinde giriş",
    amount: "%30",
    title: "Bugün ara, yarın otelde ol",
    desc: "Girişe 72 saatten az kalan rezervasyonlarda seçili otellerde %30'a varan son dakika indirimi.",
    code: "SONDK30",
    bg: "linear-gradient(150deg,#ED7B45,#E06028)",
  },
  {
    tag: "UZUN KONAKLAMA",
    until: "5 gece ve üzeri",
    amount: "%20",
    title: "Uzun kal, az öde",
    desc: "5 gece ve üzeri konaklamalarda %20 indirim. Aylık konaklamalarda ekstra avantajlar için bizi arayın.",
    code: "UZUN20",
    bg: "linear-gradient(150deg,#14202E,#8F3A12)",
  },
];

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
