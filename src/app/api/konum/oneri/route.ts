import { NextRequest, NextResponse } from "next/server";
import { konumOnerileri } from "@/lib/konum-oneri";

// GET /api/konum/oneri?q=ista — "Nereye" kutusu için konum önerileri.
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.slice(0, 60) ?? "";
  try {
    return NextResponse.json({ oneriler: await konumOnerileri(q) });
  } catch (e) {
    console.error("[GET /api/konum/oneri]", e);
    return NextResponse.json({ oneriler: [] }, { status: 500 });
  }
}
