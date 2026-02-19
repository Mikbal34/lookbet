import { z } from "zod";

export const guestSchema = z.object({
  name: z.string().min(2, "İsim gerekli"),
  surname: z.string().min(2, "Soyisim gerekli"),
  type: z.enum(["Adult", "Child"]),
  age: z.number().optional(),
  gender: z.enum(["Male", "Female"]),
  nationality: z.string().default("TR"),
});

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
});

export type GuestInput = z.infer<typeof guestSchema>;
export type ContactInput = z.infer<typeof contactSchema>;
export type CreateBookingInput = z.input<typeof createBookingSchema>;
