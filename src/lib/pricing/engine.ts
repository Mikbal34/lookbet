import { prisma } from "@/lib/prisma";
import { katla } from "@/lib/katla";

// Fiyat motoru. Sıra:
//   1. Etscore net fiyatı (tedarikçinin maliyeti)
//   2. Fiyat kuralı: kişiye/otele/pansiyona uyan önceliği en yüksek TEK kural
//      (kâr payı ya da indirim) — Yönetim › Fiyatlar
//   3. Otomatik indirim (kampanya): koşulu tutanlardan yüzdesi en yüksek TEK
//      indirim, kuraldan sonraki satış fiyatından — Yönetim › Kampanyalar
//   4. Acentenin anlaşmadaki indirim oranı
//   5. Kupon (yalnız rezervasyonda, lib/pricing/kupon)
//   Komisyon son fiyattan: uyan özel komisyon, yoksa anlaşma oranı.
//
// Arama listesi yüzlerce oteli fiyatlar; kurallar, indirimler ve acente bir
// kez yüklenir (fiyatBaglami), otel başına hesap veritabanına gitmez (fiyatla).

type PriceRuleType = "PERCENTAGE_DISCOUNT" | "FIXED_DISCOUNT" | "MARKUP";
type UserType = "CUSTOMER" | "AGENCY" | "ADMIN";

export interface AppliedRule {
  ruleId: string;
  name: string;
  type: PriceRuleType;
  value: number;
  /** Fiyattan düşen (+) ya da eklenen (−) tutar. */
  discountAmount: number;
}

export interface Kampanya {
  id: string;
  ad: string;
  tur: "EARLY_BOOKING" | "LAST_MINUTE" | "LONG_STAY" | "DATE_RANGE";
  yuzde: number;
  tutar: number;
}

type Kural = Awaited<ReturnType<typeof kurallariGetir>>[number];
type Indirim = Awaited<ReturnType<typeof indirimleriGetir>>[number];

export interface FiyatBaglami {
  userType: UserType;
  agencyId?: string;
  acente: { companyName: string; discountRate: number; commission: number } | null;
  kurallar: Kural[];
  indirimler: Indirim[];
  bugun: string;
}

const kurallariGetir = (simdi: Date) =>
  prisma.priceRule.findMany({
    where: {
      isActive: true,
      AND: [
        { OR: [{ startDate: null }, { startDate: { lte: simdi } }] },
        { OR: [{ endDate: null }, { endDate: { gte: simdi } }] },
      ],
    },
    orderBy: { priority: "desc" },
  });
const indirimleriGetir = (simdi: Date) =>
  prisma.discount.findMany({
    where: {
      isActive: true,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: simdi } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: simdi } }] },
      ],
    },
  });

