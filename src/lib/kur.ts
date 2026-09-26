import { prisma } from "@/lib/prisma";

// Döviz kuru (TCMB günlük efektif değil, döviz satış): fiyatlar EUR; müşteri
// para birimi seçince (TL, USD, GBP) arayüz bu kurla YAKLAŞIK gösterir. Ödeme
// ve kayıt yine EUR. Saatte bir TCMB'den alınır; TCMB yanıt vermezse son
// başarılı kur (system_settings "kur_son") kullanılır. Hafta sonu TCMB son iş
// gününün kurunu verir.

export type ParaBirimi = "EUR" | "TRY" | "USD" | "GBP";
export interface Kurlar {
  kaynak: "TCMB";
  /** TCMB bülten tarihi (GG.AA.YYYY). */
  tarih: string;
  /** 1 EUR karşılığı. */
  eur: Record<ParaBirimi, number>;
}

const ADRES = "https://www.tcmb.gov.tr/kurlar/today.xml";
const OMUR_MS = 60 * 60 * 1000;
let onbellek: { zaman: number; deger: Kurlar } | null = null;

/** TCMB XML'inden bir birimin TL karşılığı (döviz satış / birim). */
function tlKarsiligi(xml: string, kod: string): number | null {
  const blok = xml.match(new RegExp(`<Currency[^>]*Kod="${kod}"[^>]*>([\\s\\S]*?)</Currency>`))?.[1];
  const satis = Number(blok?.match(/<ForexSelling>([\d.]+)<\/ForexSelling>/)?.[1]);
  const birim = Number(blok?.match(/<Unit>(\d+)<\/Unit>/)?.[1] ?? 1);
  return satis > 0 && birim > 0 ? satis / birim : null;
}

async function tcmbdenAl(): Promise<Kurlar> {
  const r = await fetch(ADRES, { signal: AbortSignal.timeout(8000), cache: "no-store" });
  if (!r.ok) throw new Error(`TCMB HTTP ${r.status}`);
  const xml = await r.text();
  const [eur, usd, gbp] = ["EUR", "USD", "GBP"].map((k) => tlKarsiligi(xml, k));
  if (!eur || !usd || !gbp) throw new Error("TCMB yanıtında kur bulunamadı");
  const tarih = xml.match(/Tarih="([\d.]+)"/)?.[1] ?? "";
  const yuvarla = (n: number) => Math.round(n * 1e4) / 1e4;
  return { kaynak: "TCMB", tarih, eur: { EUR: 1, TRY: yuvarla(eur), USD: yuvarla(eur / usd), GBP: yuvarla(eur / gbp) } };
}

export async function kurlar(): Promise<Kurlar | null> {
  if (onbellek && Date.now() - onbellek.zaman < OMUR_MS) return onbellek.deger;
  try {
    const deger = await tcmbdenAl();
    onbellek = { zaman: Date.now(), deger };
    void prisma.systemSetting
      .upsert({
        where: { key: "kur_son" },
        create: { key: "kur_son", value: JSON.stringify(deger), description: "Son başarılı TCMB kuru (otomatik)" },
        update: { value: JSON.stringify(deger) },
      })
      .catch((e) => console.error("[kur] kaydedilemedi", e));
    return deger;
  } catch (e) {
    console.warn("[kur] TCMB alınamadı:", e instanceof Error ? e.message : e);
    if (onbellek) return onbellek.deger;
    const son = await prisma.systemSetting.findUnique({ where: { key: "kur_son" } }).catch(() => null);
    if (!son) return null;
    try {
      const deger = JSON.parse(son.value) as Kurlar;
      // Tekrar tekrar TCMB'yi zorlamasın: 10 dk sonra yeniden dene.
      onbellek = { zaman: Date.now() - OMUR_MS + 10 * 60_000, deger };
      return deger;
    } catch {
      return null;
    }
  }
}
