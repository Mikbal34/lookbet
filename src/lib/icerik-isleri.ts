// Etscore içerik işleri: sunucudaki cron (/api/internal/sync) ve yönetim
// panelindeki "Şimdi çalıştır" (/api/content/sync) aynı çalıştırıcıyı
// kullanır. Aynı anda tek iş koşar (Etscore hız sınırı ve bellek); her işin
// son çalışması ayar tablosuna "icerik_son_<adim>" olarak yazılır, panel
// oradan okur.

import {
  syncBoardTypes,
  syncFacilities,
  syncHotelContent,
  syncHotels,
  syncPricedHotels,
  syncRevisions,
  syncRoomAttributes,
} from "@/lib/royal-api/sync";
import { prisma } from "@/lib/prisma";

export const ADIMLAR = ["revizyon", "fiyat", "listeler", "oteller", "icerik"] as const;
export type Adim = (typeof ADIMLAR)[number];

export interface SonCalisma {
  zaman: string;
  sure: number;
  basarili: boolean;
  ozet: string;
}

let calisan: Adim | null = null;
export const calisanIs = () => calisan;

const anahtar = (a: Adim) => `icerik_son_${a}`;

/** Sonuç nesnesinden panelde gösterilecek kısa özet (sayılar). */
function ozetle(sonuc: unknown): string {
  if (!sonuc || typeof sonuc !== "object") return "";
  const sayilar: string[] = [];
  const gez = (o: Record<string, unknown>, on = "") => {
    for (const [k, v] of Object.entries(o)) {
      if (typeof v === "number") sayilar.push(`${on}${k}: ${v}`);
      else if (v && typeof v === "object" && !Array.isArray(v) && !on) gez(v as Record<string, unknown>, `${k}.`);
    }
  };
  gez(sonuc as Record<string, unknown>);
  return sayilar.slice(0, 6).join(" · ");
}

export class MesgulHatasi extends Error {}

export async function isCalistir(adim: Adim, ilerleme?: (satir: string) => void) {
  if (calisan) throw new MesgulHatasi(`Şu an "${calisan}" çalışıyor`);
  const feedId = process.env.ROYAL_API_FEED_ID_B2B || process.env.ROYAL_API_FEED_ID_B2C || "";
  const baslangic = Date.now();
  calisan = adim;
  let sonuc: unknown;
  let hata: unknown;
  try {
    switch (adim) {
      case "revizyon":
        sonuc = await syncRevisions({ gun: 2, ilerleme });
        break;
      case "fiyat":
        sonuc = await syncPricedHotels({ feedId, ilerleme });
        break;
      case "icerik":
        sonuc = await syncHotelContent({ ilerleme });
        break;
      case "listeler":
        sonuc = {
          pansiyon: await syncBoardTypes(),
          olanak: await syncFacilities(),
          odaOzelligi: await syncRoomAttributes(),
        };
        break;
      case "oteller":
        sonuc = await syncHotels(feedId);
        break;
    }
    return { adim, sure: Math.round((Date.now() - baslangic) / 1000), sonuc };
  } catch (e) {
    hata = e;
    throw e;
  } finally {
    calisan = null;
    const kayit: SonCalisma = {
      zaman: new Date().toISOString(),
      sure: Math.round((Date.now() - baslangic) / 1000),
      basarili: !hata,
      ozet: hata ? (hata instanceof Error ? hata.message : String(hata)).slice(0, 300) : ozetle(sonuc),
    };
    await prisma.systemSetting
      .upsert({
        where: { key: anahtar(adim) },
        create: { key: anahtar(adim), value: JSON.stringify(kayit), description: "İçerik işinin son çalışması (otomatik)" },
        update: { value: JSON.stringify(kayit) },
      })
      .catch((e) => console.error("[icerik-isleri] son çalışma yazılamadı", e));
  }
}

export async function sonCalismalar(): Promise<Partial<Record<Adim, SonCalisma>>> {
  const satirlar = await prisma.systemSetting.findMany({ where: { key: { in: ADIMLAR.map(anahtar) } } });
  const cikti: Partial<Record<Adim, SonCalisma>> = {};
  for (const s of satirlar) {
    try {
      cikti[s.key.replace("icerik_son_", "") as Adim] = JSON.parse(s.value);
    } catch {}
  }
  return cikti;
}
