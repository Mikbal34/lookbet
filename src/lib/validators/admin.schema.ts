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
