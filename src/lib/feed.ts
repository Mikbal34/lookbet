import { prisma } from "@/lib/prisma";

// Etscore feed'i: müşteri B2C, onaylı acente kendi feed'i (yoksa B2B).
// Otel araması, oda araması ve rezervasyon aynı kuralı kullanır; oda
// aramasındaki feed rezervasyondakiyle aynı olmalı (fiyat kodu feed'e bağlı).
export async function feedBul(rol: string | undefined, agencyId: string | null | undefined): Promise<string> {
  const b2c = process.env.ROYAL_API_FEED_ID_B2C ?? "";
  if (rol !== "AGENCY" || !agencyId) return b2c;
  const acente = await prisma.agency.findUnique({ where: { id: agencyId }, select: { feedId: true } });
  return acente?.feedId || process.env.ROYAL_API_FEED_ID_B2B || b2c;
}
