// Ana sayfa — tam ekran açılış (logo, kategoriler, arama), altta bölge bölge oteller.
// Satırlar veritabanından, bir saat önbellekte; sayfa istek anında üretiliyor
// (derlemede veritabanına bağlanılmıyor).

import { AnaSayfa } from "@/components/ana-sayfa/ana-sayfa";
import { anaSayfaSatirlari } from "@/lib/ana-sayfa";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const satirlar = await anaSayfaSatirlari().catch((e) => {
    console.error("[ana sayfa] satırlar alınamadı", e);
    return [];
  });
  return <AnaSayfa satirlar={satirlar} />;
}
