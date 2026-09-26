import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/prisma";
import { priceRuleUpdateSchema } from "@/lib/validators";
// Yalnız tarih gelirse Türkiye saatiyle: başlangıç günün başı, bitiş günün sonu.
import { baslangicTarihi, bitisTarihi } from "../../_ortak";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Bu işlem için yönetici yetkisi gerekiyor" }, { status: 403 });
    }

    const { id } = await params;

    const priceRule = await prisma.priceRule.findUnique({
      where: { id },
      include: {
        agency: { select: { id: true, companyName: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    if (!priceRule) {
      return NextResponse.json({ error: "Fiyat kuralı bulunamadı" }, { status: 404 });
    }

    return NextResponse.json({ priceRule });
  } catch (error) {
    console.error("[ADMIN_PRICE_RULES_ID_GET]", error);
    return NextResponse.json({ error: "Sunucu hatası, biraz sonra tekrar dene" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Bu işlem için yönetici yetkisi gerekiyor" }, { status: 403 });
    }

    const { id } = await params;

    const existing = await prisma.priceRule.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json({ error: "Fiyat kuralı bulunamadı" }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    const parsed = priceRuleUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Bilgileri kontrol et", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { startDate, endDate, ...rest } = parsed.data;
    // Güncelleme sonrası hâl: tek acente kuralı acentesiz kalmasın, acente var olsun,
    // tarih sırası bozulmasın (gönderilmeyen alan eskisinden).
    const sonAcente = rest.agencyId !== undefined ? rest.agencyId : existing.agencyId;
    if ((rest.appliesTo ?? existing.appliesTo) === "SPECIFIC_AGENCY" && !sonAcente) {
      return NextResponse.json({ error: "Acente seçin" }, { status: 400 });
    }
    if (rest.agencyId && rest.agencyId !== existing.agencyId && !(await prisma.agency.findUnique({ where: { id: rest.agencyId }, select: { id: true } }))) {
      return NextResponse.json({ error: "Seçilen acente bulunamadı" }, { status: 400 });
    }
    const sonBas = startDate !== undefined ? (startDate ? baslangicTarihi(startDate) : null) : existing.startDate;
    const sonBit = endDate !== undefined ? (endDate ? bitisTarihi(endDate) : null) : existing.endDate;
    if (sonBas && sonBit && sonBas > sonBit) {
      return NextResponse.json({ error: "Bitiş başlangıçtan önce olamaz" }, { status: 400 });
    }

    const updatedPriceRule = await prisma.priceRule.update({
      where: { id },
      data: {
        ...rest,
        ...(startDate !== undefined && { startDate: startDate ? baslangicTarihi(startDate) : null }),
        ...(endDate !== undefined && { endDate: endDate ? bitisTarihi(endDate) : null }),
      },
      include: {
        agency: { select: { id: true, companyName: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE_PRICE_RULE",
        entity: "PriceRule",
        entityId: id,
        oldData: {
          name: existing.name,
          type: existing.type,
          value: existing.value,
          isActive: existing.isActive,
          priority: existing.priority,
        },
        newData: parsed.data,
      },
    });

    return NextResponse.json({ priceRule: updatedPriceRule });
  } catch (error) {
    console.error("[ADMIN_PRICE_RULES_ID_PATCH]", error);
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

    const existing = await prisma.priceRule.findUnique({
      where: { id },
      select: { id: true, name: true, type: true, value: true, isActive: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Fiyat kuralı bulunamadı" }, { status: 404 });
    }

    await prisma.priceRule.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "DELETE_PRICE_RULE",
        entity: "PriceRule",
        entityId: id,
        oldData: existing,
      },
    });

    return NextResponse.json({ message: "Price rule deleted successfully" });
  } catch (error) {
    console.error("[ADMIN_PRICE_RULES_ID_DELETE]", error);
    return NextResponse.json({ error: "Sunucu hatası, biraz sonra tekrar dene" }, { status: 500 });
  }
}
