// POST /api/admin/agency-applications/[id]/reject (sadece ADMIN)
// Başvuruyu reddeder. Hesap oluşturulmaz.
//   Body: { reason? }

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/prisma";
import { applicationRejectSchema } from "@/lib/validators";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const application = await prisma.agencyApplication.findUnique({ where: { id } });
    if (!application) {
      return NextResponse.json({ error: "Başvuru bulunamadı" }, { status: 404 });
    }
    if (application.status !== "PENDING") {
      return NextResponse.json(
        { error: "Bu başvuru zaten sonuçlandırılmış" },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const parsed = applicationRejectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Doğrulama hatası", details: parsed.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    const updated = await prisma.agencyApplication.update({
      where: { id },
      data: {
        status: "REJECTED",
        rejectionReason: parsed.data.reason ?? null,
        reviewedById: session.user.id,
        reviewedAt: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "REJECT_AGENCY_APPLICATION",
        entity: "AgencyApplication",
        entityId: id,
        newData: {
          companyName: application.companyName,
          reason: parsed.data.reason ?? null,
        } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      },
    });

    return NextResponse.json({ application: updated, message: "Başvuru reddedildi" });
  } catch (error) {
    console.error("[ADMIN_AGENCY_APPLICATION_REJECT]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
