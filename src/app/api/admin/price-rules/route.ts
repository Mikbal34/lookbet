import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/prisma";

/** Yalnız tarih gelen bitiş, o günün sonuna kadar geçerli olsun. */
const gunSonu = (s: string) => new Date(s.length === 10 ? `${s}T23:59:59` : s);
import { otelAdlari } from "@/lib/rezervasyon-otel";
import { priceRuleSchema } from "@/lib/validators";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const isActiveParam = searchParams.get("isActive");

    const where: Record<string, unknown> = {};

    if (isActiveParam !== null) {
      where.isActive = isActiveParam === "true";
    }

    const priceRules = await prisma.priceRule.findMany({
      where,
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      include: {
        agency: { select: { id: true, companyName: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    const adlar = await otelAdlari(priceRules.map((x) => x.hotelCode));
    return NextResponse.json({ priceRules: priceRules.map((x) => ({ ...x, hotelName: x.hotelCode ? adlar.get(x.hotelCode) ?? null : null })) });
  } catch (error) {
    console.error("[ADMIN_PRICE_RULES_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = priceRuleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { startDate, endDate, ...rest } = parsed.data;

    const priceRule = await prisma.priceRule.create({
      data: {
        ...rest,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? gunSonu(endDate) : undefined,
        createdById: session.user.id,
      },
      include: {
        agency: { select: { id: true, companyName: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE_PRICE_RULE",
        entity: "PriceRule",
        entityId: priceRule.id,
        newData: parsed.data,
      },
    });

    return NextResponse.json({ priceRule }, { status: 201 });
  } catch (error) {
    console.error("[ADMIN_PRICE_RULES_POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
