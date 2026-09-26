import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { ALANLAR } from "./alanlar";
import { DIL_CEREZI, dilMi, type Dil } from "./diller";

// İsteğin dili: NEXT_LOCALE çerezi (dil penceresinden seçilir); yoksa
// tarayıcının dili Türkçe içeriyorsa (ya da hiç belirtilmemişse) Türkçe,
// değilse İngilizce. Adres yapısı dile göre değişmez.
async function istekDili(): Promise<Dil> {
  const cerez = (await cookies()).get(DIL_CEREZI)?.value;
  if (dilMi(cerez)) return cerez;
  const tarayici = (await headers()).get("accept-language") ?? "";
  return !tarayici || /(^|,)\s*tr\b/i.test(tarayici) ? "tr" : "en";
}

async function mesajlar(dil: Dil) {
  const parcalar = await Promise.all(
    ALANLAR.map(async (alan) => [alan, (await import(`../../messages/${dil}/${alan}.json`)).default] as const)
  );
  return Object.fromEntries(parcalar);
}

export default getRequestConfig(async () => {
  const locale = await istekDili();
  return { locale, messages: await mesajlar(locale), timeZone: "Europe/Istanbul" };
});
