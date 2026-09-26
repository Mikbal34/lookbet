// Rezervasyon listelerine otelin yerel kaydından fotoğraf, yıldız ve konum,
// pansiyon koduna da görünen ad ekler. Müşteri, acente ve yönetim listeleri
// aynı biçimi kullanır (bkz. components/rezervasyonlar/ortak Rezervasyon).

import { prisma } from "@/lib/prisma";
import { boardTypeAdi, boardTypeAdlari } from "@/lib/board-types";

/** `dil`: pansiyon adlarının dili (müşteri listesi sitenin dilinde; paneller Türkçe). */
export async function otelBilgisiEkle<T extends { hotelCode: string; boardType: string | null }>(rezervasyonlar: T[], dil = "tr") {
  const oteller = await prisma.hotel.findMany({
    where: { hotelCode: { in: [...new Set(rezervasyonlar.map((r) => r.hotelCode))] } },
    select: {
      hotelCode: true,
      thumbnailImage: true,
      images: true,
      stars: true,
      location: { select: { name: true, parent: { select: { name: true } } } },
    },
  });
  const otelBul = new Map(oteller.map((o) => [o.hotelCode, o]));
  const pansiyonAdlari = await boardTypeAdlari(dil);
  return rezervasyonlar.map((r) => {
    const o = otelBul.get(r.hotelCode);
    const ilkGorsel = Array.isArray(o?.images) ? (o.images as unknown[]).find((u): u is string => typeof u === "string") : undefined;
    return {
      ...r,
      boardTypeName: boardTypeAdi(r.boardType, pansiyonAdlari),
      hotel: o
        ? {
            image: o.thumbnailImage ?? ilkGorsel ?? null,
            stars: o.stars,
            place: [o.location?.name, o.location?.parent?.name].filter(Boolean).join(", ") || null,
          }
        : null,
    };
  });
}

/** Otel kodu → ad (fiyat kuralı ve komisyon listelerinde kod yerine ad). */
export async function otelAdlari(kodlar: (string | null)[]) {
  const temiz = [...new Set(kodlar.filter((k): k is string => !!k))];
  if (!temiz.length) return new Map<string, string>();
  const oteller = await prisma.hotel.findMany({ where: { hotelCode: { in: temiz } }, select: { hotelCode: true, name: true } });
  return new Map(oteller.map((o) => [o.hotelCode, o.name]));
}
