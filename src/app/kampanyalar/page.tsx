// /kampanyalar — vitrin (Yönetim › Kampanyalar'da "vitrinde göster" işaretli indirimler).
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { vitrinKampanyalari } from "@/lib/kampanya-vitrin";
import { KampanyaVitrini } from "@/components/kampanya/vitrin";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("anaSayfa.vitrin.meta");
  return { title: t("baslik"), description: t("aciklama") };
}
export const dynamic = "force-dynamic";

export default async function KampanyalarSayfasi() {
  return <KampanyaVitrini kampanyalar={await vitrinKampanyalari()} />;
}
