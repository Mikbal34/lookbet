// Ana sayfa — tam ekran açılış (logo, kategoriler, arama), altta vitrindeki
// kampanyalar ve bölge bölge oteller.
// Satırlar veritabanından, bir saat önbellekte; sayfa istek anında üretiliyor
// (derlemede veritabanına bağlanılmıyor).

import { AnaSayfa } from "@/components/ana-sayfa/ana-sayfa";
import { anaSayfaSatirlari } from "@/lib/ana-sayfa";
import { vitrinKampanyalari } from "@/lib/kampanya-vitrin";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [satirlar, kampanyalar] = await Promise.all([
    anaSayfaSatirlari().catch((e) => {
      console.error("[ana sayfa] satırlar alınamadı", e);
      return [];
    }),
    vitrinKampanyalari().catch((e) => {
      console.error("[ana sayfa] kampanyalar alınamadı", e);
      return [];
    }),
  ]);
  return <AnaSayfa satirlar={satirlar} kampanyalar={kampanyalar} />;
}
