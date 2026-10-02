import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/prisma";
import { commissionUpdateSchema } from "@/lib/validators";
// Yalnız tarih gelirse Türkiye saatiyle: başlangıç günün başı, bitiş günün sonu.
import { baslangicTarihi, bitisTarihi } from "../../_ortak";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Bu işlem için yönetici yetkisi gerekiyor" }, { status: 403 });
    }

    const { id } = await params;

    const existing = await prisma.commission.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json({ error: "Komisyon bulunamadı" }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    const parsed = commissionUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Bilgileri kontrol et", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { startDate, endDate, ...rest } = parsed.data;
    if (rest.agencyId && rest.agencyId !== existing.agencyId) {
      const acente = await prisma.agency.findUnique({ where: { id: rest.agencyId }, select: { id: true } });
      if (!acente) return NextResponse.json({ error: "Seçilen acente bulunamadı" }, { status: 400 });
    }

    const updatedCommission = await prisma.commission.update({
      where: { id },
      data: {
        ...rest,
        ...(startDate !== undefined && { startDate: startDate ? baslangicTarihi(startDate) : null }),
        ...(endDate !== undefined && { endDate: endDate ? bitisTarihi(endDate) : null }),
      },
      include: {
        agency: { select: { id: true, companyName: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE_COMMISSION",
        entity: "Commission",
        entityId: id,
        oldData: {
          agencyId: existing.agencyId,
          type: existing.type,
          value: existing.value,
          isActive: existing.isActive,
        },
        newData: parsed.data,
      },
    });

    return NextResponse.json({ commission: updatedCommission });
  } catch (error) {
    console.error("[ADMIN_COMMISSIONS_ID_PATCH]", error);
    return NextResponse.json({ error: "Sunucu hatası, biraz sonra tekrar dene" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Bu işlem için yönetici yetkisi gerekiyor" }, { status: 403 });
    }

    const { id } = await params;

    const existing = await prisma.commission.findUnique({
      where: { id },
      select: { id: true, agencyId: true, type: true, value: true, isActive: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Komisyon bulunamadı" }, { status: 404 });
    }

    await prisma.commission.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "DELETE_COMMISSION",
        entity: "Commission",
        entityId: id,
        oldData: existing,
      },
    });

    return NextResponse.json({ message: "Commission deleted successfully" });
  } catch (error) {
    console.error("[ADMIN_COMMISSIONS_ID_DELETE]", error);
    return NextResponse.json({ error: "Sunucu hatası, biraz sonra tekrar dene" }, { status: 500 });
  }
}
