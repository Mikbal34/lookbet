import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import {
  syncBoardTypes,
  syncFacilities,
  syncHotelContent,
  syncHotels,
  syncRevisions,
  syncRoomAttributes,
} from "@/lib/royal-api/sync";

// POST /api/internal/sync?adim=revizyon|icerik|listeler|oteller
//
// Zamanlanmış içerik işleri. Sunucudaki cron çağırır (bkz. deploy/cron):
//   revizyon  — her gece: son 2 günde eklenen/değişen/silinen oteller
//   listeler  — haftalık: pansiyon, olanak, oda özelliği adları
//   oteller   — haftalık: otel listesi (yeni kodlar)
//   icerik    — haftalık: fotoğrafı ya da konumu eksik oteller
//
// Standalone Docker imajında tsx ve scripts/ yok; işler bu uçtan çalışıyor.
// Kimlik: Authorization: Bearer $CRON_SECRET. nginx bu yolu dışarıya
// kapatıyor; cron doğrudan 127.0.0.1:3000'e gider. İşler uzun sürebilir
// (ilk içerik taraması ~20 dk); istek iş bitene kadar açık kalır.

export const dynamic = "force-dynamic";
export const maxDuration = 3600;

const ADIMLAR = ["revizyon", "icerik", "listeler", "oteller"] as const;
type Adim = (typeof ADIMLAR)[number];

/** Aynı anda iki iş koşmasın: Etscore hız sınırını ve belleği paylaşıyorlar. */
let calisan: Adim | null = null;

function yetkili(req: NextRequest): boolean {
  const gizli = process.env.CRON_SECRET ?? "";
  if (gizli.length < 16) return false; // tanımsızsa uç kapalı
  const gelen = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const a = Buffer.from(gelen);
  const b = Buffer.from(gizli);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  if (!yetkili(req)) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const adim = req.nextUrl.searchParams.get("adim") as Adim | null;
  if (!adim || !ADIMLAR.includes(adim)) {
    return NextResponse.json({ error: `adim: ${ADIMLAR.join(" | ")}` }, { status: 400 });
  }
  if (calisan) {
    return NextResponse.json({ error: `Şu an "${calisan}" çalışıyor` }, { status: 409 });
  }

  const feedId = process.env.ROYAL_API_FEED_ID_B2B || process.env.ROYAL_API_FEED_ID_B2C || "";
  const baslangic = Date.now();
  calisan = adim;
  try {
    const ilerleme = (satir: string) => console.log(`[internal/sync ${adim}] ${satir}`);
    let sonuc: unknown;
    switch (adim) {
      case "revizyon":
        sonuc = await syncRevisions({ gun: 2, ilerleme });
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
    const sure = Math.round((Date.now() - baslangic) / 1000);
    console.log(`[internal/sync ${adim}] bitti, ${sure} sn`, JSON.stringify(sonuc).slice(0, 500));
    return NextResponse.json({ adim, sure, sonuc });
  } catch (e) {
    console.error(`[internal/sync ${adim}]`, e);
    return NextResponse.json({ adim, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  } finally {
    calisan = null;
  }
}
