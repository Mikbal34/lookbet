import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Hesap } from "@/components/hesap/hesap";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("hesap.meta");
  return { title: t("hesap") };
}

export default function HesapSayfasi() {
  return <Hesap />;
}
