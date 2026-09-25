// "Nereye" kutusuna yazılanı otel kodlarına çevirir.
//
// Etscore şehre göre arama sunmuyor; arama yalnızca otel kodu kabul ediyor.
// Şehir → otel eşleşmesi bizim veritabanımızda (bkz. sync.ts →
// indexHotelLocations). Bu modül yazılanı o tabloda bulur ve Etscore'a
// gönderilecek kod listesini üretir.

import { prisma } from "@/lib/prisma";

/**
 * Tek aramada gönderilecek en fazla otel.
 *
 * "Türkiye" gibi geniş bir yer binlerce otele denk gelir; hepsini aramak
 * onlarca API çağrısı ve dakikalarca bekleme demek. 600 otel = üç paket,
 * paralel ~4 sn.
 */
export const ARAMA_OTEL_SINIRI = 600;

/** Alt konumlar en fazla bu kadar derine iner (ülke → bölge → şehir → ilçe → semt). */
const EN_DERIN = 6;

export { katla } from "./katla";
import { katla } from "./katla";

/** SQL'de katla()'nın karşılığı. translate lower'dan ÖNCE: lower('İ') güvenilmez. */
export const TR_KATLA = (kolon: string) =>
  `lower(translate(${kolon}, 'İIığĞüÜşŞöÖçÇ', 'iiigguussoocc'))`;

/** LIKE joker karakterlerini (% _ \) kaçır: kullanıcı "%" yazarsa her şey eşleşmesin. */
export const likeKacir = (s: string) => s.replace(/[\\%_]/g, (m) => `\\${m}`);

export interface HedefSonucu {
  kodlar: string[];
  /** Neyle eşleşti — arayüzde "İstanbul'daki oteller" demek için. */
  eslesme: "konum" | "otel-adi" | "yok";
  /** Sınır yüzünden kaç otel dışarıda kaldı. */
  kesilen: number;
}

/**
 * Yazılanı otel kodlarına çevirir.
 *
 *  1. Konum adında ara; bulunan konumların TÜM alt konumlarını topla
 *     ("İstanbul" → Anadolu Yakası → Ümraniye). Otel en alt konuma bağlı
 *     olduğu için tek seviye yetmiyordu.
 *  2. Konum yoksa otel adında ara — kutunun yer tutucusu "Şehir, bölge
 *     veya otel" diyor.
 *  3. İkisi de yoksa BOŞ döner. Eski rota bu durumda tüm otelleri arıyordu:
 *     mock'ta zararsızdı, gerçek API'de 15.679 otel ≈ 80 çağrı demek.
 */
export async function hedefOtelKodlari(yazilan: string): Promise<HedefSonucu> {
  const q = katla(yazilan);
  if (q.length < 2) return { kodlar: [], eslesme: "yok", kesilen: 0 };
  const desen = `%${likeKacir(q)}%`;

  // 1) Konumlar
  const konumlar = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `SELECT id FROM locations WHERE ${TR_KATLA("name")} LIKE $1`,
    desen
  );

  const tumKonumlar = new Set(konumlar.map((k) => k.id));
  let sinir = [...tumKonumlar];
  for (let derinlik = 0; derinlik < EN_DERIN && sinir.length > 0; derinlik++) {
    const cocuklar = await prisma.location.findMany({
      where: { parentId: { in: sinir } },
      select: { id: true },
    });
    sinir = cocuklar.map((c) => c.id).filter((id) => !tumKonumlar.has(id));
    sinir.forEach((id) => tumKonumlar.add(id));
  }

  if (tumKonumlar.size > 0) {
    // Sınır devreye girerse (İstanbul'da binlerce otel) aramaya fiyat
    // VERENLER gitsin: en son fiyatla görülenler önce, sonra içeriği
    // olanlar. Önceki sıralama yalnızca görsele bakıyordu; konum taraması
    // her otele görsel verince fiyat verenler 600'ün dışında kaldı
    // (İstanbul 294 → 142 otel).
    const oteller = await prisma.hotel.findMany({
      where: { locationId: { in: [...tumKonumlar] }, isActive: true },
      select: { hotelCode: true },
      orderBy: [
        { lastPricedAt: { sort: "desc", nulls: "last" } },
        { thumbnailImage: { sort: "asc", nulls: "last" } },
        { hotelCode: "asc" },
      ],
    });
    if (oteller.length > 0) {
      return {
        kodlar: oteller.slice(0, ARAMA_OTEL_SINIRI).map((o) => o.hotelCode),
        eslesme: "konum",
        kesilen: Math.max(0, oteller.length - ARAMA_OTEL_SINIRI),
      };
    }
  }

  // 2) Otel adı
  const adla = await prisma.$queryRawUnsafe<{ hotel_code: string }[]>(
    // Prisma alan adını sütun adı olarak kullanıyor: "hotelCode" (tırnaklı).
    `SELECT "hotelCode" AS hotel_code FROM hotels WHERE "isActive" AND ${TR_KATLA("name")} LIKE $1
     ORDER BY "lastPricedAt" DESC NULLS LAST, "hotelCode" LIMIT ${ARAMA_OTEL_SINIRI + 1}`,
    desen
  );
  if (adla.length > 0) {
    return {
      kodlar: adla.slice(0, ARAMA_OTEL_SINIRI).map((o) => o.hotel_code),
      eslesme: "otel-adi",
      kesilen: adla.length > ARAMA_OTEL_SINIRI ? 1 : 0,
    };
  }

  return { kodlar: [], eslesme: "yok", kesilen: 0 };
}
