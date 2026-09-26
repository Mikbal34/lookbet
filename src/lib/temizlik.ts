import { prisma } from "@/lib/prisma";

// Gece temizliği (cron → /api/internal/sync?adim=temizlik): süresi dolmuş
// giriş kodları, bir günden eski Etscore anahtarları ve 90 günden eski arama
// kayıtları. Tablolar sınırsız büyümesin.
export async function temizle() {
  const simdi = Date.now();
  const [kod, anahtar, arama] = await Promise.all([
    prisma.loginCode.deleteMany({ where: { expiresAt: { lt: new Date(simdi) } } }),
    prisma.royalApiToken.deleteMany({ where: { expiresAt: { lt: new Date(simdi - 864e5) } } }),
    prisma.searchHistory.deleteMany({ where: { createdAt: { lt: new Date(simdi - 90 * 864e5) } } }),
  ]);
  return { girisKodu: kod.count, etscoreAnahtari: anahtar.count, aramaKaydi: arama.count };
}
