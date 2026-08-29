"use client";

// "Daha Fazla" sekmesi — uygulamada footer olmadığı için yardım ve yasal
// sayfaların tek kapısı burası. Pegasus'un beşinci sekmesinin karşılığı.
//
// Bu maddeler önce hesap ekranındaydı; yardım ve KVKK'ya ulaşmak için hesaba
// girmek gerekiyordu. Artık alt çubuktan tek dokunuşla ulaşılıyor.

import * as React from "react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import {
  Building2,
  ChevronRight,
  CircleUserRound,
  FileText,
  HelpCircle,
  LogOut,
  Scale,
  Shield,
} from "lucide-react";
import { AppHeader } from "@/components/layout";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";

const BOLUMLER = [
  {
    baslik: "Hesap",
    satirlar: [
      { etiket: "Hesabım", href: "/profile", ikon: CircleUserRound },
      { etiket: "Rezervasyonlarım", href: "/reservations", ikon: Building2 },
    ],
  },
  {
    baslik: "Destek",
    satirlar: [{ etiket: "Yardım", href: "/yardim", ikon: HelpCircle }],
  },
  {
    baslik: "Yasal",
    satirlar: [
      { etiket: "Gizlilik politikası", href: "/yardim", ikon: Shield },
      { etiket: "Kullanım koşulları", href: "/yardim", ikon: FileText },
      { etiket: "KVKK", href: "/yardim", ikon: Scale },
    ],
  },
];

export default function DahaFazlaPage() {
  const { status } = useSession();

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <AppHeader />

      <main className="flex-1 px-4 pt-4 pb-8">
        <h1 className="mb-4 text-[22px] font-extrabold tracking-[-0.02em] text-ink">
          Daha fazla
        </h1>

        {BOLUMLER.map((b) => (
          <section key={b.baslik} className="mb-5">
            <h2 className="mb-1.5 px-1 text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
              {b.baslik}
            </h2>
            <nav className="overflow-hidden rounded-xl border border-line bg-white">
              {b.satirlar.map(({ etiket, href, ikon: Ikon }, i) => (
                <Link
                  key={etiket}
                  href={href}
                  className={`flex min-h-13 items-center gap-3 px-4 py-3 text-[15px] font-semibold text-ink active:bg-chip ${
                    i < b.satirlar.length - 1 ? "border-b border-line" : ""
                  }`}
                >
                  <Ikon className="size-5 shrink-0 text-navy" aria-hidden="true" />
                  <span className="flex-1">{etiket}</span>
                  <ChevronRight
                    className="size-4 shrink-0 text-muted"
                    aria-hidden="true"
                  />
                </Link>
              ))}
            </nav>
          </section>
        ))}

        <section className="mb-5">
          <h2 className="mb-1.5 px-1 text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
            Tercihler
          </h2>
          <div className="flex min-h-14 items-center justify-between gap-3 rounded-xl border border-line bg-white px-4">
            <span className="text-[15px] font-semibold text-ink">
              Dil ve para birimi
            </span>
            <LocaleSwitcher />
          </div>
        </section>

        {status === "authenticated" && (
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex min-h-13 w-full items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 py-3 text-[15px] font-semibold text-red-600 active:bg-chip"
          >
            <LogOut className="size-5" aria-hidden="true" />
            Çıkış yap
          </button>
        )}
      </main>
    </div>
  );
}
