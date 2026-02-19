import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/prisma";
import { priceRuleSchema } from "@/lib/validators";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
      return NextResponse.json({ error: "Price rule not found" }, { status: 404 });
    }

    return NextResponse.json({ priceRule });
  } catch (error) {
    console.error("[ADMIN_PRICE_RULES_ID_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const existing = await prisma.priceRule.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json({ error: "Price rule not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = priceRuleSchema.partial().safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { startDate, endDate, ...rest } = parsed.data;

    const updatedPriceRule = await prisma.priceRule.update({
      where: { id },
      data: {
        ...rest,
        ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
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

    const existing = await prisma.priceRule.findUnique({
      where: { id },
      select: { id: true, name: true, type: true, value: true, isActive: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Price rule not found" }, { status: 404 });
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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
