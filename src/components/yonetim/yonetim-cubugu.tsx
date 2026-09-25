"use client";

// LookBeds Yönetim üst çubuğu: solda marka, ortada Bugün · Rezervasyonlar ·
// Acenteler · Fiyatlar · Raporlar; sağda bildirim zili ve menü (kullanıcılar,
// içerik senkronu, bildirimler, denetim kaydı, sistem). Mobilde sekmeler
// ekranın altına iner.

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { signOut, useSession } from "next-auth/react";
import { Ikon, type IkonAdi } from "@/components/lb/ikon";
import { getir } from "./ortak";
import s from "./yonetim.module.css";

const SEKMELER = [
  { href: "/admin", ad: "Bugün" },
  { href: "/admin/reservations", ad: "Rezervasyonlar" },
  { href: "/admin/agencies", ad: "Acenteler" },
  { href: "/admin/price-rules", ad: "Fiyatlar" },
  { href: "/admin/reports", ad: "Raporlar" },
];
const MENU: { href: string; ad: string; ikon: IkonAdi }[] = [
  { href: "/admin/users", ad: "Kullanıcılar", ikon: "guests" },
  { href: "/admin/content", ad: "İçerik senkronu", ikon: "globe" },
  { href: "/admin/notifications", ad: "Bildirimler", ikon: "bell" },
  { href: "/admin/audit-logs", ad: "Denetim kaydı", ikon: "list" },
  { href: "/admin/settings", ad: "Sistem", ikon: "lock" },
];

const aktifMi = (yol: string | null, href: string) => (href === "/admin" ? yol === "/admin" : !!yol?.startsWith(href));

export function YonetimCubugu() {
  const yol = usePathname();
  const { data: oturum } = useSession();
  const [acik, setAcik] = React.useState(false);
  const kok = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!acik) return;
    const dis = (e: PointerEvent) => !kok.current?.contains(e.target as Node) && setAcik(false);
    const tus = (e: KeyboardEvent) => e.key === "Escape" && setAcik(false);
    document.addEventListener("pointerdown", dis);
    document.addEventListener("keydown", tus);
    return () => {
      document.removeEventListener("pointerdown", dis);
      document.removeEventListener("keydown", tus);
    };
  }, [acik]);

  const sayilar = useQuery({
    queryKey: ["yonetim", "rozetler"],
    queryFn: async () => {
      const [b, n] = await Promise.all([
        getir<{ pendingCount: number }>("/api/admin/agency-applications?status=PENDING&limit=1"),
        getir<{ unreadCount: number }>("/api/admin/notifications?kutu=ben&limit=1"),
      ]);
      return { basvuru: b.pendingCount, okunmamis: n.unreadCount };
    },
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  const ad = oturum?.user?.name ?? "";
  const kapat = () => setAcik(false);

  return (
    <header className={s.ust}>
      <div className={s.ustIc}>
        <Link href="/admin" className={s.marka}>
          <span className="lb-y">LookBeds</span>
          <small>Yönetim</small>
        </Link>
        <nav className={s.sekmeler} aria-label="Yönetim">
          {SEKMELER.map((k) => (
            <Link key={k.href} href={k.href} aria-current={aktifMi(yol, k.href) ? "page" : undefined}>
              {k.ad}
              {k.href === "/admin/agencies" && !!sayilar.data?.basvuru && (
                <i className={s.say} aria-label={`${sayilar.data.basvuru} bekleyen başvuru`}>{sayilar.data.basvuru}</i>
              )}
            </Link>
          ))}
        </nav>
        <div className={s.sag}>
          <Link
            href="/admin/notifications"
            className={s.zil}
            aria-label={sayilar.data?.okunmamis ? `Bildirimler, ${sayilar.data.okunmamis} okunmamış` : "Bildirimler"}
          >
            <Ikon ad="bell" boyut={20} />
            {!!sayilar.data?.okunmamis && <i />}
          </Link>
          <div className={s.menuKok} ref={kok}>
            <button type="button" className={s.menuDugme} aria-expanded={acik} aria-haspopup="true" onClick={() => setAcik((a) => !a)} aria-label="Menü">
              <Ikon ad="menu" boyut={18} />
              <span className={s.avatar}>{ad.trim()[0]?.toLocaleUpperCase("tr") || <Ikon ad="user" boyut={16} />}</span>
            </button>
            <nav className={s.acilir} data-acik={acik || undefined} aria-label="Menü">
              <div className={s.kimlik}>
                <b>{ad || "Yönetici"}</b>
                <span>{oturum?.user?.email} · Yönetici</span>
              </div>
              <hr />
              {MENU.map((m) => (
                <Link key={m.href} href={m.href} onClick={kapat} aria-current={aktifMi(yol, m.href) ? "page" : undefined}>
                  <Ikon ad={m.ikon} boyut={18} />
                  {m.ad}
                </Link>
              ))}
              <hr />
              <Link href="/" onClick={kapat}><Ikon ad="external" boyut={18} />Siteye dön</Link>
              <button type="button" onClick={() => signOut({ callbackUrl: "/agency/login" })}><Ikon ad="logout" boyut={18} />Çıkış yap</button>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}
