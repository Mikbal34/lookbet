import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/prisma";
import { commissionSchema } from "@/lib/validators";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const existing = await prisma.commission.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json({ error: "Commission not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = commissionSchema.partial().safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { startDate, endDate, ...rest } = parsed.data;

    const updatedCommission = await prisma.commission.update({
      where: { id },
      data: {
        ...rest,
        ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const existing = await prisma.commission.findUnique({
      where: { id },
      select: { id: true, agencyId: true, type: true, value: true, isActive: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Commission not found" }, { status: 404 });
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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
