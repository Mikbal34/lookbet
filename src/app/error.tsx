"use client";

// Sayfada beklenmeyen hata: kendi dilinde, tekrar deneme ve ana sayfa.
import * as React from "react";
import { useTranslations } from "next-intl";
import { DurumSayfasi } from "@/components/lb/durum-sayfasi";

export default function SayfaHatasi({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("ortak");
  React.useEffect(() => {
    console.error("[SAYFA_HATASI]", error.digest ?? "", error);
  }, [error]);
  return (
    <DurumSayfasi
      nesne="zil"
      baslik={t("sayfaHatasi.baslik")}
      metin={t("sayfaHatasi.metin")}
      anaSayfa={t("bulunamadi.anaSayfa")}
      tekrar={{ metin: t("tekrarDene"), onClick: reset }}
    />
  );
}
