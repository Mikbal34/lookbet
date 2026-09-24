// Ana sayfanın gerçek verisi: şehir kartlarındaki otel sayıları.
//
// Eski ana sayfa "gecelik €45'ten" gibi elle yazılmış fiyatlar gösteriyordu;
// arkasında hiçbir veri yoktu. Burada her kart, o bölgedeki fiyat veren
// (son gece taramasında ya da bir aramada fiyatla görünmüş) aktif otel
// sayısını gösteriyor. Sayı kendiliğinden güncel kalıyor.

import { prisma } from "@/lib/prisma";

export interface SehirKarti {
  /** Kartta yazan ad — insanların aradığı ad ("Kapadokya"). */
  ad: string;
  /** Bilinen yerler, kartın alt satırı. */
  yerler: string;
  /**
   * Aramaya giden terim. Konum ağacımız Etscore'dan geliyor ve bazı bilinen
   * adlar beklendiği gibi kapsamıyor: "Kapadokya" 32 fiyatlı otel bulurken
   * "Nevşehir" Göreme ve Ürgüp dahil 193 buluyor; "Bodrum" 3, "Muğla" 129.
   */
  sorgu: string;
  /**
   * O bölgede rezervasyonu yapılabilen bir otelin ana fotoğrafı. Stok
   * şehir fotoğrafları yeri tutmuyordu (Kapadokya kartında Eyfel Kulesi,
   * Trabzon'da Alpler); bu, kullanıcının gerçekten kalabileceği bir yer.
   */
  gorsel: string | null;
  /** Fotoğrafın ait olduğu otel — ekran okuyucu ve kaynak için. */
  gorselOtel: string | null;
  /** Fiyat veren aktif otel. */
  otel: number;
}

const KARTLAR: Omit<SehirKarti, "otel" | "gorsel" | "gorselOtel">[] = [
  {
    ad: "İstanbul",
    yerler: "Sultanahmet, Beyoğlu, Kadıköy",
    sorgu: "İstanbul",
  },
  {
    ad: "Kapadokya",
    yerler: "Göreme, Ürgüp, Uçhisar",
    sorgu: "Nevşehir",
  },
  {
    ad: "Antalya",
    yerler: "Lara, Belek, Kemer, Alanya",
    sorgu: "Antalya",
  },
  {
    ad: "Muğla",
    yerler: "Bodrum, Fethiye, Marmaris",
    sorgu: "Muğla",
  },
  {
    ad: "İzmir",
    yerler: "Çeşme, Alaçatı, Urla",
    sorgu: "İzmir",
  },
];

/**
 * Her kartın sorgusunu konum adında TAM eşleşmeyle bulur, alt konumlarıyla
 * birlikte içindeki fiyat veren aktif otelleri sayar. Tek sorgu.
 */
export async function sehirKartlari(): Promise<SehirKarti[]> {
  const sorgular = KARTLAR.map((k) => k.sorgu);
  const satirlar = await prisma.$queryRawUnsafe<{ sorgu: string; otel: number }[]>(
    `WITH RECURSIVE agac AS (
       SELECT name AS sorgu, id FROM locations WHERE name = ANY($1::text[])
       UNION
       SELECT a.sorgu, l.id FROM agac a JOIN locations l ON l."parentId" = a.id
     )
     SELECT a.sorgu, count(DISTINCT h.id)::int AS otel
     FROM agac a
     JOIN hotels h ON h."locationId" = a.id AND h."isActive" AND h."lastPricedAt" IS NOT NULL
     GROUP BY a.sorgu`,
    sorgular
  );

  // Kart görseli: fiyat veren, en çok yıldızlı, fotoğraflı otel. Fiyat
  // bilgisi olmayan ortamda (yerel geliştirme) fotoğraflı herhangi biri.
  const gorseller = await prisma.$queryRawUnsafe<{ sorgu: string; gorsel: string; ad: string }[]>(
    `WITH RECURSIVE agac AS (
       SELECT name AS sorgu, id FROM locations WHERE name = ANY($1::text[])
       UNION
       SELECT a.sorgu, l.id FROM agac a JOIN locations l ON l."parentId" = a.id
     )
     SELECT DISTINCT ON (a.sorgu) a.sorgu, h."thumbnailImage" AS gorsel, h.name AS ad
     FROM agac a
     JOIN hotels h ON h."locationId" = a.id AND h."isActive" AND h."thumbnailImage" IS NOT NULL
       -- Etscore'un kendi test otellerinin görselleri 404 veriyor.
       AND h."thumbnailImage" NOT LIKE '%/test/%'
       -- etstur.com görselleri yalnızca etstur.com yönlendiricisiyle açılıyor;
       -- bizden (tarayıcı ya da sunucu) 403.
       AND h."thumbnailImage" NOT LIKE '%etstur.com/%'
     ORDER BY a.sorgu, (h."lastPricedAt" IS NULL), h.stars DESC NULLS LAST, h."hotelCode"`,
    sorgular
  );

  const sayilar = new Map(satirlar.map((s) => [s.sorgu, s.otel]));
  const gorsel = new Map(gorseller.map((g) => [g.sorgu, g]));
  return KARTLAR.map((k) => ({
    ...k,
    otel: sayilar.get(k.sorgu) ?? 0,
    gorsel: gorsel.get(k.sorgu)?.gorsel ?? null,
    gorselOtel: gorsel.get(k.sorgu)?.ad ?? null,
  }));
}

/** Satıştaki (aktif) otel sayısı — üst başlıktaki "14.000+ otel". */
export async function aktifOtelSayisi(): Promise<number> {
  return prisma.hotel.count({ where: { isActive: true } });
}
