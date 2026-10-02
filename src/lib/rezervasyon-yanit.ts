// Rezervasyonun müşteriye / acenteye dönen hali. Tedarikçi net fiyatı
// (totalPrice), uygulanan kuralların dökümü (kâr payı adları), fiyat kodu ve
// yönetim notları yalnız yöneticiye gider. Müşteri tarafında totalPrice
// ödediği tutardır; iptal ücretleri de bu tutara oranlanır (Etscore
// politikaları net fiyat üzerinden gelir).

import type { CancellationPolicy } from "@/lib/royal-api/types";

const yuvarla = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Net fiyat üzerinden gelen iptal politikalarını satış fiyatına oranlar. */
export function politikalariOranla(politikalar: CancellationPolicy[], net: number, satis: number): CancellationPolicy[] {
  if (!(net > 0) || !(satis > 0) || Math.abs(net - satis) < 0.005) return politikalar;
  const oran = satis / net;
  return politikalar.map((p) => ({ ...p, penalty: Math.min(satis, yuvarla(p.penalty * oran)) }));
}

type Satir = {
  totalPrice: number;
  discountedPrice?: number | null;
  cancellationFee?: number | null;
  cancellationPolicy?: unknown;
  appliedPriceRules?: unknown;
  priceCode?: string | null;
  needsReview?: boolean;
  statusNote?: string | null;
  commissionAmount?: number | null;
};

export function rezervasyonYaniti<T extends Satir>(r: T, rol: string | undefined) {
  if (rol === "ADMIN") return r;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- ayıklanan alanlar
  const { appliedPriceRules, priceCode, needsReview, statusNote, commissionAmount, ...kalan } = r;
  const net = r.totalPrice;
  const satis = r.discountedPrice ?? r.totalPrice;
  const oran = net > 0 ? satis / net : 1;
  return {
    ...kalan,
    totalPrice: satis,
    discountedPrice: satis,
    cancellationFee: r.cancellationFee == null ? r.cancellationFee : Math.min(satis, yuvarla(r.cancellationFee * oran)),
    // Komisyon acentenin kendi kazancı: yalnız acenteye.
    ...(rol === "AGENCY" ? { commissionAmount } : {}),
  };
}
