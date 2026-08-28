"use client";

// Hesap menüsü — app modunda hamburger'in yerini alan liste.
//
// App modunda üst menü kaldırıldığı için (bkz. navbar.tsx `web-only`) oradaki
// maddelerin gidecek bir yeri lazım. Booking'in yaptığı gibi "Hesabım"
// sekmesinin içine taşındılar: Yardım, yasal sayfalar, dil/para birimi ve
// çıkış. App'te footer tamamen kaldırıldığı için yasal sayfaların tek
// erişim noktası burası — app store'lar erişilebilir olmasını istiyor.
//
// `b2c-only`: web'de üst menü zaten bunları taşıyor (tekrar olurdu), partner
// uygulaması ise acente panelinin kendi düzenini kullanıyor.

import * as React from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { ChevronRight, FileText, HelpCircle, LogOut, Scale, Shield } from "lucide-react";
import { LocaleSwitcher } from "./locale-switcher";

// Partner girişi bilerek YOK: tüketici uygulaması B2C-only. Acenteler web'den
// ya da ileride ayrı "LookBeds Partner" uygulamasından girecek.
const BAGLANTILAR = [
  { etiket: "Yardım", href: "/yardim", ikon: HelpCircle },
  { etiket: "Gizlilik politikası", href: "/yardim", ikon: Shield },
  { etiket: "Kullanım koşulları", href: "/yardim", ikon: FileText },
  { etiket: "KVKK", href: "/yardim", ikon: Scale },
];

export function AccountMenu({ girisli }: { girisli: boolean }) {
  return (
    <nav
      aria-label="Hesap menüsü"
      className="b2c-only overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
    >
      {BAGLANTILAR.map(({ etiket, href, ikon: Ikon }) => (
        <Link
          key={href}
          href={href}
          className="flex min-h-14 items-center gap-3 border-b border-gray-100 px-4 text-[15px] font-semibold text-ink active:bg-chip"
        >
          <Ikon className="size-5 shrink-0 text-navy" aria-hidden="true" />
          <span className="flex-1">{etiket}</span>
          <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden="true" />
        </Link>
      ))}

      <div className="flex min-h-14 items-center justify-between gap-3 border-b border-gray-100 px-4">
        <span className="text-[15px] font-semibold text-ink">Dil ve para birimi</span>
        <LocaleSwitcher />
      </div>

      {girisli && (
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex min-h-14 w-full items-center gap-3 px-4 text-left text-[15px] font-semibold text-red-600 active:bg-chip"
        >
          <LogOut className="size-5 shrink-0" aria-hidden="true" />
          Çıkış yap
        </button>
      )}
    </nav>
  );
}
