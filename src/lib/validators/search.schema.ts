import { z } from "zod";

export const roomSchema = z.object({
  adult: z.number().min(1).max(6),
  childAges: z.array(z.number().min(0).max(17)).optional(),
});

const tarih = (mesaj: string) => z.string().regex(/^\d{4}-\d{2}-\d{2}$/, mesaj);

/** Etscore en fazla 30 gece kabul ediyor (31'de 0904073, ölçüldü). */
export const EN_FAZLA_GECE = 30;

/**
 * Tarih aralığı kontrolü. Bozuk tarih Etscore'a gidince yalnızca "invalid
 * data" (0910001) dönüyordu; kullanıcıya ne yanlış olduğunu söylemek için
 * burada yakalanıyor.
 */
function tarihAraligi(b: { checkIn: string; checkOut: string }, ctx: z.RefinementCtx) {
  const giris = Date.parse(`${b.checkIn}T00:00:00Z`);
  const cikis = Date.parse(`${b.checkOut}T00:00:00Z`);
  if (Number.isNaN(giris) || Number.isNaN(cikis)) return; // regex zaten yakaladı
  const gece = Math.round((cikis - giris) / 86_400_000);
  if (gece < 1) {
    ctx.addIssue({ code: "custom", path: ["checkOut"], message: "Çıkış tarihi girişten sonra olmalı" });
  } else if (gece > EN_FAZLA_GECE) {
    ctx.addIssue({ code: "custom", path: ["checkOut"], message: `En fazla ${EN_FAZLA_GECE} gece aranabilir` });
  }
  // "Bugün" Türkiye saatine göre (sunucu UTC'de de koşsa).
  if (b.checkIn < new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(new Date())) {
    ctx.addIssue({ code: "custom", path: ["checkIn"], message: "Giriş tarihi geçmişte olamaz" });
  }
}

/**
 * Etscore oda araması TRY kabul etmiyor (0904079); fiyatlar EUR. İstemci
 * başka bir birim gönderse de EUR'ya düşer (TL gösterimi arayüzde çevrilir).
 */
const paraBirimi = z.string().optional().transform(() => "EUR" as const);
const uyruk = z
  .string()
  .optional()
  .transform((v) => (v && /^[A-Za-z]{2}$/.test(v) ? v.toUpperCase() : "TR"));

export const hotelSearchSchema = z
  .object({
    destination: z.string().trim().min(1, "Destinasyon seçin").max(120),
    checkIn: tarih("Giriş tarihi seçin"),
    checkOut: tarih("Çıkış tarihi seçin"),
    nationality: uyruk,
    currency: paraBirimi,
    rooms: z.array(roomSchema).min(1).max(4),
  })
  .superRefine(tarihAraligi);

export const roomSearchSchema = z
  .object({
    hotelCode: z.string().min(1).max(50),
    checkIn: tarih("Giriş tarihi seçin"),
    checkOut: tarih("Çıkış tarihi seçin"),
    nationality: uyruk,
    currency: paraBirimi,
    rooms: z.array(roomSchema).min(1).max(1), // API supports 1 room per booking
  })
  .superRefine(tarihAraligi);

export type HotelSearchInput = z.infer<typeof hotelSearchSchema>;
export type RoomSearchInput = z.infer<typeof roomSearchSchema>;
