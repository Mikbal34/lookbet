import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AcenteGirisi } from "@/components/lb/giris/acente-girisi";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("giris.meta.acente");
  return { title: t("baslik"), description: t("aciklama") };
}

export default function AcenteGirisSayfasi() {
  return (
    <Suspense>
      <AcenteGirisi />
    </Suspense>
  );
}
