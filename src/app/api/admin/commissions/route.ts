import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/prisma";
import { commissionSchema } from "@/lib/validators";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const agencyId = searchParams.get("agencyId");
    const isActiveParam = searchParams.get("isActive");

    const where: Record<string, unknown> = {};

    if (agencyId) {
      where.agencyId = agencyId;
    }

    if (isActiveParam !== null) {
      where.isActive = isActiveParam === "true";
    }

    const commissions = await prisma.commission.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        agency: { select: { id: true, companyName: true } },
      },
    });

    return NextResponse.json({ commissions });
  } catch (error) {
    console.error("[ADMIN_COMMISSIONS_GET]", error);
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
    const parsed = commissionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const agencyExists = await prisma.agency.findUnique({
      where: { id: parsed.data.agencyId },
    });

    if (!agencyExists) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 });
    }

    const { startDate, endDate, ...rest } = parsed.data;

    const commission = await prisma.commission.create({
      data: {
        ...rest,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      },
      include: {
        agency: { select: { id: true, companyName: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE_COMMISSION",
        entity: "Commission",
        entityId: commission.id,
        newData: parsed.data,
      },
    });

    return NextResponse.json({ commission }, { status: 201 });
  } catch (error) {
    console.error("[ADMIN_COMMISSIONS_POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
