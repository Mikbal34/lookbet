"use client";

// "Daha Fazla" sekmesi — uygulamada footer olmadığı için yardım ve yasal
// sayfaların tek kapısı burası. Pegasus'un beşinci sekmesinin karşılığı.
//
// Bu maddeler önce hesap ekranındaydı; yardım ve KVKK'ya ulaşmak için hesaba
// girmek gerekiyordu. Artık alt çubuktan tek dokunuşla ulaşılıyor.

import * as React from "react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { LbSagOk } from "@/components/ui/icons";
import { AppHeader } from "@/components/layout";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";

const BOLUMLER = [
  {
    baslik: "Hesap",
    satirlar: [
      { etiket: "Hesabım", href: "/profile" },
      { etiket: "Rezervasyonlarım", href: "/reservations" },
    ],
  },
  {
    baslik: "Destek",
    satirlar: [{ etiket: "Yardım", href: "/yardim" }],
  },
  {
    baslik: "Yasal",
    satirlar: [
      { etiket: "Gizlilik politikası", href: "/yardim" },
      { etiket: "Kullanım koşulları", href: "/yardim" },
      { etiket: "KVKK", href: "/yardim" },
    ],
  },
];

export default function DahaFazlaPage() {
  const { status } = useSession();

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <AppHeader baslik="Daha fazla" />

      <main className="flex-1 px-4 pt-4 pb-8">
        <h1 className="web-only mb-4 text-[22px] font-extrabold tracking-[-0.02em] text-ink">
          Daha fazla
        </h1>

        {BOLUMLER.map((b) => (
          <section key={b.baslik} className="mb-5">
            <h2 className="mb-1.5 px-1 text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
              {b.baslik}
            </h2>
            <nav className="overflow-hidden rounded-xl border border-line bg-white">
              {b.satirlar.map(({ etiket, href }, i) => (
                <Link
                  key={etiket}
                  href={href}
                  className={`flex min-h-13 items-center gap-3 px-4 py-3 text-[15px] font-semibold text-ink active:bg-chip ${
                    i < b.satirlar.length - 1 ? "border-b border-line" : ""
                  }`}
                >
                  <span className="flex-1">{etiket}</span>
                  <LbSagOk size={16} className="text-muted" />
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
            Çıkış yap
          </button>
        )}
      </main>
    </div>
  );
}
