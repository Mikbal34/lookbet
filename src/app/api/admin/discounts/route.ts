import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/prisma";
import { discountSchema } from "@/lib/validators";
import { tarihAlani, tarihOlarak, trGunBasi, trGunSonu } from "@/lib/kampanya-tarih";

// GET  /api/admin/discounts — otomatik indirimler, her birinin kullanımı
//      (onaylı rezervasyon sayısı ve toplam indirim; `bagli`: her durumdan
//      bağlı rezervasyon sayısı — sıfır değilse silinemez, bkz. DELETE) ve
//      müşterilere genel kâr payı (indirim bunu aşarsa satış net fiyatın
//      altına iner).
// POST /api/admin/discounts — yeni indirim.

export const dynamic = "force-dynamic";

async function yonetici() {
  const s = await getServerSession(authOptions);
  return s?.user?.role === "ADMIN" ? s : null;
}

export async function GET() {
  if (!(await yonetici())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const [indirimler, kullanim, karKurali] = await Promise.all([
    prisma.discount.findMany({ orderBy: [{ isActive: "desc" }, { createdAt: "desc" }] }),
    prisma.reservation.groupBy({
      by: ["discountId", "status"],
      where: { discountId: { not: null } },
      _count: { _all: true },
      _sum: { campaignDiscount: true },
    }),
    prisma.priceRule.findFirst({
      where: { isActive: true, appliesTo: "ALL_CUSTOMERS", type: "MARKUP", hotelCode: null, boardType: null },
      orderBy: { priority: "desc" },
      select: { value: true, name: true },
    }),
  ]);
  const k = new Map<string, { adet: number; tutar: number; bagli: number }>();
  for (const x of kullanim) {
    if (!x.discountId) continue;
    const v = k.get(x.discountId) ?? { adet: 0, tutar: 0, bagli: 0 };
    v.bagli += x._count._all;
    if (x.status === "CONFIRMED") {
      v.adet += x._count._all;
      // _sum ondalık (Decimal) gelebilir; sayıya çevrilir.
      v.tutar += Number(x._sum.campaignDiscount ?? 0);
    }
    k.set(x.discountId, v);
  }
  return NextResponse.json({
    indirimler: indirimler.map((d) => ({ ...d, kullanim: k.get(d.id) ?? { adet: 0, tutar: 0, bagli: 0 } })),
    karPayi: karKurali ? { yuzde: karKurali.value, ad: karKurali.name } : null,
  });
}

export async function POST(req: NextRequest) {
  const s = await yonetici();
  if (!s) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = discountSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    const ilk = parsed.error.issues[0];
    return NextResponse.json({ error: ilk?.message ?? "Bilgileri kontrol et", details: parsed.error.flatten().fieldErrors }, { status: 422 });
  }
  const d = parsed.data;
  const indirim = await prisma.discount.create({
    data: {
      ...d,
      locationName: d.hotelCodes.length ? null : d.locationName ?? null,
      description: d.description ?? null,
      stayStart: tarihAlani(d.stayStart, tarihOlarak) ?? null,
      stayEnd: tarihAlani(d.stayEnd, tarihOlarak) ?? null,
      startsAt: tarihAlani(d.startsAt, trGunBasi) ?? null,
      endsAt: tarihAlani(d.endsAt, trGunSonu) ?? null,
      createdById: s.user.id,
    },
  });
  await prisma.auditLog.create({
    data: { userId: s.user.id, action: "CREATE_DISCOUNT", entity: "Discount", entityId: indirim.id, newData: { name: d.name, type: d.type, percent: d.percent } },
  });
  return NextResponse.json({ indirim }, { status: 201 });
}
