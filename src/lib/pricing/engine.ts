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
// Maliyet tabanı: indirimler üst üste binse de satış fiyatı, komisyon
// düşüldükten sonra net maliyetin (+ MIN_KAR_ORANI) altına inmez. Taban
// aşılırsa önce acente indirimi, sonra kampanya indirimi kısılır; kupon da
// tabana kadar düşebilir (tabanFiyat). Böylece hiçbir kombinasyon zarar etmez.
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
type OzelKomisyon = Awaited<ReturnType<typeof komisyonlariGetir>>[number];

export interface FiyatBaglami {
  userType: UserType;
  agencyId?: string;
  acente: { companyName: string; discountRate: number; commission: number } | null;
  kurallar: Kural[];
  indirimler: Indirim[];
  /** Acentenin etkin özel komisyonları (acente değilse boş). */
  komisyonlar: OzelKomisyon[];
  bugun: string;
}

/** Net maliyetin üstünde kalınacak en az kâr (yüzde; varsayılan 0 = maliyetin altına satılmaz). */
const MIN_KAR = Math.max(0, Number(process.env.MIN_KAR_ORANI) || 0) / 100;

const kurallariGetir = (simdi: Date) =>
  prisma.priceRule.findMany({
    where: {
      isActive: true,
      AND: [
        { OR: [{ startDate: null }, { startDate: { lte: simdi } }] },
        { OR: [{ endDate: null }, { endDate: { gte: simdi } }] },
      ],
    },
    // Eşit öncelikte en yeni kural: yönetim listesi ve hesaplayıcı da böyle sıralar.
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  });
const komisyonlariGetir = (agencyId: string, simdi: Date) =>
  prisma.commission.findMany({
    where: {
      agencyId,
      isActive: true,
      AND: [
        { OR: [{ startDate: null }, { startDate: { lte: simdi } }] },
        { OR: [{ endDate: null }, { endDate: { gte: simdi } }] },
      ],
    },
    select: { type: true, value: true, hotelCode: true, boardType: true },
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
  const acenteMi = userType === "AGENCY" && !!agencyId;
  const [kurallar, indirimler, acente, komisyonlar] = await Promise.all([
    kurallariGetir(simdi),
    indirimleriGetir(simdi),
    acenteMi ? prisma.agency.findUnique({ where: { id: agencyId }, select: { companyName: true, discountRate: true, commission: true } }) : null,
    acenteMi ? komisyonlariGetir(agencyId!, simdi) : [],
  ]);
  return { userType, agencyId, acente, kurallar, indirimler, komisyonlar, bugun: bugunTR(simdi) };
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
  /** Net maliyet (tedarikçi fiyatı) — yalnız sunucu ve yönetim içindir. */
  originalPrice: number;
  /** Kural sonrası, kampanya indiriminden önceki fiyat (üstü çizili fiyat). */
  oncekiFiyat: number;
  finalPrice: number;
  /** Müşteriye verilen toplam indirim (kâr payı ve taban sayılmaz, ≥ 0). */
  totalDiscount: number;
  appliedRules: AppliedRule[];
  kampanya: Kampanya | null;
  /** Acentenin bu satıştan komisyonu (acente değilse 0). */
  commissionAmount: number;
  /** İndirimler maliyet tabanına takıldı (kısıldı). */
  tabanda: boolean;
}

// EPSILON: 1.005 gibi değerler ikili gösterimde 1.00499… olduğu için.
export const yuvarla = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const yukariYuvarla = (n: number) => Math.ceil(n * 100 - 1e-6) / 100;

type KomisyonKurali = { tip: "PERCENTAGE" | "FIXED"; deger: number };

/**
 * Acentenin bu otel/pansiyon için komisyonu — oranları yönetim belirler
 * (Yönetim › Acenteler ve Fiyatlar). Uyan etkin özel komisyon varsa o (en
 * özgülü: otel+pansiyon, otel, pansiyon, genel), yoksa anlaşmadaki oran.
 * Satış fiyatından hesaplanır; rezervasyonda commissionAmount olarak
 * saklanır, oran sonradan değişse de geçmiş kazanç değişmez.
 */
export function komisyonKurali(b: FiyatBaglami, hotelCode?: string, boardType?: string): KomisyonKurali | null {
  if (b.userType !== "AGENCY" || !b.agencyId) return null;
  const uyan = b.komisyonlar.filter(
    (c) => (!c.hotelCode || c.hotelCode === hotelCode) && (!c.boardType || c.boardType === boardType)
  );
  const c = uyan.find((c) => c.hotelCode && c.boardType) || uyan.find((c) => c.hotelCode) || uyan.find((c) => c.boardType) || uyan[0];
  if (c) return { tip: c.type, deger: c.value };
  return { tip: "PERCENTAGE", deger: b.acente?.commission ?? 0 };
}

export function komisyonHesapla(b: FiyatBaglami, fiyat: number, hotelCode?: string, boardType?: string): number {
  const k = komisyonKurali(b, hotelCode, boardType);
  if (!k) return 0;
  return yuvarla(k.tip === "PERCENTAGE" ? (fiyat * k.deger) / 100 : k.deger);
}

/** Satılabilecek en düşük fiyat: komisyon düşüldükten sonra net maliyet (+ en az kâr) kalmalı. */
export function tabanFiyat(b: FiyatBaglami, g: Pick<FiyatGirdisi, "basePrice" | "hotelCode" | "boardType">): number {
  const maliyet = g.basePrice * (1 + MIN_KAR);
  const k = komisyonKurali(b, g.hotelCode, g.boardType);
  if (!k || k.deger <= 0) return yukariYuvarla(maliyet);
  if (k.tip === "FIXED") return yukariYuvarla(maliyet + k.deger);
  return yukariYuvarla(maliyet / (1 - Math.min(k.deger, 90) / 100));
}

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

/** Saf hesap: kural → kampanya → acente indirimi → maliyet tabanı (veritabanına gitmez). */
export function fiyatla(b: FiyatBaglami, g: FiyatGirdisi, kampanyasiz = false): FiyatSonucu {
  const base = g.basePrice;
  const appliedRules: AppliedRule[] = [];

  // 1. Kural (kâr payı ya da indirim)
  let listeFiyati = base; // indirimlerden önceki fiyat (kâr payı dahil)
  let fiyat = base;
  const kural = b.kurallar.find((k) => kuralUyarMi(k, b, g));
  if (kural) {
    const fark =
      kural.type === "PERCENTAGE_DISCOUNT" ? base * (kural.value / 100) : kural.type === "FIXED_DISCOUNT" ? kural.value : -(base * (kural.value / 100));
    fiyat = Math.max(0, base - fark);
    if (kural.type === "MARKUP") listeFiyati = fiyat;
    appliedRules.push({ ruleId: kural.id, name: kural.name, type: kural.type, value: kural.value, discountAmount: yuvarla(fark) });
  }
  const kuralSonrasi = fiyat;

  // 2. Kampanya, 3. acente indirimi
  const ind = kampanyasiz ? null : uyanIndirim(b, g);
  let kampanyaTutari = ind && fiyat > 0 ? fiyat * (ind.percent / 100) : 0;
  fiyat -= kampanyaTutari;
  let acenteTutari = b.acente && b.acente.discountRate > 0 ? fiyat * (b.acente.discountRate / 100) : 0;
  fiyat -= acenteTutari;

  // 4. Maliyet tabanı: önce acente indirimi, sonra kampanya kısılır; hâlâ
  // eksikse (indirim kuralı ya da komisyon) fiyat tabana yükselir.
  const taban = tabanFiyat(b, g);
  let tabanda = false;
  if (fiyat < taban) {
    tabanda = true;
    let eksik = taban - fiyat;
    const a = Math.min(acenteTutari, eksik);
    acenteTutari -= a;
    eksik -= a;
    const c = Math.min(kampanyaTutari, eksik);
    kampanyaTutari -= c;
    eksik -= c;
    fiyat = taban;
    if (eksik > 0.004) {
      appliedRules.push({ ruleId: "taban", name: "Maliyet tabanı", type: "MARKUP", value: 0, discountAmount: -yuvarla(eksik) });
    }
  }

  let kampanya: Kampanya | null = null;
  if (ind && kampanyaTutari > 0.004) {
    kampanya = { id: ind.id, ad: ind.name, tur: ind.type, yuzde: ind.percent, tutar: yuvarla(kampanyaTutari) };
    appliedRules.push({ ruleId: `kampanya-${ind.id}`, name: ind.name, type: "PERCENTAGE_DISCOUNT", value: ind.percent, discountAmount: yuvarla(kampanyaTutari) });
  }
  if (b.acente && acenteTutari > 0.004) {
    appliedRules.push({
      ruleId: `agency-${b.agencyId}`,
      name: `Acente İndirimi (${b.acente.companyName})`,
      type: "PERCENTAGE_DISCOUNT",
      value: b.acente.discountRate,
      discountAmount: yuvarla(acenteTutari),
    });
  }

  const finalPrice = yuvarla(fiyat);
  return {
    originalPrice: base,
    // Üstü çizili fiyat: indirimlerden önceki (kural sonrası) fiyat; taban
    // fiyatı onun üstüne çıkardıysa çizili fiyat yok (= son fiyat).
    oncekiFiyat: yuvarla(Math.max(finalPrice, kuralSonrasi)),
    finalPrice,
    totalDiscount: yuvarla(Math.max(0, listeFiyati - finalPrice)),
    appliedRules,
    kampanya,
    commissionAmount: komisyonHesapla(b, finalPrice, g.hotelCode, g.boardType),
    tabanda,
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
export type PriceResult = FiyatSonucu;

/** Tek konaklamanın fiyatı + komisyon (oda araması ve rezervasyon). */
export async function calculatePrice(input: PriceInput): Promise<PriceResult> {
  const b = input.baglam ?? (await fiyatBaglami(input.userType, input.agencyId));
  const konumAdlari =
    input.konumAdlari ?? (input.hotelCode ? (await otelKonumAdlari(b, [input.hotelCode])).get(input.hotelCode) : undefined);
  return fiyatla(b, { ...input, konumAdlari }, input.kampanyasiz);
}
