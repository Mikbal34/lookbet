import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth/auth-options";
import { kuponDegerlendir } from "@/lib/pricing/kupon";

// POST /api/kupon — ödeme adımında kupon önizlemesi (giriş gerekli).
// Kesin tutar rezervasyonda tedarikçi fiyatı üzerinden aynı kuralla
// yeniden hesaplanır (bkz. /api/booking).

const semaya = z.object({
  kod: z.string().trim().min(1, "Kupon kodunu yaz").max(40),
  hotelCode: z.string().min(1),
  boardType: z.string().optional(),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  netPrice: z.number().positive(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Kupon için giriş yap" }, { status: 401 });
  const parsed = semaya.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Geçersiz istek" }, { status: 422 });
  const { kod, netPrice, ...girdi } = parsed.data;
  const role = session.user.role as "CUSTOMER" | "AGENCY" | "ADMIN";
  const s = await kuponDegerlendir({
    kod,
    userId: session.user.id,
    userType: role,
    agencyId: session.user.agencyId ?? undefined,
    girdi: { ...girdi, basePrice: netPrice },
  });
  if (s.durum === "gecersiz") return NextResponse.json({ durum: s.durum, mesaj: s.mesaj }, { status: 422 });
  return NextResponse.json({
    durum: s.durum,
    mesaj: s.mesaj,
    kod: s.kupon.kod,
    tutar: s.durum === "uygulandi" ? s.tutar : 0,
    kampanya: s.fiyat.kampanya,
    oncekiFiyat: s.fiyat.oncekiFiyat,
    fiyat: s.fiyat.finalPrice,
    sonFiyat: s.durum === "uygulandi" ? s.sonFiyat : s.fiyat.finalPrice,
  });
}
