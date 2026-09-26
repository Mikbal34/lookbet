import type { z } from "zod";
import { getTranslations } from "next-intl/server";
import { EN_FAZLA_GECE } from "@/lib/validators/search.schema";

/**
 * Şema mesajı bir api.<grup> anahtarıysa ("gecmisTarih") isteğin dilinde
 * metne çevirir; anahtar değilse (Zod'un kendi mesajı) olduğu gibi bırakır.
 */
export async function hataCevirici(grup: "arama" | "profil", degerler?: Record<string, string | number>) {
  const t = await getTranslations("api");
  return (m: string) => (t.has(`${grup}.${m}` as never) ? t(`${grup}.${m}` as never, degerler as never) : m);
}

const alanlariCevir = (alanlar: Record<string, string[] | undefined>, cevir: (m: string) => string) =>
  Object.fromEntries(Object.entries(alanlar).map(([k, v]) => [k, (v ?? []).map(cevir)]));

/** Arama doğrulaması. Yanıt biçimi: { error, details: { alan: [metin] } }. */
export async function aramaHatasi(hata: z.ZodError) {
  const t = await getTranslations("api");
  const cevir = await hataCevirici("arama", { sayi: EN_FAZLA_GECE });
  return { error: t("genel.gecersizIstek"), details: alanlariCevir(hata.flatten().fieldErrors as Record<string, string[] | undefined>, cevir) };
}

/** Profil doğrulaması. Yanıt biçimi: { error, details: { formErrors, fieldErrors } }. */
export async function profilHatasi(hata: z.ZodError) {
  const t = await getTranslations("api");
  const cevir = await hataCevirici("profil");
  const f = hata.flatten();
  return {
    error: t("genel.gecersizIstek"),
    details: { formErrors: f.formErrors.map(cevir), fieldErrors: alanlariCevir(f.fieldErrors as Record<string, string[] | undefined>, cevir) },
  };
}
