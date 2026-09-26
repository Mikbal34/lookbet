import { prisma } from "@/lib/prisma";
import { getBoardTypes } from "@/lib/royal-api/content";

// Pansiyon kodunu ("RO") görünen ada ("Sadece Oda") çevirir.
//
// Arama ucu bunu zaten yapıyordu ama rezervasyon uçları ham kodu döndürüyor,
// arayüzde kullanıcıya "RO" yazıyordu. Eşleme tek yere alındı.
//
// Türkçe adlar bizim tabloda (gece senkronu). İngilizce adlar Etscore
// listesinden (Accept-Language: en-US), günde bir alınıp bellekte tutulur;
// alınamazsa Türkçe adlara düşülür.
//
// Bilinmeyen kod olduğu gibi geçer — tedarikçi yeni bir kod gönderirse
// kullanıcı hiç değilse kodu görür, boş alan görmez.

let ingilizce: { zaman: number; adlar: Map<string, string> } | null = null;

export async function boardTypeAdlari(dil: string = "tr"): Promise<Map<string, string>> {
  const turkce = async () => new Map((await prisma.boardType.findMany()).map((b) => [b.code, b.name]));
  if (dil !== "en") return turkce();
  if (ingilizce && Date.now() - ingilizce.zaman < 24 * 3600_000) return ingilizce.adlar;
  try {
    const liste = await getBoardTypes("en-US");
    if (!liste.length) throw new Error("boş liste");
    ingilizce = { zaman: Date.now(), adlar: new Map(liste.map((b) => [b.code, b.name])) };
    return ingilizce.adlar;
  } catch (e) {
    console.warn("[pansiyon] İngilizce adlar alınamadı:", e instanceof Error ? e.message : e);
    return turkce();
  }
}

export function boardTypeAdi(
  kod: string | null | undefined,
  adlar: Map<string, string>
): string | null {
  if (!kod) return null;
  return adlar.get(kod) ?? kod;
}
