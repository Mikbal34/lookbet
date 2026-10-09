// Yönetim API'lerinin ortak girdi yardımcıları: sayfalama, tarih aralığı
// filtresi ve benzersizlik ihlali (Prisma P2002). Route dosyası değil;
// Next yalnız route.ts'i adres yapar.

import { NextResponse } from "next/server";
import { trGunBasi, trGunSonu } from "@/lib/kampanya-tarih";

/** ?page ?limit: sayı değilse varsayılan, sınır dışındaysa sınıra çekilir (limit en fazla 100). */
export function sayfalama(sp: URLSearchParams, varsayilanLimit = 20, enFazla = 100) {
  const oku = (v: string | null, varsayilan: number) => {
    const n = Number.parseInt(v ?? "", 10);
    return Number.isFinite(n) ? n : varsayilan;
  };
  const page = Math.min(100_000, Math.max(1, oku(sp.get("page"), 1)));
  const limit = Math.min(enFazla, Math.max(1, oku(sp.get("limit"), varsayilanLimit)));
  return { page, limit, skip: (page - 1) * limit };
}

const GUN = /^\d{4}-\d{2}-\d{2}$/;
/** "YYYY-AA-GG" Türkiye saatiyle günün başı (bitişte sonu); tam zaman damgası olduğu gibi. Geçersizse null. */
function tarihOku(v: string, bitis: boolean): Date | null {
  const d = GUN.test(v) ? (bitis ? trGunSonu(v) : trGunBasi(v)) : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}
/** Başlangıç tarihi (kural, komisyon, filtre): yalnız gün gelirse Türkiye'de günün başı. */
export const baslangicTarihi = (v: string) => tarihOku(v, false);
/** Bitiş tarihi: yalnız gün gelirse Türkiye'de günün sonu (23:59:59), o gün dahil. */
export const bitisTarihi = (v: string) => tarihOku(v, true);

/**
 * ?dateFrom ?dateTo → { gte, lte } filtresi. Geçersiz tarihte `hata` 400
 * yanıtıdır (Prisma'ya Invalid Date gidip 500 dönmesin).
 */
export function tarihAraligi(sp: URLSearchParams): { filtre?: { gte?: Date; lte?: Date }; hata?: NextResponse } {
  const bas = sp.get("dateFrom")?.trim();
  const son = sp.get("dateTo")?.trim();
  if (!bas && !son) return {};
  const filtre: { gte?: Date; lte?: Date } = {};
  if (bas) {
    const d = baslangicTarihi(bas);
    if (!d) return { hata: NextResponse.json({ error: "Başlangıç tarihi (dateFrom) geçersiz; YYYY-AA-GG yaz" }, { status: 400 }) };
    filtre.gte = d;
  }
  if (son) {
    const d = bitisTarihi(son);
    if (!d) return { hata: NextResponse.json({ error: "Bitiş tarihi (dateTo) geçersiz; YYYY-AA-GG yaz" }, { status: 400 }) };
    filtre.lte = d;
  }
  return { filtre };
}

/** Benzersiz alan ihlali (P2002): ön kontrolü aynı anda geçen iki istekten ikincisi buraya düşer. */
export const benzersizIhlali = (e: unknown) => typeof e === "object" && e !== null && (e as { code?: unknown }).code === "P2002";
