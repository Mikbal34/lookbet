import { NextResponse } from "next/server";
import { kurlar } from "@/lib/kur";

// GET /api/kur — 1 EUR'nun TL, USD, GBP karşılığı (TCMB). Arayüz fiyatları
// seçilen para biriminde yaklaşık göstermek için kullanır (lib/kur).
export const dynamic = "force-dynamic";

export async function GET() {
  const k = await kurlar();
  if (!k) return NextResponse.json({ error: "Kur şu an alınamıyor" }, { status: 503 });
  return NextResponse.json(k, { headers: { "Cache-Control": "public, max-age=1800" } });
}
