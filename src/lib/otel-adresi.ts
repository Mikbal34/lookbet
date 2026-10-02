// Otel sayfalarının okunur adresleri (hotels.slug): lookbeds.com/club-hotel-sera.
//
// Türk otel sitelerinin yaptığı gibi yalnız otelin adı (Etstur
// etstur.com/Club-Hotel-Sera, Jolly ve Tatilsepeti küçük harfle). Aynı adlı
// ikinci otelin sonuna şehri (/club-hotel-sera-antalya), o da doluysa kodu
// eklenir. Adres bir kez verilir; otelin adı sonradan değişse de değişmez,
// paylaşılmış bağlantılar bozulmasın.
//
// Önce fiyat veren (satışta) oteller alır: aynı adlı oteller arasında temiz
// adres satılanınki olsun. Yeni oteller eşitlemeden sonra adres alır
// (lib/icerik-isleri: oteller, revizyon) ve "adresler" işi eksikleri tamamlar.

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

/**
 * Sitenin kendi yolları ve public klasöründeki adlar: otel adresi bunlarla
 * çakışırsa (ör. "booking" adlı bir otel) şehir ya da kod eklenir.
 */
const AYRILMIS = new Set([
  "admin", "agency", "api", "booking", "favoriler", "fonts", "hotel", "kampanyalar", "login",
  "profile", "register", "reservations", "search", "yardim", "otel", "oteller",
  "nesne", "yukleme", "lookbeds-logo", "lookbeds-logo-512", "lookbeds-logo-1024",
]);

/** Konumdan yukarı çıkıp şehri bulur (yoksa otelin kendi konumunun adı). */
function sehirBulucu(konumlar: { id: string; name: string; parentId: string | null; type: string }[]) {
  const harita = new Map(konumlar.map((k) => [k.id, k]));
  return (konumId: string | null): string => {
    let k = konumId ? harita.get(konumId) : undefined;
    const ilk = k;
    for (let adim = 0; k && adim < 10; adim++) {
      if (k.type === "CITY") return k.name;
      k = k.parentId ? harita.get(k.parentId) : undefined;
    }
    return ilk?.name ?? "";
  };
}

/** Adresi olmayan otellere adres verir. Kaç otele verildiğini döner. */
export async function otelAdresleriniTamamla(ilerleme?: (satir: string) => void): Promise<{ verilen: number; toplam: number }> {
  const adressiz = await prisma.hotel.findMany({
    where: { slug: null },
    select: { id: true, hotelCode: true, name: true, locationId: true },
    orderBy: [{ lastPricedAt: { sort: "desc", nulls: "last" } }, { createdAt: "asc" }],
  });
  if (!adressiz.length) return { verilen: 0, toplam: 0 };

  const alinmis = new Set(
    (await prisma.hotel.findMany({ where: { slug: { not: null } }, select: { slug: true } })).map((h) => h.slug!),
  );
  const sehir = sehirBulucu(await prisma.location.findMany({ select: { id: true, name: true, parentId: true, type: true } }));
  const bos = (a: string) => a && !alinmis.has(a) && !AYRILMIS.has(a);

  const yeni: { id: string; slug: string }[] = [];
  for (const h of adressiz) {
    const kod = adresParcasi(h.hotelCode) || h.id.toLowerCase();
    const ad = adresParcasi(h.name);
    const sehirli = ad && adresParcasi(`${h.name} ${sehir(h.locationId)}`);
    const adres = [ad, sehirli, ad ? `${ad}-${kod}` : kod].find((a) => a && bos(a)) ?? `${ad || "otel"}-${kod}-${h.id.slice(-6).toLowerCase()}`;
    alinmis.add(adres);
    yeni.push({ id: h.id, slug: adres });
  }

  // Tek tek güncelleme 15 bin otelde yavaş: 500'lük paketler, tek sorgu.
  for (let i = 0; i < yeni.length; i += 500) {
    const paket = yeni.slice(i, i + 500);
    await prisma.$executeRawUnsafe(
      `UPDATE "hotels" AS h SET "slug" = v.slug FROM (SELECT unnest($1::text[]) AS id, unnest($2::text[]) AS slug) AS v WHERE h.id = v.id AND h."slug" IS NULL`,
      paket.map((p) => p.id),
      paket.map((p) => p.slug),
    );
    ilerleme?.(`${Math.min(i + 500, yeni.length)}/${yeni.length} otele adres verildi`);
  }
  return { verilen: yeni.length, toplam: adressiz.length };
}
