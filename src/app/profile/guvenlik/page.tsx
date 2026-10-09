import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Guvenlik } from "@/components/hesap/guvenlik";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("hesap.meta");
  return { title: t("guvenlik") };
}

export default function GuvenlikSayfasi() {
  return <Guvenlik />;
}
