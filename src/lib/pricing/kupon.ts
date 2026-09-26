// Kupon değerlendirmesi (ödeme önizlemesi ve rezervasyon aynı kuralla).
//   • Kod etkin, süresi dolmamış, kullanım sınırı dolmamış olmalı.
//   • Kime: acente kuponu yalnız acenteye; müşteri kuponları acenteye değil;
//     "yeni müşteri" kuponu yalnız ilk rezervasyonda.
//   • Kişi başı bir kezse kullanıcı daha önce kullanmamış olmalı.
//   • Tutar: kampanya ve acente indiriminden sonraki fiyattan (en az sepet de
//     buna bakar). Kupon otomatik indirimle birleşmiyorsa ve rezervasyona
//     indirim uyuyorsa müşteriye hangisi avantajlıysa o uygulanır.
//   • Kupon da maliyet tabanını delmez (engine.tabanFiyat).
//
// Değerlendirme DB'ye yazmaz. Rezervasyonda kullanım kuponAyir ile aynı
// transaction içinde ayrılır: sınır ve kişi başı kural DB'de koşullu
// güncelleme ve tekil anahtarla korunur (aynı anda iki rezervasyon aşamaz).

import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { bicimleyici } from "@/i18n/bicim";
import { calculatePrice, fiyatBaglami, komisyonHesapla, otelKonumAdlari, tabanFiyat, yuvarla, type FiyatGirdisi, type PriceResult } from "./engine";

type UserType = "CUSTOMER" | "AGENCY" | "ADMIN";
type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

export type KuponSonucu =
  | { durum: "gecersiz"; mesaj: string }
  | { durum: "uygulanmadi"; mesaj: string; fiyat: PriceResult; kupon: KuponOzeti }
  | { durum: "uygulandi"; mesaj: string; fiyat: PriceResult; kupon: KuponOzeti; tutar: number; sonFiyat: number; komisyon: number };

export type KuponOzeti = { id: string; kod: string; perUserOnce: boolean };

export async function kuponDegerlendir(p: {
  kod: string;
  userId: string;
  userType: UserType;
  agencyId?: string;
  girdi: FiyatGirdisi;
}): Promise<KuponSonucu> {
  // Mesajlar isteğin dilinde (messages/*/api.json › kupon).
  const t = await getTranslations("api.kupon");
  const bi = bicimleyici(await getLocale());
  const eur = (n: number) => bi.para(n, "EUR");
  const kod = p.kod.trim().toUpperCase();
  const kupon = await prisma.coupon.findUnique({ where: { code: kod } });
  if (!kupon || !kupon.isActive) return { durum: "gecersiz", mesaj: t("gecersiz") };
  if (kupon.expiresAt && kupon.expiresAt < new Date()) {
    return { durum: "gecersiz", mesaj: t("suresiDoldu", { tarih: bi.gunAyYil(kupon.expiresAt) }) };
  }
  if (kupon.usageLimit !== null && kupon.usedCount >= kupon.usageLimit) {
    return { durum: "gecersiz", mesaj: t("sinirDoldu") };
  }
  const acente = p.userType === "AGENCY" && !!p.agencyId;
  if (kupon.audience === "AGENCY" && !acente) return { durum: "gecersiz", mesaj: t("yalnizAcente") };
  if (kupon.audience !== "AGENCY" && acente) return { durum: "gecersiz", mesaj: t("acenteGecersiz") };
  if (kupon.audience === "NEW_CUSTOMER") {
    const onceki = await prisma.reservation.count({ where: { userId: p.userId, status: { in: ["CONFIRMED", "PENDING"] } } });
    if (onceki > 0) return { durum: "gecersiz", mesaj: t("ilkRezervasyon") };
  }
  if (kupon.perUserOnce) {
    const kullandi = await prisma.couponUse.count({ where: { couponId: kupon.id, userId: p.userId } });
    if (kullandi > 0) return { durum: "gecersiz", mesaj: t("dahaOnce") };
  }

  const b = await fiyatBaglami(p.userType, p.agencyId);
  const konumAdlari = p.girdi.hotelCode ? (await otelKonumAdlari(b, [p.girdi.hotelCode])).get(p.girdi.hotelCode) : undefined;
  const girdi = { ...p.girdi, konumAdlari, userType: p.userType, agencyId: p.agencyId, baglam: b };
  const kampanyali = await calculatePrice(girdi);
  const taban = tabanFiyat(b, p.girdi);
  const tutarHesapla = (fiyat: number) =>
    yuvarla(Math.max(0, Math.min(fiyat - taban, kupon.type === "PERCENTAGE" ? (fiyat * kupon.value) / 100 : kupon.value)));
  const ozet: KuponOzeti = { id: kupon.id, kod: kupon.code, perUserOnce: kupon.perUserOnce };
  const komisyon = (sonFiyat: number) => komisyonHesapla(b, sonFiyat, p.girdi.hotelCode, p.girdi.boardType);
  const enDusukte = (fiyat: PriceResult): KuponSonucu => ({
    durum: "uygulanmadi",
    mesaj: t("enDusukte"),
    fiyat,
    kupon: ozet,
  });

  const minTamam = (fiyat: number) => kupon.minAmount === null || fiyat >= kupon.minAmount;

  if (kupon.stacks || !kampanyali.kampanya) {
    if (!minTamam(kampanyali.finalPrice)) {
      return { durum: "gecersiz", mesaj: t("enAz", { tutar: eur(kupon.minAmount!) }) };
    }
    const tutar = tutarHesapla(kampanyali.finalPrice);
    if (tutar <= 0) return enDusukte(kampanyali);
    const sonFiyat = yuvarla(kampanyali.finalPrice - tutar);
    return { durum: "uygulandi", mesaj: t("uygulandi", { kod: kupon.code }), fiyat: kampanyali, kupon: ozet, tutar, sonFiyat, komisyon: komisyon(sonFiyat) };
  }

  // Birleşmiyor: kampanyalı fiyat mı, kampanyasız fiyat − kupon mu?
  const kampanyasiz = await calculatePrice({ ...girdi, kampanyasiz: true });
  if (!minTamam(kampanyasiz.finalPrice)) {
    return { durum: "gecersiz", mesaj: t("enAz", { tutar: eur(kupon.minAmount!) }) };
  }
  const tutar = tutarHesapla(kampanyasiz.finalPrice);
  const kuponlu = yuvarla(kampanyasiz.finalPrice - tutar);
  if (tutar > 0 && kuponlu < kampanyali.finalPrice) {
    return {
      durum: "uygulandi",
      mesaj: t("yerineGecti", { kod: kupon.code, kampanya: kampanyali.kampanya.ad }),
      fiyat: kampanyasiz,
      kupon: ozet,
      tutar,
      sonFiyat: kuponlu,
      komisyon: komisyon(kuponlu),
    };
  }
  return {
    durum: "uygulanmadi",
    mesaj: t("birlesmiyor", { kampanya: kampanyali.kampanya.ad, kampanyaTutari: eur(kampanyali.kampanya.tutar), kuponTutari: eur(tutar) }),
    fiyat: kampanyali,
    kupon: ozet,
  };
}

