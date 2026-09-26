import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { YardimAna } from "@/components/yardim/yardim-ana";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("yardim.meta");
  return { title: t("baslik"), description: t("aciklama") };
}

export default function YardimSayfasi() {
  return (
    <Suspense>
      <YardimAna />
    </Suspense>
  );
}
