// Ana sayfa: kategoriler ve bölge bölge otel satırları.
//
// Satırlar kendi veritabanımızdan (Etscore'a istek yok). Bölge, adres metninden
// eşleşiyor: konum ağacında bazı semtler yanlış üst konuma bağlı (ör. Bodrum
// Yalıkavak'ın altında), adres daha güvenilir. Termal ve kayak satırları otelin
// Etscore olanak grubundan (Termal / Kayak) geliyor. Fiyat yok: fiyat tarihe
// bağlı ve arama gerektiriyor; kart otel sayfasına götürüyor.

import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { TR_KATLA } from "@/lib/otel-arama";
import type { KategoriKodu } from "@/lib/ana-sayfa-kategoriler";

export type { KategoriKodu };

/** Satırın kodu; başlığı metin dosyasında (anaSayfa.satirlar.<kod>). */
export type SatirKodu =
  | "bodrum" | "antalya" | "kapadokya" | "istanbul" | "fethiye" | "termal" | "kayak"
  | "marmaris" | "cesme" | "afyon" | "uludag" | "izmir" | "ankara";

interface SatirTanimi {
  kod: SatirKodu;
  /** "Tümünü gör" araması; boşsa başlık bağlantı olmaz. */
  arama: string;
  kategoriler: KategoriKodu[];
  /** Katlanmış (küçük harf, Türkçe harfsiz) adres deseni — POSIX düzenli ifade. */
  adres?: string;
  /** Etscore olanak grubu (hotel_facilities.category). */
  olanak?: "Termal" | "Kayak";
}

const SATIRLAR: SatirTanimi[] = [
  { kod: "bodrum", arama: "Bodrum", kategoriler: ["hepsi", "deniz"], adres: "bodrum|yalikavak|gumbet|turgutreis|bitez|torba|turkbuku|gundogan|ortakent" },
  { kod: "antalya", arama: "Antalya", kategoriler: ["hepsi", "deniz"], adres: "antalya|lara|belek|kemer|side|alanya|konyaalti|manavgat" },
  { kod: "kapadokya", arama: "Kapadokya", kategoriler: ["hepsi"], adres: "nevsehir|goreme|urgup|uchisar|avanos|kapadokya|cappadocia" },
  { kod: "istanbul", arama: "İstanbul", kategoriler: ["hepsi", "sehir"], adres: "istanbul" },
  { kod: "fethiye", arama: "Fethiye", kategoriler: ["hepsi", "deniz"], adres: "fethiye|oludeniz|gocek|hisaronu|kayakoy" },
  { kod: "termal", arama: "", kategoriler: ["hepsi", "termal"], olanak: "Termal" },
  { kod: "kayak", arama: "", kategoriler: ["hepsi", "kayak"], olanak: "Kayak" },
  { kod: "marmaris", arama: "Marmaris", kategoriler: ["deniz"], adres: "marmaris|icmeler|turunc" },
  { kod: "cesme", arama: "Çeşme", kategoriler: ["deniz"], adres: "cesme|alacati" },
  { kod: "afyon", arama: "Afyon", kategoriler: ["termal"], adres: "afyon" },
  { kod: "uludag", arama: "Uludağ", kategoriler: ["kayak"], adres: "uludag" },
  { kod: "izmir", arama: "İzmir", kategoriler: ["sehir"], adres: "izmir" },
  { kod: "ankara", arama: "Ankara", kategoriler: ["sehir"], adres: "ankara" },
];

export interface AnaSayfaOteli {
  kod: string;
  ad: string;
  yildiz: number;
  foto: string;
  yer: string;
}

export interface AnaSayfaSatiri {
  kod: SatirKodu;
  arama: string;
  kategoriler: KategoriKodu[];
  oteller: AnaSayfaOteli[];
}

const SATIR_BASINA = 12;
/** Bu kadar oteli olmayan satır gösterilmez; yarım satır boş görünüyor. */
const EN_AZ = 4;

// Etscore test otellerinin görselleri 404; etstur.com görselleri yalnızca
// kendi sitesinden açılıyor (bizden 403).
const GORSEL_KOSULU = `h."thumbnailImage" IS NOT NULL AND h."thumbnailImage" NOT LIKE '%/test/%' AND h."thumbnailImage" NOT LIKE '%etstur.com/%'`;
// Etscore test hesabındaki deneme otelleri ("RF Promosyon Test Otel 01", "Test Automation …");
// görsellerinde "Lütfen rezervasyon almayınız" yazıyor, vitrine çıkmasınlar.
const TEST_DEGIL = `h.name !~* '(test|automation)' AND h.name !~* '^rf '`;

async function satirOtelleri(t: SatirTanimi): Promise<AnaSayfaOteli[]> {
  const kosul = t.olanak
    ? `jsonb_typeof(h.facilities::jsonb) = 'array' AND EXISTS (
         SELECT 1 FROM jsonb_array_elements_text(h.facilities::jsonb) f
         JOIN hotel_facilities hf ON hf."externalId" = f WHERE hf.category = $1)`
    // Tam kelime (\m … \M): "kemer" Kemerburgaz'ı, "side" başka kelimeleri yakalamasın.
    : `${TR_KATLA("h.address")} ~ ('\\m(' || $1 || ')\\M')`;
  const satirlar = await prisma.$queryRawUnsafe<{ kod: string; ad: string; yildiz: number | null; foto: string; yer: string | null }[]>(
    `SELECT h."hotelCode" AS kod, h.name AS ad, h.stars AS yildiz, h."thumbnailImage" AS foto, l.name AS yer
     FROM hotels h LEFT JOIN locations l ON l.id = h."locationId"
     WHERE h."isActive" AND ${GORSEL_KOSULU} AND ${TEST_DEGIL} AND ${kosul}
     ORDER BY (h."lastPricedAt" IS NULL), h.stars DESC NULLS LAST, h."hotelCode"
     LIMIT ${SATIR_BASINA}`,
    t.olanak ?? t.adres
  );
  return satirlar.map((s) => ({ kod: s.kod, ad: s.ad.trim(), yildiz: s.yildiz ?? 0, foto: s.foto, yer: t.arama || s.yer || "" }));
}

/** Bütün satırlar; bir saat önbellekte (oteller ve görseller gece güncelleniyor). */
export const anaSayfaSatirlari = unstable_cache(
  async (): Promise<AnaSayfaSatiri[]> => {
    const sonuc = await Promise.all(
      SATIRLAR.map(async (t) => ({ kod: t.kod, arama: t.arama, kategoriler: t.kategoriler, oteller: await satirOtelleri(t) }))
    );
    return sonuc.filter((s) => s.oteller.length >= EN_AZ);
  },
  ["ana-sayfa-satirlari-v3"],
  { revalidate: 3600 }
);