/** Kupon kullanımı ayrılamadı: sınır doldu ya da kişi başı hakkı kullanıldı.
 *  message = api.kupon metin anahtarı ("sinirDoldu" | "dahaOnce"). */
export class KuponAlinamadi extends Error {
  constructor(public readonly anahtar: "sinirDoldu" | "dahaOnce") {
    super(anahtar);
  }
}

/**
 * Rezervasyon transaction'ı içinde kupon kullanımını ayırır. Sayaç yalnız
 * sınırın altındaysa artar (koşullu güncelleme); kişi başı kuponda tekil
 * anahtar ikinci kullanımı reddeder.
 */
export async function kuponAyir(
  tx: Tx,
  p: { kupon: KuponOzeti; userId: string; reservationId: string; tutar: number }
): Promise<void> {
  const artti = await tx.coupon.updateMany({
    where: {
      id: p.kupon.id,
      isActive: true,
      OR: [{ usageLimit: null }, { usedCount: { lt: tx.coupon.fields.usageLimit } }],
    },
    data: { usedCount: { increment: 1 } },
  });
  if (artti.count === 0) throw new KuponAlinamadi("sinirDoldu");
  try {
    await tx.couponUse.create({
      data: {
        couponId: p.kupon.id,
        userId: p.userId,
        reservationId: p.reservationId,
        amount: p.tutar,
        perUserKey: p.kupon.perUserOnce ? `${p.kupon.id}:${p.userId}` : null,
      },
    });
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") throw new KuponAlinamadi("dahaOnce");
    throw e;
  }
}

/** Rezervasyon başarısız ya da iptal: kupon kullanımını geri verir. */
export async function kuponBirak(tx: Tx, reservationId: string): Promise<void> {
  const kullanim = await tx.couponUse.findUnique({ where: { reservationId }, select: { id: true, couponId: true } });
  if (!kullanim) return;
  await tx.couponUse.delete({ where: { id: kullanim.id } });
  await tx.coupon.updateMany({ where: { id: kullanim.couponId, usedCount: { gt: 0 } }, data: { usedCount: { decrement: 1 } } });
}
