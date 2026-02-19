import { z } from "zod";

export const priceRuleSchema = z.object({
  name: z.string().min(1, "Kural adı gerekli"),
  type: z.enum(["PERCENTAGE_DISCOUNT", "FIXED_DISCOUNT", "MARKUP"]),
  value: z.number().positive("Değer pozitif olmalı"),
  appliesTo: z.enum(["ALL_AGENCIES", "SPECIFIC_AGENCY", "ALL_CUSTOMERS"]),
  agencyId: z.string().optional(),
  hotelCode: z.string().optional(),
  boardType: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  isActive: z.boolean().default(true),
  priority: z.number().int().default(0),
});

export const commissionSchema = z.object({
  agencyId: z.string().min(1, "Acente seçin"),
  type: z.enum(["PERCENTAGE", "FIXED"]),
  value: z.number().positive("Değer pozitif olmalı"),
  hotelCode: z.string().optional(),
  boardType: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const agencyApproveSchema = z.object({
  discountRate: z.number().min(0).max(100).optional(),
  commission: z.number().min(0).max(100).optional(),
  feedId: z.string().optional(),
  notes: z.string().optional(),
});

export const systemSettingSchema = z.object({
  key: z.string().min(1),
  value: z.string().min(1),
  description: z.string().optional(),
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
export type SystemSettingInput = z.infer<typeof systemSettingSchema>;
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;
