import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/content/currencies
// Royal API'dan senkronize edilen para birimleri listesi. Locale seçicisi
// buradan beslenir; tablo boşsa istemci kendi varsayılan listesine düşer.
export async function GET() {
  try {
    const currencies = await prisma.currency.findMany({
      orderBy: { code: "asc" },
      select: { code: true, name: true },
    });

    return NextResponse.json({ currencies });
  } catch (error) {
    console.error("[GET /api/content/currencies]", error);
    return NextResponse.json(
      { error: "Para birimleri alınırken bir hata oluştu" },
      { status: 500 }
    );
  }
}
