// Kupon değerlendirmesi (ödeme önizlemesi ve rezervasyon aynı kuralla).
//   • Kod etkin, süresi dolmamış, kullanım sınırı dolmamış olmalı.
//   • Kime: acente kuponu yalnız acenteye; müşteri kuponları acenteye değil;
//     "yeni müşteri" kuponu yalnız ilk rezervasyonda.
//   • Kişi başı bir kezse kullanıcı daha önce kullanmamış olmalı.
//   • Tutar: kampanya ve acente indiriminden sonraki fiyattan (en az sepet de
//     buna bakar). Kupon otomatik indirimle birleşmiyorsa ve rezervasyona
//     indirim uyuyorsa müşteriye hangisi avantajlıysa o uygulanır.

import { prisma } from "@/lib/prisma";
import { calculatePrice, fiyatBaglami, otelKonumAdlari, yuvarla, type FiyatGirdisi, type PriceResult } from "./engine";

type UserType = "CUSTOMER" | "AGENCY" | "ADMIN";

export type KuponSonucu =
  | { durum: "gecersiz"; mesaj: string }
  | { durum: "uygulanmadi"; mesaj: string; fiyat: PriceResult; kupon: { id: string; kod: string } }
  | { durum: "uygulandi"; mesaj: string; fiyat: PriceResult; kupon: { id: string; kod: string }; tutar: number; sonFiyat: number };

const tarihYaz = (d: Date) => d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Istanbul" });
const eur = (n: number) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

export async function kuponDegerlendir(p: {
  kod: string;
  userId: string;
  userType: UserType;
  agencyId?: string;
  girdi: FiyatGirdisi;
}): Promise<KuponSonucu> {
  const kod = p.kod.trim().toUpperCase();
  const kupon = await prisma.coupon.findUnique({ where: { code: kod } });
  if (!kupon || !kupon.isActive) return { durum: "gecersiz", mesaj: "Bu kod geçerli değil. Harfleri kontrol et." };
  if (kupon.expiresAt && kupon.expiresAt < new Date()) {
    return { durum: "gecersiz", mesaj: `Bu kuponun süresi ${tarihYaz(kupon.expiresAt)} tarihinde doldu.` };
  }
  if (kupon.usageLimit !== null && kupon.usedCount >= kupon.usageLimit) {
    return { durum: "gecersiz", mesaj: "Bu kuponun kullanım sınırı doldu." };
  }
  const acente = p.userType === "AGENCY" && !!p.agencyId;
  if (kupon.audience === "AGENCY" && !acente) return { durum: "gecersiz", mesaj: "Bu kupon yalnız acentelerde geçerli." };
  if (kupon.audience !== "AGENCY" && acente) return { durum: "gecersiz", mesaj: "Bu kupon acente rezervasyonlarında geçerli değil." };
  if (kupon.audience === "NEW_CUSTOMER") {
    const onceki = await prisma.reservation.count({ where: { userId: p.userId, status: { in: ["CONFIRMED", "PENDING"] } } });
    if (onceki > 0) return { durum: "gecersiz", mesaj: "Bu kupon yalnız ilk rezervasyonda geçerli." };
  }
  if (kupon.perUserOnce) {
    const kullandi = await prisma.couponUse.count({ where: { couponId: kupon.id, userId: p.userId } });
    if (kullandi > 0) return { durum: "gecersiz", mesaj: "Bu kuponu daha önce kullandın." };
  }

  const b = await fiyatBaglami(p.userType, p.agencyId);
  const konumAdlari = p.girdi.hotelCode ? (await otelKonumAdlari(b, [p.girdi.hotelCode])).get(p.girdi.hotelCode) : undefined;
  const girdi = { ...p.girdi, konumAdlari, userType: p.userType, agencyId: p.agencyId, baglam: b };
  const kampanyali = await calculatePrice(girdi);
  const tutarHesapla = (fiyat: number) =>
    yuvarla(Math.min(fiyat, kupon.type === "PERCENTAGE" ? (fiyat * kupon.value) / 100 : kupon.value));
  const ozet = { id: kupon.id, kod: kupon.code };

  const minTamam = (fiyat: number) => kupon.minAmount === null || fiyat >= kupon.minAmount;

  if (kupon.stacks || !kampanyali.kampanya) {
    if (!minTamam(kampanyali.finalPrice)) {
      return { durum: "gecersiz", mesaj: `Bu kupon en az ${eur(kupon.minAmount!)} tutarındaki rezervasyonlarda geçerli.` };
    }
    const tutar = tutarHesapla(kampanyali.finalPrice);
    return { durum: "uygulandi", mesaj: `${kupon.code} uygulandı`, fiyat: kampanyali, kupon: ozet, tutar, sonFiyat: yuvarla(kampanyali.finalPrice - tutar) };
  }

  // Birleşmiyor: kampanyalı fiyat mı, kampanyasız fiyat − kupon mu?
  const kampanyasiz = await calculatePrice({ ...girdi, kampanyasiz: true });
  if (!minTamam(kampanyasiz.finalPrice)) {
    return { durum: "gecersiz", mesaj: `Bu kupon en az ${eur(kupon.minAmount!)} tutarındaki rezervasyonlarda geçerli.` };
  }
  const tutar = tutarHesapla(kampanyasiz.finalPrice);
  const kuponlu = yuvarla(kampanyasiz.finalPrice - tutar);
  if (kuponlu < kampanyali.finalPrice) {
    return {
      durum: "uygulandi",
      mesaj: `${kupon.code} uygulandı; otomatik indirimle birleşmediği için ${kampanyali.kampanya.ad} yerine geçti.`,
      fiyat: kampanyasiz,
      kupon: ozet,
      tutar,
      sonFiyat: kuponlu,
    };
  }
  return {
    durum: "uygulanmadi",
    mesaj: `Bu kupon otomatik indirimle birleşmiyor. ${kampanyali.kampanya.ad} (${eur(kampanyali.kampanya.tutar)}) kupondan (${eur(tutar)}) daha avantajlı, o uygulandı.`,
    fiyat: kampanyali,
    kupon: ozet,
  };
}
