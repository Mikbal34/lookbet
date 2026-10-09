import { BICIM_YERELI, type Dil } from "./diller";

// Dile göre tarih, para ve sayı biçimi (saf fonksiyonlar; sunucu ve istemci).
// İstemci bileşenlerinde useBicim() (i18n/use-bicim) kullanın; o bunları
// geçerli dille çağırır. Konaklama tarihleri yerel gece yarısı Date'tir
// (isoOku); saat dilimi kayması yok.

export function bicimleyici(dil: Dil) {
  const yerel = BICIM_YERELI[dil];
  const tarih = (o: Intl.DateTimeFormatOptions) => {
    const f = new Intl.DateTimeFormat(yerel, o);
    return (d: Date) => f.format(d);
  };
  const gunAyF = tarih({ day: "numeric", month: "short" });
  const gunAyUzunF = tarih({ day: "numeric", month: "long" });
  const gunAyYilF = tarih({ day: "numeric", month: "long", year: "numeric" });
  const gunAyYilKisaF = tarih({ day: "numeric", month: "short", year: "numeric" });
  const haftaGunuF = tarih({ weekday: "short", day: "numeric", month: "short" });
  const haftaGunuUzunF = tarih({ weekday: "long", day: "numeric", month: "long" });
  const ayYilF = tarih({ month: "long", year: "numeric" });
  const saatF = tarih({ hour: "2-digit", minute: "2-digit" });
  const ayAdlari = Array.from({ length: 12 }, (_, i) => new Intl.DateTimeFormat(yerel, { month: "long" }).format(new Date(2026, i, 1)));
  const ayAdlariKisa = Array.from({ length: 12 }, (_, i) => new Intl.DateTimeFormat(yerel, { month: "short" }).format(new Date(2026, i, 1)));
  // Pazartesiden başlayan kısa gün adları (takvim başlığı). 2026-01-05 pazartesi.
  const gunlerKisa = Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat(yerel, { weekday: "short" }).format(new Date(2026, 0, 5 + i)));
  return {
    dil,
    yerel,
    /** 26 Eki · 26 Oct */
    gunAy: gunAyF,
    /** 26 Ekim · 26 October */
    gunAyUzun: gunAyUzunF,
    /** 26 Ekim 2026 · 26 October 2026 */
    gunAyYil: gunAyYilF,
    /** 26 Eki 2026 · 26 Oct 2026 */
    gunAyYilKisa: gunAyYilKisaF,
    /** Pzt 26 Eki · Mon 26 Oct */
    haftaGunu: haftaGunuF,
    /** Pazartesi 26 Ekim · Monday 26 October */
    haftaGunuUzun: haftaGunuUzunF,
    /** Ekim 2026 · October 2026 */
    ayYil: ayYilF,
    /** 14:30 */
    saat: saatF,
    /** Ay adları (0 = Ocak/January). */
    ayAdlari,
    ayAdlariKisa,
    /** Pazartesiden başlayan kısa gün adları. */
    gunlerKisa,
    /** 26–28 Eki · 26 Eki – 2 Kas (aynı ayda gün aralığı kısalır). */
    aralik(bas: Date, son: Date) {
      if (bas.getMonth() === son.getMonth() && bas.getFullYear() === son.getFullYear()) {
        return dil === "tr" ? `${bas.getDate()}–${gunAyF(son)}` : `${bas.getDate()}–${gunAyF(son)}`;
      }
      return `${gunAyF(bas)} – ${gunAyF(son)}`;
    },
    /** €1.234 · €1,234 (kesirsiz); kesir: 2 hane. */
    para(n: number, birim = "EUR", kesir = false) {
      return new Intl.NumberFormat(yerel, {
        style: "currency",
        currency: birim || "EUR",
        minimumFractionDigits: kesir ? 2 : 0,
        maximumFractionDigits: kesir ? 2 : 0,
      }).format(n);
    },
    sayi(n: number) {
      return new Intl.NumberFormat(yerel).format(n);
    },
  };
}
export type Bicimleyici = ReturnType<typeof bicimleyici>;
