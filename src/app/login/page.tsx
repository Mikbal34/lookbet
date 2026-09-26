import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { GirisSayfasi } from "@/components/lb/giris/giris-sayfasi";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("giris.meta.giris");
  return { title: t("baslik"), description: t("aciklama") };
}

export default function GirisSayfa() {
  return (
    <Suspense>
      <GirisSayfasi />
    </Suspense>
  );
}
