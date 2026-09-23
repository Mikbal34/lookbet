import { z } from "zod";

export const guestSchema = z.object({
  name: z.string().min(2, "İsim gerekli"),
  surname: z.string().min(2, "Soyisim gerekli"),
  type: z.enum(["Adult", "Child"]),
  age: z.number().optional(),
  gender: z.enum(["Male", "Female"]),
  nationality: z.string().default("TR"),
  // Etscore her misafir için doğum tarihi istiyor.
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Doğum tarihi gerekli"),
});

/** Verilen tarihteki yaş (tam yıl). */
export function yasHesapla(dogum: string, tarih: string): number {
  const [dy, dm, dd] = dogum.split("-").map(Number);
  const [ty, tm, td] = tarih.slice(0, 10).split("-").map(Number);
  return ty - dy - (tm < dm || (tm === dm && td < dd) ? 1 : 0);
}

export const contactSchema = z.object({
  name: z.string().min(2, "İsim gerekli"),
  surname: z.string().min(2, "Soyisim gerekli"),
  email: z.string().email("Geçerli bir email girin"),
  phone: z.string().min(10, "Geçerli bir telefon numarası girin"),
});

export const createBookingSchema = z.object({
  roomSearchId: z.string().min(1),
  priceCode: z.string().min(1),
  hotelCode: z.string().min(1),
  hotelName: z.string().optional(),
  boardType: z.string().optional(),
  roomType: z.string().optional(),
  checkIn: z.string().min(1),
  checkOut: z.string().min(1),
  totalPrice: z.number().positive(),
  currency: z.string().default("EUR"),
  contact: contactSchema,
  rooms: z.array(z.object({ guests: z.array(guestSchema).min(1) })).min(1),
  cancellationPolicy: z.any().optional(),
  additionalInfo: z.string().max(500).optional(),
}).superRefine((b, ctx) => {
  // Fiyat aramadaki yaşlara göre verildi. Doğum tarihi girişteki yaşla
  // uyuşmazsa otel girişte farkı ister ya da rezervasyonu reddeder.
  b.rooms.forEach((oda, i) =>
    oda.guests.forEach((g, j) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(g.birthDate)) return;
      const yas = yasHesapla(g.birthDate, b.checkIn);
      const yol = ["rooms", i, "guests", j, "birthDate"];
      if (g.type === "Child" && g.age !== undefined && yas !== g.age) {
        ctx.addIssue({ code: "custom", path: yol, message: `Girişte ${g.age} yaşında olmalı (aramadaki yaş)` });
      }
      if (g.type === "Adult" && yas < 18) {
        ctx.addIssue({ code: "custom", path: yol, message: "Yetişkin misafir girişte en az 18 yaşında olmalı" });
      }
    })
  );
});

export type GuestInput = z.infer<typeof guestSchema>;
export type ContactInput = z.infer<typeof contactSchema>;
export type CreateBookingInput = z.input<typeof createBookingSchema>;
