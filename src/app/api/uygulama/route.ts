// GET /api/uygulama?ac=1 — uygulama görünümünü tarayıcıda denemek için
// (kapatmak: ?ac=0). Oturum çerezi: tarayıcı kapanınca düşer, kimsede takılı
// kalmaz. Gerçek uygulama çerez değil User-Agent ile tanınır.

import { NextResponse, type NextRequest } from "next/server";
import { UYGULAMA_CEREZ } from "@/lib/uygulama-ortak";

export function GET(req: NextRequest) {
  const yanit = new NextResponse(null, { status: 303, headers: { Location: "/" } });
  if (req.nextUrl.searchParams.get("ac") === "0") {
    yanit.cookies.delete(UYGULAMA_CEREZ);
  } else {
    yanit.cookies.set(UYGULAMA_CEREZ, "1", {
      path: "/",
      sameSite: "lax",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });
  }
  return yanit;
}
