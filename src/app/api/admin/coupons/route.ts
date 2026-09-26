import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/prisma";
import { couponSchema } from "@/lib/validators";
import { tarihAlani, trGunSonu } from "@/lib/kampanya-tarih";
import { benzersizIhlali } from "../_ortak";

// GET  /api/admin/coupons — kuponlar ve toplam verilen indirim.
// POST /api/admin/coupons — yeni kupon (kod benzersiz, büyük harf).

export const dynamic = "force-dynamic";

async function yonetici() {
  const s = await getServerSession(authOptions);
  return s?.user?.role === "ADMIN" ? s : null;
}

export async function GET() {
  if (!(await yonetici())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const [kuponlar, tutarlar] = await Promise.all([
    prisma.coupon.findMany({ orderBy: [{ isActive: "desc" }, { createdAt: "desc" }] }),
    prisma.couponUse.groupBy({ by: ["couponId"], _sum: { amount: true } }),
  ]);
  // _sum ondalık (Decimal) gelebilir; sayıya çevrilir.
  const t = new Map(tutarlar.map((x) => [x.couponId, Number(x._sum.amount ?? 0)]));
  return NextResponse.json({ kuponlar: kuponlar.map((k) => ({ ...k, toplamIndirim: t.get(k.id) ?? 0 })) });
}

export async function POST(req: NextRequest) {
  const s = await yonetici();
  if (!s) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = couponSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Bilgileri kontrol et" }, { status: 422 });
  }
  const d = parsed.data;
  if (await prisma.coupon.findUnique({ where: { code: d.code } })) {
    return NextResponse.json({ error: "Bu kod zaten var; başka bir kod seç" }, { status: 409 });
  }
  const kupon = await prisma.coupon
    .create({
      data: {
        ...d,
        minAmount: d.minAmount ?? null,
        usageLimit: d.usageLimit ?? null,
        note: d.note ?? null,
        expiresAt: tarihAlani(d.expiresAt, trGunSonu) ?? null,
        createdById: s.user.id,
      },
    })
    .catch((e) => {
      // Aynı kod aynı anda iki kez: ön kontrolü geçen ikincisi burada.
      if (benzersizIhlali(e)) return null;
      throw e;
    });
  if (!kupon) return NextResponse.json({ error: "Bu kod zaten var; başka bir kod seç" }, { status: 409 });
  await prisma.auditLog.create({
    data: { userId: s.user.id, action: "CREATE_COUPON", entity: "Coupon", entityId: kupon.id, newData: { code: d.code, type: d.type, value: d.value } },
  });
  return NextResponse.json({ kupon }, { status: 201 });
}
