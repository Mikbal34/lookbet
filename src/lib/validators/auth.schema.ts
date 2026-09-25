import { z } from "zod";

// Acente başvurusu: acente girişinden sonra panelde bir kez doldurulur.
// E-posta formda yok; giriş yapılan (kodla doğrulanmış) e-posta kullanılır.
const rakam = (v: string) => v.replace(/\D/g, "");

export const acenteBasvuruSchema = z.object({
  contactName: z.string().trim().min(3, "Adını ve soyadını yaz").max(100),
  phone: z.string().trim().refine((v) => rakam(v).length >= 10 && rakam(v).length <= 15, "Telefon numarası eksik"),
  companyName: z.string().trim().min(2, "Şirket unvanını yaz").max(200),
  taxId: z.string().trim().regex(/^\d{10,11}$/, "Vergi no 10, TC kimlik no 11 hane olmalı"),
  taxOffice: z.string().trim().min(2, "Vergi dairesini yaz").max(100),
  tursabNo: z.string().trim().max(20).optional().or(z.literal("")),
  address: z.string().trim().min(10, "Açık adresi yaz").max(500),
  companyPhone: z.string().trim().max(20).optional().or(z.literal("")),
  website: z.string().trim().max(200).optional().or(z.literal("")),
  message: z.string().trim().max(1000, "En fazla 1000 karakter").optional().or(z.literal("")),
});

export type AcenteBasvuruInput = z.infer<typeof acenteBasvuruSchema>;
