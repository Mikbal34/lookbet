// Otel sayfalarının okunur adresleri (hotels.slug): lookbeds.com/antalya/club-hotel-sera.
//
// İl + otelin adı (kullanıcı kararı 2026-10-02; Etstur, Jolly, Tatilsepeti
// yalnız ad kullanıyor, il kullanıcı isteği). İl Etscore'un konum ağacındaki
// CITY: Bodrum otelleri /mugla/, Kapadokya otelleri /nevsehir/ altında.
// Konumu olmayan otel /otel/<ad>. Aynı ilde aynı adlı ikinci otelin sonuna kodu
// eklenir. Adres bir kez verilir; otelin adı ya da konumu sonradan değişse de
// değişmez, paylaşılmış bağlantılar bozulmasın.
//
// Önce fiyat veren (satışta) oteller alır: aynı adlı oteller arasında temiz
// adres satılanınki olsun. Yeni oteller eşitlemeden sonra adres alır
// (lib/icerik-isleri: oteller, revizyon) ve "adresler" işi eksikleri tamamlar.
// İlk sürümün tek parçalı adresleri ("club-hotel-sera") da bu işte il'li
// adrese çevrilir; eski tek parçalı bağlantılar app/[bolum] ile yönlenir.

import { prisma } from "@/lib/prisma";

const HARF: Record<string, string> = {
  ç: "c", ğ: "g", ı: "i", İ: "i", ö: "o", ş: "s", ü: "u",
  Ç: "c", Ğ: "g", Ö: "o", Ş: "s", Ü: "u",
};

/** "Club Hotel Sera" → "club-hotel-sera"; Türkçe harfler sadeleşir, işaretler tireye döner. */
export function adresParcasi(metin: string): string {
  const tam = metin
    .replace(/[çğıİöşüÇĞÖŞÜ]/g, (h) => HARF[h] ?? h)
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (tam.length <= 80) return tam;
  // Uzun adlar kelime sınırından kısalır ("…kisilik-vill" değil "…kisilik").
  const kesik = tam.slice(0, 81);
  const sinir = kesik.lastIndexOf("-");
  return sinir > 40 ? kesik.slice(0, sinir) : tam.slice(0, 80).replace(/-+$/, "");
}

/** Konumu olmayan otellerin ilk parçası: /otel/<ad>. */
export const ILSIZ = "otel";

/**
 * Sitenin kök yolları: il parçası bunlardan biri olamaz (Next.js sabit yolu
 * önce eşler, otel sayfası açılmaz). Yeni kök yol eklenirse buraya da ekle.
 */
const KOK_YOLLAR = new Set([
  "admin", "agency", "api", "booking", "favoriler", "hotel", "kampanyalar", "login",
  "profile", "register", "reservations", "search", "yardim",
]);

/** Konumdan yukarı çıkıp ili (CITY) bulur. */
function ilBulucu(konumlar: { id: string; name: string; parentId: string | null; type: string }[]) {
  const harita = new Map(konumlar.map((k) => [k.id, k]));
  return (konumId: string | null): string => {
    let k = konumId ? harita.get(konumId) : undefined;
    for (let adim = 0; k && adim < 10; adim++) {
      if (k.type === "CITY") return k.name;
      k = k.parentId ? harita.get(k.parentId) : undefined;
    }
    return "";
  };
}

/** Adresi olmayan (ya da ilk sürümden tek parçalı adresi kalan) otellere adres verir. */
export async function otelAdresleriniTamamla(ilerleme?: (satir: string) => void): Promise<{ verilen: number; toplam: number }> {
  const adressiz = await prisma.hotel.findMany({
    where: { OR: [{ slug: null }, { NOT: { slug: { contains: "/" } } }] },
    select: { id: true, hotelCode: true, name: true, locationId: true },
    orderBy: [{ lastPricedAt: { sort: "desc", nulls: "last" } }, { createdAt: "asc" }],
  });
  if (!adressiz.length) return { verilen: 0, toplam: 0 };

  const alinmis = new Set(
    (await prisma.hotel.findMany({ where: { slug: { contains: "/" } }, select: { slug: true } })).map((h) => h.slug!),
  );
  const ilAdi = ilBulucu(await prisma.location.findMany({ select: { id: true, name: true, parentId: true, type: true } }));

  const yeni: { id: string; slug: string }[] = [];
  for (const h of adressiz) {
    const kod = adresParcasi(h.hotelCode) || h.id.toLowerCase();
    const ad = adresParcasi(h.name) || kod;
    const il = adresParcasi(ilAdi(h.locationId));
    const on = il && !KOK_YOLLAR.has(il) ? il : ILSIZ;
    const adres = [`${on}/${ad}`, `${on}/${ad}-${kod}`].find((a) => !alinmis.has(a)) ?? `${on}/${ad}-${kod}-${h.id.slice(-6).toLowerCase()}`;
    alinmis.add(adres);
    yeni.push({ id: h.id, slug: adres });
  }

  // Tek tek güncelleme 15 bin otelde yavaş: 500'lük paketler, tek sorgu.
  for (let i = 0; i < yeni.length; i += 500) {
    const paket = yeni.slice(i, i + 500);
    await prisma.$executeRawUnsafe(
      `UPDATE "hotels" AS h SET "slug" = v.slug FROM (SELECT unnest($1::text[]) AS id, unnest($2::text[]) AS slug) AS v WHERE h.id = v.id`,
      paket.map((p) => p.id),
      paket.map((p) => p.slug),
    );
    ilerleme?.(`${Math.min(i + 500, yeni.length)}/${yeni.length} otele adres verildi`);
  }
  return { verilen: yeni.length, toplam: adressiz.length };
}

/** Adresin son parçasıyla (otelin adı) otel bulur: eski tek parçalı ve yanlış illi bağlantılar için. */
export async function adiylaOtelBul(ad: string) {
  return prisma.hotel.findFirst({
    where: { slug: { endsWith: `/${ad}` } },
    select: { slug: true },
    orderBy: [{ lastPricedAt: { sort: "desc", nulls: "last" } }, { createdAt: "asc" }],
  });
}
