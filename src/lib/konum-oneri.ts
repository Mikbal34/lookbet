// "Nereye" kutusu için konum önerileri — kendi veritabanımızdan (Etscore'dan
// kurulan konum ağacı + oteller); Etscore'a istek atılmıyor, yanıt milisaniyeler.

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
 * Yazılanla eşleşen konumlar: adın başı ya da içindeki bir kelimenin başı
 * ("anadolu" → "İstanbul Anadolu Yakası"). Kelime ortası eşleşmiyor; yoksa
 * "istan" yazınca Hindistan ve Pakistan da geliyordu. Adı yazılanla
 * BAŞLAYANLAR önce, sonra otel sayısına göre. Oteli olmayan konum önerilmez.
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
       WHERE ${TR_KATLA("name")} LIKE $1 OR ${TR_KATLA("name")} LIKE $2
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
    `% ${kacik}%`
  );
}
