import { getTranslations } from "next-intl/server";
import { DurumSayfasi } from "@/components/lb/durum-sayfasi";

export default async function Bulunamadi() {
  const t = await getTranslations("ortak.bulunamadi");
  return <DurumSayfasi nesne="kapi" baslik={t("baslik")} metin={t("metin")} anaSayfa={t("anaSayfa")} />;
}
