import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/prisma";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const agency = await prisma.agency.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
        },
        approvedBy: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { reservations: true, commissions: true, priceRules: true },
        },
      },
    });

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 });
    }

    return NextResponse.json({ agency });
  } catch (error) {
    console.error("[ADMIN_AGENCIES_ID_GET]", error);
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

    const existing = await prisma.agency.findUnique({
      where: { id },
      select: {
        id: true,
        companyName: true,
        discountRate: true,
        commission: true,
        feedId: true,
        notes: true,
        isApproved: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 });
    }

    const body = await req.json();
    const { discountRate, commission, feedId, notes } = body;

    const updateData: Record<string, unknown> = {};
    if (discountRate !== undefined) updateData.discountRate = discountRate;
    if (commission !== undefined) updateData.commission = commission;
    if (feedId !== undefined) updateData.feedId = feedId;
    if (notes !== undefined) updateData.notes = notes;

    const updatedAgency = await prisma.agency.update({
      where: { id },
      data: updateData,
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE_AGENCY",
        entity: "Agency",
        entityId: id,
        oldData: existing as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        newData: updateData as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      },
    });

    return NextResponse.json({ agency: updatedAgency });
  } catch (error) {
    console.error("[ADMIN_AGENCIES_ID_PATCH]", error);
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

    const agency = await prisma.agency.findUnique({
      where: { id },
      select: { id: true, userId: true, companyName: true, isApproved: true },
    });

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 });
    }

    // Soft delete: deactivate the agency's user account
    await prisma.user.update({
      where: { id: agency.userId },
      data: { isActive: false },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "SOFT_DELETE_AGENCY",
        entity: "Agency",
        entityId: id,
        oldData: agency,
        newData: { isActive: false },
      },
    });

    return NextResponse.json({ message: "Agency user deactivated successfully" });
  } catch (error) {
    console.error("[ADMIN_AGENCIES_ID_DELETE]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
