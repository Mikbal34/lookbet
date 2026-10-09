import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Favoriler } from "@/components/hesap/favoriler";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("hesap.meta");
  return { title: t("favoriler") };
}

export default function FavorilerSayfasi() {
  return <Favoriler />;
}
