import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/prisma";
import { discountUpdateSchema } from "@/lib/validators";
import { tarihAlani, tarihOlarak, trGunBasi, trGunSonu } from "@/lib/kampanya-tarih";

// PATCH  /api/admin/discounts/:id — yalnız gönderilen alanlar değişir.
// DELETE /api/admin/discounts/:id — kullanılmış indirim silinmez (rapor ve
//        rezervasyon geçmişi için); durdurulur.

type P = { params: Promise<{ id: string }> };

async function yonetici() {
  const s = await getServerSession(authOptions);
  return s?.user?.role === "ADMIN" ? s : null;
}

export async function PATCH(req: NextRequest, { params }: P) {
  const s = await yonetici();
  if (!s) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const eski = await prisma.discount.findUnique({ where: { id } });
  if (!eski) return NextResponse.json({ error: "İndirim bulunamadı" }, { status: 404 });
  const parsed = discountUpdateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Bilgileri kontrol et" }, { status: 422 });
  }
  const { stayStart, stayEnd, startsAt, endsAt, ...geri } = parsed.data;
  const indirim = await prisma.discount.update({
    where: { id },
    data: {
      ...geri,
      ...(geri.hotelCodes?.length ? { locationName: null } : {}),
      stayStart: tarihAlani(stayStart, tarihOlarak),
      stayEnd: tarihAlani(stayEnd, tarihOlarak),
      startsAt: tarihAlani(startsAt, trGunBasi),
      endsAt: tarihAlani(endsAt, trGunSonu),
    },
  });
  await prisma.auditLog.create({
    data: {
      userId: s.user.id,
      action: "UPDATE_DISCOUNT",
      entity: "Discount",
      entityId: id,
      oldData: { name: eski.name, percent: eski.percent, isActive: eski.isActive, showcase: eski.showcase },
      newData: parsed.data as object,
    },
  });
  return NextResponse.json({ indirim });
}

export async function DELETE(_req: NextRequest, { params }: P) {
  const s = await yonetici();
  if (!s) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const kullanim = await prisma.reservation.count({ where: { discountId: id } });
  if (kullanim > 0) {
    return NextResponse.json({ error: `${kullanim} rezervasyonda kullanıldığı için silinemez; durdurabilirsin.` }, { status: 409 });
  }
  const silinen = await prisma.discount.delete({ where: { id } }).catch(() => null);
  if (!silinen) return NextResponse.json({ error: "İndirim bulunamadı" }, { status: 404 });
  await prisma.auditLog.create({
    data: { userId: s.user.id, action: "DELETE_DISCOUNT", entity: "Discount", entityId: id, oldData: { name: silinen.name, percent: silinen.percent } },
  });
  return NextResponse.json({ ok: true });
}
