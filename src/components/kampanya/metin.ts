// Vitrin kampanyasının dile göre metinleri (ana sayfa şeridi ve /kampanyalar):
// yüzde, yayın tarihi, koşul (yönetimde açıklama yazılmadıysa) ve düğme.
import { useTranslations } from "next-intl";
import { useBicim } from "@/i18n/use-bicim";
import { kampanyaHedefi, type VitrinKampanya } from "./ortak";

/** "YYYY-MM-DD" → yerel gece yarısı. */
function gun(s: string) {
  const [y, a, g] = s.split("-").map(Number);
  return new Date(y, a - 1, g);
}

export function useKampanyaMetni() {
  const t = useTranslations("anaSayfa.kampanya");
  const b = useBicim();
  const gunMetni = (s: string | null) => (s ? b.gunAyUzun(gun(s)) : "");
  return {
    /** %15 · 15% */
    yuzde: (k: VitrinKampanya) => t("yuzde", { yuzde: b.sayi(k.yuzde) }),

    /** "Başlangıç 3 Ekim" (yakında), "2 Ekim'e kadar", "Süresiz". */
    tarih(k: VitrinKampanya) {
      if (k.yakinda && k.baslangic) return t("baslangic", { tarih: gunMetni(k.baslangic) });
      if (!k.bitis) return t("suresiz");
      // Türkçede ay adına yönelme eki: Eylül'e, Ekim'e; öbür aylar -a.
      const ay = gun(k.bitis).getMonth();
      return t("bitis", { tarih: b.dil === "tr" ? `${gunMetni(k.bitis)}'${ay === 8 || ay === 9 ? "e" : "a"}` : gunMetni(k.bitis) });
    },

    /** Yönetimde yazılan açıklama; yoksa koşuldan kurulan metin. */
    aciklama(k: VitrinKampanya) {
      if (k.aciklama) return k.aciklama;
      const ortak = {
        yuzde: b.sayi(k.yuzde),
        kapsam: k.oteller.length ? "secili" : k.bolge ? "bolge" : "tum",
        bolge: k.bolge ?? "",
      };
      if (k.tur === "EARLY_BOOKING") return t("kosul.erken", { ...ortak, gun: k.minGun ?? 0 });
      if (k.tur === "LAST_MINUTE") return t("kosul.sonDakika", { ...ortak, gun: k.maxGun ?? 0 });
      if (k.tur === "LONG_STAY") return t("kosul.uzun", { ...ortak, gece: k.minGece ?? 0 });
      return t("kosul.aralik", { ...ortak, bas: gunMetni(k.girisBas), son: gunMetni(k.girisSon) });
    },

    /** Kartın düğmesi: "Bodrum otelleri", "Otele bak", "Otel ara". */
    dugme(k: VitrinKampanya) {
      const h = kampanyaHedefi(k);
      return h.tur === "bolge" ? t("dugme.bolge", { bolge: h.bolge }) : h.tur === "otel" ? t("dugme.otel") : t("dugme.ara");
    },
  };
}
