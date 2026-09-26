import { z } from "zod";

const tarih = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tarih YYYY-AA-GG olmalı");

export const guestSchema = z.object({
  name: z.string().trim().min(2, "İsim gerekli").max(60),
  surname: z.string().trim().min(2, "Soyisim gerekli").max(60),
  type: z.enum(["Adult", "Child"]),
  age: z.number().int().min(0).max(17).optional(),
  gender: z.enum(["Male", "Female"]),
  nationality: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, "Uyruk iki harfli ülke kodu olmalı").default("TR"),
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
  name: z.string().trim().min(2, "İsim gerekli").max(60),
  surname: z.string().trim().min(2, "Soyisim gerekli").max(60),
  email: z.string().trim().email("Geçerli bir email girin").max(254),
  phone: z.string().trim().min(10, "Geçerli bir telefon numarası girin").max(30),
});

// Sunucu fiyatı, tarihleri, pansiyonu, kişi sayılarını ve iptal koşullarını
// fiyat kodunun kendi kaydından alır (lib/royal-api/booking: fiyatKaydi);
// aşağıdaki "bilgi" alanları yalnız ödeme sayfasının kendi doğrulaması
// içindir, sunucuda kullanılmaz.
export const createBookingSchema = z.object({
  priceCode: z.string().min(1).max(300),
  hotelCode: z.string().min(1).max(50),
  /** Müşterinin onayladığı ödenecek tutar (kupon dahil); sunucunun hesabıyla karşılaştırılır. */
  totalPrice: z.number().positive(),
  contact: contactSchema,
  // Etscore şimdilik rezervasyon başına tek oda kabul ediyor.
  rooms: z.array(z.object({ guests: z.array(guestSchema).min(1).max(10) })).length(1),
  additionalInfo: z.string().trim().max(500).optional(),
  /** Ödeme adımında girilen kupon kodu. */
  couponCode: z.string().trim().max(40).optional(),
  // Bilgi alanları (sunucu kullanmaz):
  roomSearchId: z.string().max(300).optional(),
  hotelName: z.string().max(300).optional(),
  boardType: z.string().max(50).optional(),
  roomType: z.string().max(300).optional(),
  checkIn: tarih,
  checkOut: tarih,
  currency: z.string().max(3).optional(),
  cancellationPolicy: z.unknown().optional(),
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

/**
 * Misafirleri fiyat kodunun kaydındaki kişi sayıları ve giriş tarihine göre
 * denetler (sunucu). Hata metin değil anahtardır (messages/<dil>/api.json ›
 * rezervasyon); uç isteğin dilinde yazar.
 */
export type MisafirHatasi =
  | { yol: (string | number)[]; anahtar: "misafirSayisi"; degerler: { yetiskin: number } }
  | { yol: (string | number)[]; anahtar: "misafirSayisiCocuklu"; degerler: { yetiskin: number; cocuk: number } }
  | { yol: (string | number)[]; anahtar: "dogumGecersiz" | "yetiskin18"; degerler?: undefined }
  | { yol: (string | number)[]; anahtar: "cocukYasi"; degerler: { yaslar: string } };

export function misafirleriDenetle(
  misafirler: GuestInput[],
  kayit: { checkIn: string; odalar: { adult: number; childAges?: number[] }[] }
): MisafirHatasi[] {
  const hatalar: MisafirHatasi[] = [];
  const oda = kayit.odalar[0] ?? { adult: 1, childAges: [] };
  const yetiskin = misafirler.filter((g) => g.type === "Adult").length;
  const cocukYaslari = [...(oda.childAges ?? [])].sort((a, b) => a - b);
  const cocuklar = misafirler.filter((g) => g.type === "Child");
  if (yetiskin !== oda.adult || cocuklar.length !== cocukYaslari.length) {
    hatalar.push(
      cocukYaslari.length
        ? { yol: ["rooms", 0, "guests"], anahtar: "misafirSayisiCocuklu", degerler: { yetiskin: oda.adult, cocuk: cocukYaslari.length } }
        : { yol: ["rooms", 0, "guests"], anahtar: "misafirSayisi", degerler: { yetiskin: oda.adult } }
    );
    return hatalar;
  }
  const kalan = [...cocukYaslari];
  misafirler.forEach((g, j) => {
    const yas = yasHesapla(g.birthDate, kayit.checkIn);
    const yol = ["rooms", 0, "guests", j, "birthDate"];
    if (Number.isNaN(yas) || yas < 0 || yas > 120) return hatalar.push({ yol, anahtar: "dogumGecersiz" });
    if (g.type === "Adult" && yas < 18) return hatalar.push({ yol, anahtar: "yetiskin18" });
    if (g.type === "Child") {
      const i = kalan.indexOf(yas);
      if (i === -1) hatalar.push({ yol, anahtar: "cocukYasi", degerler: { yaslar: cocukYaslari.join(", ") } });
      else kalan.splice(i, 1);
    }
  });
  return hatalar;
}

export type GuestInput = z.infer<typeof guestSchema>;
export type ContactInput = z.infer<typeof contactSchema>;
export type CreateBookingInput = z.input<typeof createBookingSchema>;
