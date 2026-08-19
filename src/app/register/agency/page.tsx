// Partner (acente) başvurusu — lookbet. tasarım dili: solda başvuru formu,
// sağda "Neden lookbet partner?" koyu gradyan kartı.
// Hesap oluşturmaz; başvuru admin onayıyla hesaba dönüşür.

import Link from "next/link";
import { AgencyApplicationForm } from "@/components/auth";
import { Logo } from "@/components/layout/logo";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Partner Başvurusu — lookbet.partner",
  description: "lookbet iş ortağı olmak için partner başvurusu yapın",
};

const benefits = [
  { stat: "%12", text: "sektörün üzerinde baz komisyon, hacimle artar" },
  { stat: "2.400+", text: "otelde anlık kontenjan ve net fiyat" },
  { stat: "7/24", text: "partnerlere özel destek hattı" },
  { stat: "API", text: "kendi sitene entegre et, beyaz etiket seçeneği" },
];

export default function AgencyRegisterPage() {
  return (
    <div className="min-h-screen flex flex-col bg-paper">
      {/* Üst bar */}
      <header className="flex items-center justify-between flex-wrap gap-2.5 px-4 sm:px-6 lg:px-14 py-3.5 bg-white border-b border-line">
        <Logo suffix="PARTNER" />
        <Link
          href="/agency/login"
          className="text-[13.5px] font-semibold text-navy hover:text-gold transition-colors"
        >
          Zaten partnerim → Giriş
        </Link>
      </header>

      <main className="max-w-[1080px] w-full mx-auto px-4 sm:px-6 lg:px-14 py-10 lg:py-12 flex-1">
        <div className="flex flex-wrap gap-9 items-start">
          {/* Form */}
          <div className="flex-[999_1_300px] min-w-0">
            <h1 className="font-serif text-3xl lg:text-[34px] font-normal mb-2">
              Partner başvurusu
            </h1>
            <p className="text-[14.5px] text-muted mb-7">
              Formu doldur, ekibimiz 2 iş günü içinde dönüş yapsın.
            </p>
            <div className="bg-white rounded-md p-7 border border-[rgb(26_24_20/0.08)]">
              <AgencyApplicationForm />
            </div>
          </div>

          {/* Neden lookbet partner? — tek renk koyu mavi */}
          <aside className="rounded-md p-8 text-paper lg:sticky lg:top-6 flex-[1_1_300px] bg-navy-deep">
            <div className="text-xs font-bold tracking-[2px] uppercase text-gold mb-[18px]">
              Neden lookbet partner?
            </div>
            <div className="flex flex-col gap-[18px] text-sm leading-normal">
              {benefits.map((b) => (
                <div key={b.stat} className="flex gap-3">
                  <b className="text-gold shrink-0">{b.stat}</b>
                  <span>{b.text}</span>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
