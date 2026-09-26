import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth/auth-options";
import { kuponDegerlendir } from "@/lib/pricing/kupon";
import { fiyatKaydi } from "@/lib/royal-api";
import { feedBul } from "@/lib/feed";
import { hizSiniri } from "@/lib/hiz-siniri";
import { getTranslations } from "next-intl/server";

// POST /api/kupon — ödeme adımında kupon önizlemesi (giriş gerekli).
// Tutar, fiyat kodunun sunucudaki kaydından (net fiyat, otel, pansiyon,
// tarihler) hesaplanır; rezervasyon da aynı kuralla yeniden hesaplar.
// Kod denemesine karşı kullanıcı başına 10 dk'da 20 istek.

const semaya = z.object({
  kod: z.string().trim().min(1).max(40),
  priceCode: z.string().min(1).max(300),
});

export async function POST(req: NextRequest) {
  const t = await getTranslations("api");
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: t("kupon.girisGerekli") }, { status: 401 });
  const sinir = hizSiniri(`kupon:${session.user.id}`, 20, 10 * 60_000);
  if (!sinir.izin) {
    return NextResponse.json({ error: t("kupon.cokDeneme", { dk: Math.ceil(sinir.bekle / 60) }) }, { status: 429 });
  }
  const parsed = semaya.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: t("kupon.kodYaz") }, { status: 422 });
  const { kod, priceCode } = parsed.data;
  const role = session.user.role as "CUSTOMER" | "AGENCY" | "ADMIN";
  const agencyId = session.user.agencyId ?? undefined;

  const kayit = fiyatKaydi(priceCode);
  if (!kayit || kayit.feedId !== (await feedBul(role, agencyId))) {
    return NextResponse.json({ error: t("rezervasyon.fiyatSuresiDoldu") }, { status: 409 });
  }
  const s = await kuponDegerlendir({
    kod,
    userId: session.user.id,
    userType: role,
    agencyId,
    girdi: { basePrice: kayit.tutar, hotelCode: kayit.hotelCode, boardType: kayit.boardType, checkIn: kayit.checkIn, checkOut: kayit.checkOut },
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
