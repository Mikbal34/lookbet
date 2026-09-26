"use client";

// Sayfa geçişinde üstte ince turuncu çizgi: iç bağlantıya tıklanınca başlar,
// adres değişince tamamlanıp kaybolur. Kısa geçişlerde tam ekran animasyon
// yerine bu; takılırsa 10 sn sonra kendiliğinden kapanır.

import * as React from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function UstCizgi() {
  const anahtar = `${usePathname()}?${useSearchParams().toString()}`;
  const [durum, setDurum] = React.useState<"yok" | "calisiyor" | "bitiyor">("yok");
  const [onceki, setOnceki] = React.useState(anahtar);
  if (onceki !== anahtar) {
    setOnceki(anahtar);
    if (durum === "calisiyor") setDurum("bitiyor");
  }

  React.useEffect(() => {
    const tik = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
      const u = new URL(a.href, location.href);
      if (u.origin !== location.origin || (u.pathname === location.pathname && u.search === location.search)) return;
      setDurum("calisiyor");
    };
    document.addEventListener("click", tik);
    return () => document.removeEventListener("click", tik);
  }, []);

  React.useEffect(() => {
    if (durum === "yok") return;
    const t = setTimeout(() => setDurum("yok"), durum === "bitiyor" ? 450 : 10_000);
    return () => clearTimeout(t);
  }, [durum]);

  if (durum === "yok") return null;
  return <div className="ust-cizgi" data-durum={durum} aria-hidden="true"><i /></div>;
}
