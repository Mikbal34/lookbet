import { prisma } from "@/lib/prisma";

// Pansiyon kodunu ("RO") görünen ada ("Sadece Oda") çevirir.
//
// Arama ucu bunu zaten yapıyordu ama rezervasyon uçları ham kodu döndürüyor,
// arayüzde kullanıcıya "RO" yazıyordu. Eşleme tek yere alındı.
//
// Bilinmeyen kod olduğu gibi geçer — tedarikçi yeni bir kod gönderirse
// kullanıcı hiç değilse kodu görür, boş alan görmez.
export async function boardTypeAdlari(): Promise<Map<string, string>> {
  const satirlar = await prisma.boardType.findMany();
  return new Map(satirlar.map((b) => [b.code, b.name]));
}

export function boardTypeAdi(
  kod: string | null | undefined,
  adlar: Map<string, string>
): string | null {
  if (!kod) return null;
  return adlar.get(kod) ?? kod;
}
