import { z } from "zod";

// Boş bırakılabilen alanlar: "" ya da null gelirse null saklanır (fiyat
// motoru null'u "tümü" sayar; "" hiçbir otelle eşleşmezdi).
// Gönderilmeyen alan (undefined) olduğu gibi kalır; güncellemede değişmez.
const bosOlabilir = z.string().nullish().transform((v) => (v === undefined ? undefined : v || null));

const priceRuleAlanlari = {
  name: z.string().min(1, "Kural adı gerekli"),
  type: z.enum(["PERCENTAGE_DISCOUNT", "FIXED_DISCOUNT", "MARKUP"]),
  value: z.number().positive("Değer pozitif olmalı"),
  appliesTo: z.enum(["ALL_AGENCIES", "SPECIFIC_AGENCY", "ALL_CUSTOMERS"]),
  agencyId: bosOlabilir,
  hotelCode: bosOlabilir,
  boardType: bosOlabilir,
  startDate: bosOlabilir,
  endDate: bosOlabilir,
  isActive: z.boolean(),
  priority: z.number().int(),
};
export const priceRuleSchema = z.object({
  ...priceRuleAlanlari,
  isActive: z.boolean().default(true),
  priority: z.number().int().default(0),
});
// Güncelleme: yalnız gönderilen alanlar değişir. partial() Zod 4'te
// varsayılanları yine uygular (isActive → true, priority → 0); bu yüzden
// varsayılansız alanlardan ayrı kurulur.
export const priceRuleUpdateSchema = z.object(priceRuleAlanlari).partial();

const commissionAlanlari = {
  agencyId: z.string().min(1, "Acente seçin"),
  type: z.enum(["PERCENTAGE", "FIXED"]),
  value: z.number().positive("Değer pozitif olmalı"),
  hotelCode: bosOlabilir,
  boardType: bosOlabilir,
  startDate: bosOlabilir,
  endDate: bosOlabilir,
  isActive: z.boolean(),
};
export const commissionSchema = z.object({ ...commissionAlanlari, isActive: z.boolean().default(true) });
export const commissionUpdateSchema = z.object(commissionAlanlari).partial();

export const agencyApproveSchema = z.object({
  discountRate: z.number().min(0).max(100).optional(),
  commission: z.number().min(0).max(100).optional(),
  feedId: z.string().optional(),
  notes: z.string().optional(),
});

// Başvuru onayı: anlaşma oranları. Şifre yok; acente e-posta koduyla girer.
export const applicationApproveSchema = z.object({
  discountRate: z.number().min(0).max(100).optional(),
  commission: z.number().min(0).max(100).optional(),
  feedId: z.string().optional(),
  notes: z.string().optional(),
});

export const applicationRejectSchema = z.object({
  reason: z.string().max(500).optional(),
});


export const userUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  role: z.enum(["CUSTOMER", "AGENCY", "ADMIN"]).optional(),
  isActive: z.boolean().optional(),
});

export type PriceRuleInput = z.input<typeof priceRuleSchema>;
export type CommissionInput = z.input<typeof commissionSchema>;
export type AgencyApproveInput = z.infer<typeof agencyApproveSchema>;
export type ApplicationApproveInput = z.infer<typeof applicationApproveSchema>;
export type ApplicationRejectInput = z.infer<typeof applicationRejectSchema>;
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;

// ── Kampanyalar ──
const tarihYaDaBos = z
  .string()
  .nullish()
  .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), "Tarih YYYY-AA-GG olmalı")
  .transform((v) => (v === undefined ? undefined : v || null));
const sayiYaDaBos = z.number().int().min(0).max(3650).nullish();

const discountAlanlari = {
  name: z.string().trim().min(2, "Ad gerekli").max(120),
  type: z.enum(["EARLY_BOOKING", "LAST_MINUTE", "LONG_STAY", "DATE_RANGE"]),
  percent: z.number().gt(0, "Yüzde sıfırdan büyük olmalı").max(90, "En fazla %90"),
  minDays: sayiYaDaBos,
  maxDays: sayiYaDaBos,
  minNights: sayiYaDaBos,
  stayStart: tarihYaDaBos,
  stayEnd: tarihYaDaBos,
  hotelCodes: z.array(z.string().min(1)).max(200),
  locationName: bosOlabilir,
  audience: z.enum(["CUSTOMER", "AGENCY", "ALL"]),
  startsAt: tarihYaDaBos,
  endsAt: tarihYaDaBos,
  isActive: z.boolean(),
  showcase: z.boolean(),
  description: z.string().trim().max(400).nullish(),
};
const discountKosulu = (d: { type?: string; minDays?: number | null; maxDays?: number | null; minNights?: number | null; stayStart?: string | null; stayEnd?: string | null }, ctx: z.RefinementCtx) => {
  if (d.type === "EARLY_BOOKING" && !d.minDays) ctx.addIssue({ code: "custom", path: ["minDays"], message: "Girişe en az kaç gün kalacağını yaz" });
  if (d.type === "LAST_MINUTE" && d.maxDays == null) ctx.addIssue({ code: "custom", path: ["maxDays"], message: "Girişe en fazla kaç gün kalacağını yaz" });
  if (d.type === "LONG_STAY" && !d.minNights) ctx.addIssue({ code: "custom", path: ["minNights"], message: "En az kaç gece olacağını yaz" });
  if (d.type === "DATE_RANGE" && (!d.stayStart || !d.stayEnd)) ctx.addIssue({ code: "custom", path: ["stayStart"], message: "Konaklama tarih aralığını seç" });
  if (d.stayStart && d.stayEnd && d.stayStart > d.stayEnd) ctx.addIssue({ code: "custom", path: ["stayEnd"], message: "Bitiş başlangıçtan önce olamaz" });
};
export const discountSchema = z
  .object({ ...discountAlanlari, hotelCodes: z.array(z.string().min(1)).max(200).default([]), audience: z.enum(["CUSTOMER", "AGENCY", "ALL"]).default("CUSTOMER"), isActive: z.boolean().default(true), showcase: z.boolean().default(false) })
  .superRefine(discountKosulu);
export const discountUpdateSchema = z.object(discountAlanlari).partial().superRefine(discountKosulu);

const couponAlanlari = {
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{4,20}$/, "Kod 4–20 harf ya da rakam olmalı"),
  type: z.enum(["PERCENTAGE", "FIXED"]),
  value: z.number().gt(0, "Değer sıfırdan büyük olmalı"),
  minAmount: z.number().min(0).nullish(),
  usageLimit: z.number().int().min(1).nullish(),
  perUserOnce: z.boolean(),
  audience: z.enum(["CUSTOMER", "NEW_CUSTOMER", "AGENCY"]),
  expiresAt: tarihYaDaBos,
  stacks: z.boolean(),
  isActive: z.boolean(),
  note: z.string().trim().max(200).nullish(),
};
const couponKosulu = (c: { type?: string; value?: number }, ctx: z.RefinementCtx) => {
  if (c.type === "PERCENTAGE" && c.value !== undefined && c.value > 90) ctx.addIssue({ code: "custom", path: ["value"], message: "Yüzde en fazla 90 olabilir" });
};
export const couponSchema = z
  .object({ ...couponAlanlari, perUserOnce: z.boolean().default(true), audience: z.enum(["CUSTOMER", "NEW_CUSTOMER", "AGENCY"]).default("CUSTOMER"), stacks: z.boolean().default(false), isActive: z.boolean().default(true) })
  .superRefine(couponKosulu);
export const couponUpdateSchema = z.object(couponAlanlari).partial().superRefine(couponKosulu);
