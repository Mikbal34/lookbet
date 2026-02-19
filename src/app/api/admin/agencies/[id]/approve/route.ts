import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/prisma";
import { agencyApproveSchema } from "@/lib/validators";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const agency = await prisma.agency.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 });
    }

    if (agency.isApproved) {
      return NextResponse.json({ error: "Agency is already approved" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = agencyApproveSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { discountRate, commission, feedId, notes } = parsed.data;

    const updateData: Record<string, unknown> = {
      isApproved: true,
      approvedById: session.user.id,
    };

    if (discountRate !== undefined) updateData.discountRate = discountRate;
    if (commission !== undefined) updateData.commission = commission;
    if (feedId !== undefined) updateData.feedId = feedId;
    if (notes !== undefined) updateData.notes = notes;

    const updatedAgency = await prisma.agency.update({
      where: { id },
      data: updateData,
    });

    // Create audit log and notification in parallel
    await Promise.all([
      prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: "APPROVE_AGENCY",
          entity: "Agency",
          entityId: id,
          oldData: {
            isApproved: false,
            discountRate: agency.discountRate,
            commission: agency.commission,
            feedId: agency.feedId,
          },
          newData: updateData as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        },
      }),
      prisma.notification.create({
        data: {
          userId: agency.user.id,
          type: "AGENCY_APPROVED",
          title: "Acente Hesabiniz Onaylandi",
          message: `Tebrikler! ${agency.companyName} acente hesabiniz onaylandi. Artik rezervasyon yapabilirsiniz.`,
        },
      }),
    ]);

    return NextResponse.json({
      agency: updatedAgency,
      message: "Agency approved successfully",
    });
  } catch (error) {
    console.error("[ADMIN_AGENCIES_APPROVE_POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
