// /kampanyalar — vitrin: "vitrinde göster" işaretli, yayındaki ya da 30 gün
// içinde başlayacak otomatik indirimler (Yönetim › Kampanyalar).
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { gunYonelme } from "@/components/rezervasyonlar/ortak";
import { AYLAR } from "@/components/lb/arama/durum";
import { KampanyaVitrini, type VitrinKampanya } from "@/components/kampanya/vitrin";

export const metadata: Metadata = {
  title: "Kampanyalar — LookBeds",
  description: "Erken rezervasyon, son dakika ve uzun konaklama indirimleri. Kod gerekmez, fiyata kendiliğinden yansır.",
};
export const dynamic = "force-dynamic";

const trTarih = (d: Date) => {
  const t = new Date(d.toLocaleString("en-US", { timeZone: "Europe/Istanbul" }));
  return t;
};

function kosulMetni(d: { type: string; percent: number; minDays: number | null; maxDays: number | null; minNights: number | null; stayStart: Date | null; stayEnd: Date | null }, yer: string) {
  const y = `%${d.percent.toLocaleString("tr-TR")}`;
  if (d.type === "EARLY_BOOKING") return `Girişine ${d.minDays} gün ve fazlası olan rezervasyonlarda ${yer} ${y} indirim.`;
  if (d.type === "LAST_MINUTE") return `Girişe ${d.maxDays} gün ya da daha az kaldıysa ${yer} ${y} son dakika indirimi.`;
  if (d.type === "LONG_STAY") return `${d.minNights} gece ve fazlası konaklamalarda ${yer} ${y} indirim.`;
  const g = (x: Date | null) => (x ? `${x.getUTCDate()} ${AYLAR[x.getUTCMonth()]}` : "");
  return `${g(d.stayStart)} – ${g(d.stayEnd)} arası girişlerde ${yer} ${y} indirim.`;
}

export default async function KampanyalarSayfasi() {
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

  const kampanyalar: VitrinKampanya[] = indirimler.map((d) => {
    const yakinda = !!d.startsAt && d.startsAt > simdi;
    const yer = d.hotelCodes.length ? "seçili otellerde" : d.locationName ? `${d.locationName} otellerinde` : "tüm otellerde";
    const tarih = yakinda
      ? `Başlangıç ${trTarih(d.startsAt!).getDate()} ${AYLAR[trTarih(d.startsAt!).getMonth()]}`
      : d.endsAt
        ? `${gunYonelme(trTarih(d.endsAt))} kadar`
        : "Süresiz";
    return {
      id: d.id,
      ad: d.name,
      tur: d.type,
      yuzde: d.percent,
      aciklama: d.description || kosulMetni(d, yer),
      tarih,
      bolge: d.hotelCodes.length ? null : d.locationName,
      oteller: d.hotelCodes.map((k) => ({ kod: k, ad: oteller.get(k) ?? k })),
      yakinda,
    };
  });
  return <KampanyaVitrini kampanyalar={kampanyalar} />;
}
