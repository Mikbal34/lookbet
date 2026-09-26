import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/saglik — Docker sağlık kontrolü: uygulama ayakta ve veritabanına
// ulaşıyor mu. Ana sayfayı çizdirmez (önceki kontrol her 30 sn ana sayfayı
// çizdiriyor, başlıkları alıp bağlantıyı kestiği için soğuk açılışta akış
// yarıda kalıyor ve "transformAlgorithm is not a function" düşüyordu).

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
