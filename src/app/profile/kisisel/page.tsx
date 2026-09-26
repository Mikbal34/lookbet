import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { KisiselBilgiler } from "@/components/hesap/kisisel";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("hesap.meta");
  return { title: t("kisisel") };
}

export default function KisiselSayfasi() {
  return <KisiselBilgiler />;
}
