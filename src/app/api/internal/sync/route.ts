import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { ADIMLAR, MesgulHatasi, isCalistir, type Adim } from "@/lib/icerik-isleri";

// POST /api/internal/sync?adim=revizyon|fiyat|icerik|listeler|oteller
//
// Zamanlanmış içerik işleri. Sunucudaki cron çağırır (bkz. deploy/lookbet.cron);
// iş mantığı lib/icerik-isleri'nde, yönetim paneli de aynısını çalıştırır:
//   revizyon  — her gece: son 2 günde eklenen/değişen/silinen oteller
//   fiyat     — her gece: hangi oteller fiyat veriyor (geniş şehir aramasının
//               600 kodu buna göre seçiliyor)
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
  try {
    const ilerleme = (satir: string) => console.log(`[internal/sync ${adim}] ${satir}`);
    const { sure, sonuc } = await isCalistir(adim, ilerleme);
    console.log(`[internal/sync ${adim}] bitti, ${sure} sn`, JSON.stringify(sonuc).slice(0, 500));
    return NextResponse.json({ adim, sure, sonuc });
  } catch (e) {
    if (e instanceof MesgulHatasi) return NextResponse.json({ error: e.message }, { status: 409 });
    console.error(`[internal/sync ${adim}]`, e);
    return NextResponse.json({ adim, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
