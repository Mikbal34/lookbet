import { NextRequest, NextResponse } from "next/server";
import { konumOzeti } from "@/lib/konum-ozet";

// GET /api/konum/ozet?id=… — seçilen konumun otel sayıları ve fotoğrafları.
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id") ?? "";
  if (!id) return NextResponse.json({ error: "id gerekli" }, { status: 400 });
  try {
    const ozet = await konumOzeti(id);
    if (!ozet) return NextResponse.json({ error: "Konum bulunamadı" }, { status: 404 });
    // Sayılar gece güncelleniyor; birkaç dakika önbellek yeterli.
    return NextResponse.json(ozet, { headers: { "Cache-Control": "public, max-age=300" } });
  } catch (e) {
    console.error("[GET /api/konum/ozet]", e);
    return NextResponse.json({ error: "Özet alınamadı" }, { status: 500 });
  }
}
