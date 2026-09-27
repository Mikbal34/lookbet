"use client";

// Mobil uygulama görünümü (yalnız müşteri, Airbnb uygulaması gibi): bağlam,
// alt sekmeler ve otel bağlantılarının hedefi. Uygulama olup olmadığına sunucu
// karar verir (lib/uygulama), kök düzen buraya iletir. Telefon tarayıcısı
// normal siteyi görür (kullanıcı kararı, 2026-09-27).

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { icGecisVar } from "@/components/layout/sayfa-gecisi";
import { Ikon, type IkonAdi } from "./ikon";
import s from "./uygulama.module.css";

const Baglam = React.createContext(false);

export function UygulamaSaglayici({ uygulama, children }: { uygulama: boolean; children: React.ReactNode }) {
  return <Baglam.Provider value={uygulama}>{children}</Baglam.Provider>;
}

export const useUygulama = () => React.useContext(Baglam);

const DOKUNMATIK = "(hover: none) and (pointer: coarse)";
const dokunmatikAbone = (bildir: () => void) => {
  const m = matchMedia(DOKUNMATIK);
  m.addEventListener("change", bildir);
  return () => m.removeEventListener("change", bildir);
};

/**
 * Otel sayfası yeni sekmede mi açılsın: masaüstünde evet (Airbnb gibi, arama
 * yerinde kalır); telefonda ve uygulamada aynı sekmede, geri tuşu sonuçlara döner.
 */
export function useYeniSekme(): boolean {
  const uygulama = useUygulama();
  const dokunmatik = React.useSyncExternalStore(dokunmatikAbone, () => matchMedia(DOKUNMATIK).matches, () => false);
  return !uygulama && !dokunmatik;
}

/**
 * Uygulamada sekmesiz sayfaların (yardım, kampanyalar) geri düğmesi: tarayıcı
 * çubuğu ve alt sekmeler olmadığından başka çıkış yok. Uygulama içinden
 * gelindiyse geçmişe döner (kaydırma yeri korunur), doğrudan açıldıysa `yedek`e.
 */
export function UygulamaGeri({ yedek }: { yedek: string }) {
  const router = useRouter();
  const tk = useTranslations("ortak");
  return (
    <button type="button" className={s.geri} aria-label={tk("geri")} onClick={() => (icGecisVar() ? history.back() : router.push(yedek))}>
      <Ikon ad="back" boyut={18} />
    </button>
  );
}

/** Alt sekmelerin göründüğü sayfalar; otel, ödeme ve alt sayfalar tam ekran açılır. */
const SEKMELI = new Set(["/", "/search", "/favoriler", "/reservations", "/profile"]);

/**
 * Sekmeler aşağı kaydırınca çekilir, yukarı kaydırınca döner (Airbnb gibi);
 * tam ekran bir pencere açıkken (arama, oda, giriş: sayfa kaydırması
 * kilitli) de çekilir, pencerenin altında kalmasın. Başka sayfaya geçince görünür.
 */
function useSekmelerGizli(etkin: boolean, yol: string): boolean {
  const [asagiYol, setAsagiYol] = React.useState<string | null>(null);
  const [katman, setKatman] = React.useState(false);
  React.useEffect(() => {
    if (!etkin) return;
    let son = window.scrollY;
    const kaydir = () => {
      const y = window.scrollY;
      if (Math.abs(y - son) < 10) return;
      setAsagiYol(y > son && y > 120 ? yol : null);
      son = y;
    };
    const gozlemci = new MutationObserver(() => setKatman(document.body.style.overflow === "hidden"));
    gozlemci.observe(document.body, { attributes: true, attributeFilter: ["style"] });
    window.addEventListener("scroll", kaydir, { passive: true });
    return () => {
      window.removeEventListener("scroll", kaydir);
      gozlemci.disconnect();
    };
  }, [etkin, yol]);
  return asagiYol === yol || katman;
}

export function UygulamaSekmeleri() {
  const uygulama = useUygulama();
  const yol = usePathname();
  const t = useTranslations("ust.uygulama");
  const { status } = useSession();
  const gizli = useSekmelerGizli(uygulama, yol);
  // Sekmelerin üstünde duran yüzen düğmeler (harita) sekmelerle birlikte kaysın.
  React.useEffect(() => {
    const kok = document.documentElement;
    kok.toggleAttribute("data-sekme-cekili", uygulama && gizli);
    return () => kok.removeAttribute("data-sekme-cekili");
  }, [uygulama, gizli]);
  if (!uygulama || !SEKMELI.has(yol)) return null;
  // Oturum yüklenirken girişli say: girişli kullanıcıda sekmeler zıplamasın.
  const girisli = status !== "unauthenticated";
  const sekmeler: { href: string; ad: string; ikon: IkonAdi; aktif: boolean }[] = [
    { href: "/", ad: t("kesfet"), ikon: "search", aktif: yol === "/" || yol === "/search" },
    { href: "/favoriler", ad: t("favoriler"), ikon: "heart", aktif: yol === "/favoriler" },
    ...(girisli ? [{ href: "/reservations", ad: t("rezervasyonlar"), ikon: "rezervasyon" as const, aktif: yol === "/reservations" }] : []),
    { href: "/profile", ad: girisli ? t("profil") : t("girisYap"), ikon: "user", aktif: yol === "/profile" },
  ];
  return (
    <>
      <div className={s.bosluk} aria-hidden="true" />
      <nav className={`lb ${s.sekmeler}`} data-gizli={gizli || undefined} aria-label={t("sekmeler")} style={{ "--n": sekmeler.length } as React.CSSProperties}>
        {sekmeler.map((k) => (
          <Link key={k.href} href={k.href} aria-current={k.aktif ? "page" : undefined}>
            <Ikon ad={k.ikon} boyut={24} kalinlik={k.aktif ? 2 : 1.75} />
            <span>{k.ad}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
