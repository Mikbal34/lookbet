import { z } from "zod";

export const roomSchema = z.object({
  adult: z.number().min(1).max(6),
  childAges: z.array(z.number().min(0).max(17)).optional(),
});

export const hotelSearchSchema = z.object({
  destination: z.string().min(1, "Destinasyon seçin"),
  checkIn: z.string().min(1, "Giriş tarihi seçin"),
  checkOut: z.string().min(1, "Çıkış tarihi seçin"),
  nationality: z.string().default("TR"),
  currency: z.string().default("EUR"),
  rooms: z.array(roomSchema).min(1).max(4),
});

export const roomSearchSchema = z.object({
  hotelCode: z.string().min(1),
  checkIn: z.string().min(1),
  checkOut: z.string().min(1),
  nationality: z.string().default("TR"),
  currency: z.string().default("EUR"),
  rooms: z.array(roomSchema).min(1).max(1), // API supports 1 room per booking
});

export type HotelSearchInput = z.infer<typeof hotelSearchSchema>;
export type RoomSearchInput = z.infer<typeof roomSearchSchema>;
