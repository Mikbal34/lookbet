// /kampanyalar — vitrin (Yönetim › Kampanyalar'da "vitrinde göster" işaretli indirimler).
import type { Metadata } from "next";
import { vitrinKampanyalari } from "@/lib/kampanya-vitrin";
import { KampanyaVitrini } from "@/components/kampanya/vitrin";

export const metadata: Metadata = {
  title: "Kampanyalar — LookBeds",
  description: "Erken rezervasyon, son dakika ve uzun konaklama indirimleri. Kod gerekmez, fiyata kendiliğinden yansır.",
};
export const dynamic = "force-dynamic";

export default async function KampanyalarSayfasi() {
  return <KampanyaVitrini kampanyalar={await vitrinKampanyalari()} />;
}
