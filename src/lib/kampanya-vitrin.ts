// Vitrin kampanyaları: "vitrinde göster" işaretli, müşterilere açık, yayında
// ya da 30 gün içinde başlayacak otomatik indirimler. /kampanyalar ve ana
// sayfa kullanır. Yalnız veri: tarih ve koşul metinleri dile göre bileşende
// kurulur (components/kampanya/metin).
import { prisma } from "@/lib/prisma";
import type { VitrinKampanya } from "@/components/kampanya/ortak";

const trTarih = (d: Date) => new Date(d.toLocaleString("en-US", { timeZone: "Europe/Istanbul" }));
const ikiHane = (n: number) => String(n).padStart(2, "0");
/** Anın İstanbul'daki günü (YYYY-MM-DD). */
const istanbulGunu = (d: Date) => {
  const t = trTarih(d);
  return `${t.getFullYear()}-${ikiHane(t.getMonth() + 1)}-${ikiHane(t.getDate())}`;
};
/** Yalnız tarih alanı (@db.Date, UTC gece yarısı) → YYYY-MM-DD. */
const gunAlani = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

export async function vitrinKampanyalari(): Promise<VitrinKampanya[]> {
  const simdi = new Date();
  const otuzGun = new Date(simdi.getTime() + 30 * 864e5);
  const indirimler = await prisma.discount.findMany({
    where: {
      isActive: true,
      showcase: true,
      audience: { in: ["CUSTOMER", "ALL"] },
      AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: simdi } }] }, { OR: [{ startsAt: null }, { startsAt: { lte: otuzGun } }] }],
    },
    orderBy: [{ percent: "desc" }],
  });
  const kodlar = [...new Set(indirimler.flatMap((d) => d.hotelCodes))];
  const oteller = new Map(
    (kodlar.length ? await prisma.hotel.findMany({ where: { hotelCode: { in: kodlar } }, select: { hotelCode: true, name: true } }) : []).map((o) => [o.hotelCode, o.name])
  );
  return indirimler.map((d) => ({
    id: d.id,
    ad: d.name,
    tur: d.type,
    yuzde: d.percent,
    aciklama: d.description || null,
    minGun: d.minDays,
    maxGun: d.maxDays,
    minGece: d.minNights,
    girisBas: gunAlani(d.stayStart),
    girisSon: gunAlani(d.stayEnd),
    baslangic: d.startsAt ? istanbulGunu(d.startsAt) : null,
    bitis: d.endsAt ? istanbulGunu(d.endsAt) : null,
    bolge: d.hotelCodes.length ? null : d.locationName,
    oteller: d.hotelCodes.map((k) => ({ kod: k, ad: oteller.get(k) ?? k })),
    yakinda: !!d.startsAt && d.startsAt > simdi,
  }));
}
