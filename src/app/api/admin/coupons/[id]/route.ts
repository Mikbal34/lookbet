import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/prisma";
import { couponUpdateSchema } from "@/lib/validators";
import { tarihAlani, trGunSonu } from "@/lib/kampanya-tarih";
import { benzersizIhlali } from "../../_ortak";

// PATCH  /api/admin/coupons/:id — yalnız gönderilen alanlar değişir.
// DELETE /api/admin/coupons/:id — kullanılmış kupon silinmez; durdurulur.

type P = { params: Promise<{ id: string }> };

async function yonetici() {
  const s = await getServerSession(authOptions);
  return s?.user?.role === "ADMIN" ? s : null;
}

export async function PATCH(req: NextRequest, { params }: P) {
  const s = await yonetici();
  if (!s) return NextResponse.json({ error: "Bu işlem için yönetici yetkisi gerekiyor" }, { status: 403 });
  const { id } = await params;
  const eski = await prisma.coupon.findUnique({ where: { id } });
  if (!eski) return NextResponse.json({ error: "Kupon bulunamadı" }, { status: 404 });
  const parsed = couponUpdateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Bilgileri kontrol et" }, { status: 422 });
  }
  const { expiresAt, ...geri } = parsed.data;
  if (geri.code && geri.code !== eski.code && (await prisma.coupon.findUnique({ where: { code: geri.code } }))) {
    return NextResponse.json({ error: "Bu kod zaten var" }, { status: 409 });
  }
  const kupon = await prisma.coupon
    .update({ where: { id }, data: { ...geri, expiresAt: tarihAlani(expiresAt, trGunSonu) } })
    .catch((e) => {
      if (benzersizIhlali(e)) return null;
      throw e;
    });
  if (!kupon) return NextResponse.json({ error: "Bu kod zaten var" }, { status: 409 });
  await prisma.auditLog.create({
    data: {
      userId: s.user.id,
      action: "UPDATE_COUPON",
      entity: "Coupon",
      entityId: id,
      oldData: { code: eski.code, value: eski.value, isActive: eski.isActive },
      newData: parsed.data as object,
    },
  });
  return NextResponse.json({ kupon });
}

export async function DELETE(_req: NextRequest, { params }: P) {
  const s = await yonetici();
  if (!s) return NextResponse.json({ error: "Bu işlem için yönetici yetkisi gerekiyor" }, { status: 403 });
  const { id } = await params;
  const kupon = await prisma.coupon.findUnique({ where: { id } });
  if (!kupon) return NextResponse.json({ error: "Kupon bulunamadı" }, { status: 404 });
  // İptal edilen rezervasyon da kupona bağlı kalır (kullanım sayısı düşse de):
  // bağlı rezervasyon varsa silinmez, durdurulur.
  const bagli = await prisma.reservation.count({ where: { couponId: id } });
  if (bagli > 0) {
    return NextResponse.json({ error: `${bagli} rezervasyonda kullanıldığı için silinemez; durdurabilirsin.` }, { status: 409 });
  }
  await prisma.coupon.delete({ where: { id } });
  await prisma.auditLog.create({
    data: { userId: s.user.id, action: "DELETE_COUPON", entity: "Coupon", entityId: id, oldData: { code: kupon.code } },
  });
  return NextResponse.json({ ok: true });
}