/** Türkiye'de bugünün tarihi (YYYY-AA-GG); "girişe kaç gün" bununla. */
export const bugunTR = (d = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(d);
const gunFarki = (a: string, b: string) => Math.round((Date.parse(a.slice(0, 10)) - Date.parse(b.slice(0, 10))) / 864e5);

export async function fiyatBaglami(userType: UserType, agencyId?: string): Promise<FiyatBaglami> {
  const simdi = new Date();
  const [kurallar, indirimler, acente] = await Promise.all([
    kurallariGetir(simdi),
    indirimleriGetir(simdi),
    userType === "AGENCY" && agencyId
      ? prisma.agency.findUnique({ where: { id: agencyId }, select: { companyName: true, discountRate: true, commission: true } })
      : null,
  ]);
  return { userType, agencyId, acente, kurallar, indirimler, bugun: bugunTR(simdi) };
}

/* ── Konum kapsamı: otelin konumu ve üstleri (adlarıyla) ── */
let konumOnbellek: { zaman: number; harita: Map<string, { ad: string; ust: string | null }> } | null = null;
async function konumHaritasi() {
  if (konumOnbellek && Date.now() - konumOnbellek.zaman < 10 * 60_000) return konumOnbellek.harita;
  const satirlar = await prisma.location.findMany({ select: { id: true, name: true, parentId: true } });
  const harita = new Map(satirlar.map((l) => [l.id, { ad: katla(l.name), ust: l.parentId }]));
  konumOnbellek = { zaman: Date.now(), harita };
  return harita;
}
/**
 * Otel kodu → konumunun ve üstlerinin (katlanmış) adları. Yalnız konumlu
 * indirim varsa gerekir. Ad üstünden eşleşir: aramadaki gibi aynı adlı
 * birden çok konum (üç ayrı "Bodrum") hepsi kapsanır.
 */
export async function otelKonumAdlari(b: FiyatBaglami, kodlar: string[]): Promise<Map<string, Set<string>>> {
  const cikti = new Map<string, Set<string>>();
  if (!b.indirimler.some((i) => i.locationName) || !kodlar.length) return cikti;
  const [harita, oteller] = await Promise.all([
    konumHaritasi(),
    prisma.hotel.findMany({ where: { hotelCode: { in: kodlar } }, select: { hotelCode: true, locationId: true } }),
  ]);
  for (const o of oteller) {
    const adlar = new Set<string>();
    let id = o.locationId;
    for (let i = 0; id && i < 8; i++) {
      const k = harita.get(id);
      if (!k) break;
      adlar.add(k.ad);
      id = k.ust;
    }
    cikti.set(o.hotelCode, adlar);
  }
  return cikti;
}

export interface FiyatGirdisi {
  /** Konaklamanın net toplamı (tüm geceler). */
  basePrice: number;
  hotelCode?: string;
  boardType?: string;
  checkIn?: string;
  checkOut?: string;
  /** otelKonumAdlari'ndan; konumlu indirim eşleşmesi için. */
  konumAdlari?: Set<string>;
}
export interface FiyatSonucu {
  originalPrice: number;
  /** Kural sonrası, kampanya indiriminden önceki fiyat (üstü çizili fiyat). */
  oncekiFiyat: number;
  finalPrice: number;
  totalDiscount: number;
  appliedRules: AppliedRule[];
  kampanya: Kampanya | null;
}

export const yuvarla = (n: number) => Math.round(n * 100) / 100;

function kuralUyarMi(k: Kural, b: FiyatBaglami, g: FiyatGirdisi) {
  const kisi =
    b.userType === "AGENCY" && b.agencyId
      ? k.appliesTo === "ALL_AGENCIES" || (k.appliesTo === "SPECIFIC_AGENCY" && k.agencyId === b.agencyId)
      : k.appliesTo === "ALL_CUSTOMERS";
  return kisi && (!k.hotelCode || k.hotelCode === g.hotelCode) && (!k.boardType || k.boardType === g.boardType);
}

/** Girdiye uyan otomatik indirimlerden yüzdesi en yüksek olanı. */
export function uyanIndirim(b: FiyatBaglami, g: FiyatGirdisi): Indirim | null {
  const acente = b.userType === "AGENCY" && !!b.agencyId;
  const gunKala = g.checkIn ? gunFarki(g.checkIn, b.bugun) : null;
  const gece = g.checkIn && g.checkOut ? gunFarki(g.checkOut, g.checkIn) : null;
  let en: Indirim | null = null;
  for (const d of b.indirimler) {
    if (d.audience === "CUSTOMER" && acente) continue;
    if (d.audience === "AGENCY" && !acente) continue;
    if (d.hotelCodes.length) {
      if (!g.hotelCode || !d.hotelCodes.includes(g.hotelCode)) continue;
    } else if (d.locationName) {
      if (!g.konumAdlari?.has(katla(d.locationName))) continue;
    }
    if (d.type === "EARLY_BOOKING" && !(gunKala !== null && gunKala >= (d.minDays ?? 0))) continue;
    if (d.type === "LAST_MINUTE" && !(gunKala !== null && gunKala >= 0 && gunKala <= (d.maxDays ?? 0))) continue;
    if (d.type === "LONG_STAY" && !(gece !== null && gece >= (d.minNights ?? 1))) continue;
    if (d.type === "DATE_RANGE") {
      const giris = g.checkIn?.slice(0, 10);
      const bas = d.stayStart?.toISOString().slice(0, 10);
      const son = d.stayEnd?.toISOString().slice(0, 10);
      if (!giris || (bas && giris < bas) || (son && giris > son)) continue;
    }
    if (!en || d.percent > en.percent) en = d;
  }
  return en;
}

/** Saf hesap: kural → kampanya → acente indirimi (veritabanına gitmez). */
export function fiyatla(b: FiyatBaglami, g: FiyatGirdisi, kampanyasiz = false): FiyatSonucu {
  const base = g.basePrice;
  let fiyat = base;
  let toplamIndirim = 0;
  const appliedRules: AppliedRule[] = [];

  const kural = b.kurallar.find((k) => kuralUyarMi(k, b, g));
  if (kural) {
    const fark =
      kural.type === "PERCENTAGE_DISCOUNT" ? base * (kural.value / 100) : kural.type === "FIXED_DISCOUNT" ? kural.value : -(base * (kural.value / 100));
    fiyat = base - fark;
    toplamIndirim += fark;
    appliedRules.push({ ruleId: kural.id, name: kural.name, type: kural.type, value: kural.value, discountAmount: fark });
  }
  fiyat = Math.max(0, fiyat);
  const oncekiFiyat = fiyat;

  let kampanya: Kampanya | null = null;
  const ind = kampanyasiz ? null : uyanIndirim(b, g);
  if (ind && fiyat > 0) {
    const tutar = fiyat * (ind.percent / 100);
    fiyat -= tutar;
    toplamIndirim += tutar;
    kampanya = { id: ind.id, ad: ind.name, tur: ind.type, yuzde: ind.percent, tutar: yuvarla(tutar) };
    appliedRules.push({ ruleId: `kampanya-${ind.id}`, name: ind.name, type: "PERCENTAGE_DISCOUNT", value: ind.percent, discountAmount: tutar });
  }

  if (b.acente && b.acente.discountRate > 0) {
    const tutar = fiyat * (b.acente.discountRate / 100);
    fiyat -= tutar;
    toplamIndirim += tutar;
    appliedRules.push({
      ruleId: `agency-${b.agencyId}`,
      name: `Acente İndirimi (${b.acente.companyName})`,
      type: "PERCENTAGE_DISCOUNT",
      value: b.acente.discountRate,
      discountAmount: tutar,
    });
  }

  return {
    originalPrice: base,
    oncekiFiyat: yuvarla(oncekiFiyat),
    finalPrice: yuvarla(Math.max(0, fiyat)),
    totalDiscount: yuvarla(toplamIndirim),
    appliedRules,
    kampanya,
  };
}

interface PriceInput extends FiyatGirdisi {
  userType: UserType;
  agencyId?: string;
  currency?: string;
  /** Aynı istekte birden çok oda fiyatlanırken bağlamı paylaş. */
  baglam?: FiyatBaglami;
  /** Kupon birleşmiyor ve daha avantajlıysa kampanyasız fiyat istenir. */
  kampanyasiz?: boolean;
}
export interface PriceResult extends FiyatSonucu {
  commissionAmount: number;
}

/** Tek konaklamanın fiyatı + komisyon (oda araması ve rezervasyon). */
export async function calculatePrice(input: PriceInput): Promise<PriceResult> {
  const b = input.baglam ?? (await fiyatBaglami(input.userType, input.agencyId));
  const konumAdlari =
    input.konumAdlari ?? (input.hotelCode ? (await otelKonumAdlari(b, [input.hotelCode])).get(input.hotelCode) : undefined);
  const sonuc = fiyatla(b, { ...input, konumAdlari }, input.kampanyasiz);
  const commissionAmount = await komisyonHesapla(b, sonuc.finalPrice, input.hotelCode, input.boardType);
  return { ...sonuc, commissionAmount };
}

export async function komisyonHesapla(b: FiyatBaglami, fiyat: number, hotelCode?: string, boardType?: string) {
  if (b.userType !== "AGENCY" || !b.agencyId) return 0;
  return yuvarla(await calculateCommission(b.agencyId, fiyat, b.acente?.commission ?? 0, hotelCode, boardType));
}

/**
 * Acentenin komisyonu — oranları yönetim belirler (Yönetim › Acenteler ve
 * Fiyatlar). Otel/pansiyon/tarihi uyan etkin özel komisyon varsa o (en
 * özgülü: otel+pansiyon, otel, pansiyon, genel), yoksa acentenin anlaşmadaki
 * oranı. Satış fiyatından hesaplanır; rezervasyonda commissionAmount olarak
 * saklanır, oran sonradan değişse de geçmiş kazanç değişmez.
 */
export async function calculateCommission(
  agencyId: string,
  price: number,
  anlasmaOrani: number,
  hotelCode?: string,
  boardType?: string
): Promise<number> {
  const now = new Date();
  const commissions = await prisma.commission.findMany({
    where: {
      agencyId,
      isActive: true,
      AND: [
        { OR: [{ startDate: null }, { startDate: { lte: now } }] },
        { OR: [{ endDate: null }, { endDate: { gte: now } }] },
        { OR: [{ hotelCode: null }, ...(hotelCode ? [{ hotelCode }] : [])] },
        { OR: [{ boardType: null }, ...(boardType ? [{ boardType }] : [])] },
      ],
    },
  });
  const commission =
    commissions.find((c) => c.hotelCode && c.boardType) ||
    commissions.find((c) => c.hotelCode) ||
    commissions.find((c) => c.boardType) ||
    commissions[0];
  if (!commission) return price * (anlasmaOrani / 100);
  if (commission.type === "PERCENTAGE") return price * (commission.value / 100);
  return commission.value;
}
