// Arama demosu için konum verisi: yazarken öneriler ve seçilen konumun özeti.
// Hepsi kendi veritabanımızdan (Etscore'dan kurulan konum ağacı + oteller);
// Etscore'a istek atılmıyor, yanıtlar milisaniyeler.

import { prisma } from "@/lib/prisma";
import { katla, likeKacir, TR_KATLA } from "@/lib/otel-arama";

export interface KonumOnerisi {
  id: string;
  ad: string;
  /** Bir üst konum — "Beyoğlu" için "İstanbul Avrupa Yakası". */
  ust: string | null;
  tur: string;
  /** Alt konumlarıyla birlikte aktif otel sayısı. */
  otel: number;
}

/**
 * Yazılanla eşleşen konumlar. Adı yazılanla BAŞLAYANLAR önce, sonra otel
 * sayısına göre. Hiç oteli olmayan konum önerilmiyor.
 */
export async function konumOnerileri(yazilan: string): Promise<KonumOnerisi[]> {
  const q = katla(yazilan);
  if (q.length < 2) return [];
  const kacik = likeKacir(q);

  return prisma.$queryRawUnsafe<KonumOnerisi[]>(
    `WITH RECURSIVE aday AS (
       SELECT id, name, type::text AS tur, "parentId",
              CASE WHEN ${TR_KATLA("name")} LIKE $1 THEN 0 ELSE 1 END AS onek
       FROM locations
       WHERE ${TR_KATLA("name")} LIKE $2
       LIMIT 60
     ),
     agac AS (
       SELECT id AS kok, id FROM aday
       UNION
       SELECT a.kok, l.id FROM agac a JOIN locations l ON l."parentId" = a.id
     ),
     sayim AS (
       SELECT a.kok, count(h.id)::int AS otel
       FROM agac a JOIN hotels h ON h."locationId" = a.id AND h."isActive"
       GROUP BY a.kok
     )
     SELECT d.id, d.name AS ad, p.name AS ust, d.tur, s.otel
     FROM aday d
     JOIN sayim s ON s.kok = d.id
     LEFT JOIN locations p ON p.id = d."parentId"
     ORDER BY d.onek, s.otel DESC
     LIMIT 6`,
    `${kacik}%`,
    `%${kacik}%`
  );
}

export interface KonumOzeti {
  id: string;
  ad: string;
  /** Üst konumlar, yakından uzağa: ["Marmara Bölgesi", "Türkiye"]. */
  zincir: string[];
  /** Aktif otel. */
  toplam: number;
  /** Son gece taramasında ya da bir aramada fiyat vermiş aktif otel. */
  fiyatli: number;
  besYildiz: number;
  /** En çok otelin olduğu alt bölgeler. */
  bolgeler: { ad: string; otel: number }[];
  /** Bu konumdaki otellerden fotoğraflar; fiyat verenler ve yıldızlılar önce. */
  gorseller: { url: string; otel: string }[];
}

export async function konumOzeti(id: string): Promise<KonumOzeti | null> {
  const konum = await prisma.location.findUnique({ where: { id }, select: { id: true, name: true } });
  if (!konum) return null;

  const agac = `WITH RECURSIVE agac AS (
      SELECT id FROM locations WHERE id = $1
      UNION
      SELECT l.id FROM agac a JOIN locations l ON l."parentId" = a.id
    )`;

  const [sayim, bolgeler, gorseller, zincir] = await Promise.all([
    prisma.$queryRawUnsafe<{ toplam: number; fiyatli: number; bes: number }[]>(
      `${agac}
       SELECT count(*)::int AS toplam,
              count(*) FILTER (WHERE "lastPricedAt" IS NOT NULL)::int AS fiyatli,
              count(*) FILTER (WHERE stars = 5)::int AS bes
       FROM hotels WHERE "isActive" AND "locationId" IN (SELECT id FROM agac)`,
      id
    ),
    prisma.$queryRawUnsafe<{ ad: string; otel: number }[]>(
      `${agac}
       SELECT l.name AS ad, count(*)::int AS otel
       FROM hotels h JOIN locations l ON l.id = h."locationId"
       WHERE h."isActive" AND h."locationId" IN (SELECT id FROM agac) AND l.id <> $1
       GROUP BY l.name ORDER BY otel DESC LIMIT 3`,
      id
    ),
    prisma.$queryRawUnsafe<{ url: string; otel: string }[]>(
      `${agac}
       SELECT "thumbnailImage" AS url, name AS otel
       FROM hotels
       WHERE "isActive" AND "locationId" IN (SELECT id FROM agac)
         AND "thumbnailImage" IS NOT NULL
         -- Etscore test otellerinin görselleri 404; etstur.com yalnızca
         -- kendi sitesinden açılıyor (bizden 403).
         AND "thumbnailImage" NOT LIKE '%/test/%'
         AND "thumbnailImage" NOT LIKE '%etstur.com/%'
       ORDER BY ("lastPricedAt" IS NULL), stars DESC NULLS LAST, "hotelCode"
       LIMIT 3`,
      id
    ),
    prisma.$queryRawUnsafe<{ ad: string }[]>(
      `WITH RECURSIVE yukari AS (
         SELECT "parentId", 0 AS d FROM locations WHERE id = $1
         UNION ALL
         SELECT l."parentId", y.d + 1 FROM yukari y JOIN locations l ON l.id = y."parentId"
         WHERE y.d < 8
       )
       SELECT l.name AS ad FROM yukari y JOIN locations l ON l.id = y."parentId" ORDER BY y.d`,
      id
    ),
  ]);

  return {
    id: konum.id,
    ad: konum.name,
    zincir: zincir.map((z) => z.ad),
    toplam: sayim[0]?.toplam ?? 0,
    fiyatli: sayim[0]?.fiyatli ?? 0,
    besYildiz: sayim[0]?.bes ?? 0,
    bolgeler,
    gorseller,
  };
}
