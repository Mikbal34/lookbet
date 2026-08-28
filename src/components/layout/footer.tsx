import Link from "next/link";
import { Phone } from "lucide-react";
import { Logo } from "./logo";
import { LocaleFooterLabel } from "./locale-switcher";

// LookBeds footer — CruiseScanner tasarımının turuncu hali:
// düz marka rengi zemin, logo + tagline + telefon, kolon grid, fine print.
export function Footer() {
  const columns = [
    {
      heading: "Planla",
      links: [
        { label: "Otel ara", href: "/search" },
        { label: "Kampanyalar", href: "/kampanyalar" },
        { label: "Popüler bölgeler", href: "/search" },
      ],
    },
    {
      heading: "LookBeds",
      links: [
        { label: "Hakkımızda", href: "/yardim" },
        { label: "İletişim", href: "/yardim" },
        { label: "Partner paneli", href: "/agency/login" },
        { label: "Partner başvurusu", href: "/register/agency" },
      ],
    },
    {
      heading: "Yasal",
      links: [
        { label: "Gizlilik politikası", href: "/yardim" },
        { label: "Kullanım koşulları", href: "/yardim" },
        { label: "KVKK", href: "/yardim" },
        { label: "İptal & iade", href: "/yardim" },
      ],
    },
    {
      heading: "Hesap",
      links: [
        { label: "Giriş yap", href: "/login" },
        { label: "Rezervasyonlarım", href: "/reservations" },
        { label: "Yardım merkezi", href: "/yardim" },
      ],
    },
  ] as const;

  return (
    <footer className="site-footer mt-16 bg-navy text-white">
      <div className="mx-auto max-w-[1200px] px-4 pt-10 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-6 sm:py-12 lg:py-16">
        {/* Üst — logo + tagline + telefon */}
        <div className="web-only flex flex-col gap-6 border-b border-white/10 pb-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl">
            <Logo variant="light" size="md" />
            <p className="mt-4 text-[14.5px] leading-relaxed text-white/75">
              Türkiye&apos;nin dört bir yanında 2.400+ otel. En iyi fiyat
              garantisi, çoğu otelde ücretsiz iptal, girişte ödeme seçeneği.
            </p>
            <p className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1">
              <a
                href="tel:+908502550000"
                className="inline-flex items-center gap-2 text-[17px] font-extrabold tracking-[-0.01em] text-white underline-offset-[3px] hover:underline"
              >
                <Phone className="size-4" aria-hidden />
                0850 255 00 00
              </a>
              <span className="text-[12.5px] text-white/60">
                Her gün 09.00 – 24.00
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[12.5px] font-semibold">
            <span className="inline-flex items-center gap-3 rounded-full border border-white/25 bg-white/5 px-3 py-1.5 text-white">
              <LocaleFooterLabel />
            </span>
          </div>
        </div>

        {/* Kolonlar */}
        <div className="web-only grid grid-cols-2 gap-x-6 gap-y-10 pt-10 sm:grid-cols-4 lg:gap-x-10">
          {columns.map((col) => (
            <div key={col.heading}>
              <h4 className="text-[12.5px] font-semibold tracking-[0.04em] text-white uppercase">
                {col.heading}
              </h4>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-[13.5px] text-white/75 underline-offset-[3px] hover:text-white hover:underline"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* App modunda kolonlar gizli; yasal sayfalar yine de tek dokunuş uzakta */}
        <nav className="app-only flex flex-wrap items-center gap-x-4 gap-y-2 pb-1">
          {[
            { label: "Gizlilik politikası", href: "/yardim" },
            { label: "Kullanım koşulları", href: "/yardim" },
            { label: "KVKK", href: "/yardim" },
            { label: "Yardım", href: "/yardim" },
          ].map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className="text-[13px] text-white/75 underline-offset-[3px] active:text-white"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Fine print */}
        <div className="site-footer-fine mt-10 flex flex-col gap-2 border-t border-white/10 pt-6 sm:mt-12">
          <p className="text-[12px] font-semibold tracking-[0.01em] text-white/80">
            LookBeds Turizm A.Ş. · TÜRSAB Belge No: 0000
          </p>
          <p className="text-[11.5px] tracking-[0.04em] text-white/50">
            © 2026 LookBeds. Tüm hakları saklıdır.
          </p>
        </div>
      </div>
    </footer>
  );
}
