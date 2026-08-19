// POST /api/admin/agency-applications/[id]/approve (sadece ADMIN)
// Başvuruyu onaylar ve hesabı OLUŞTURUR: User (AGENCY rolü) + Agency
// tek transaction'da açılır, başvuru APPROVED'a çekilir.
//   Body: { password?, discountRate?, commission?, feedId?, notes? }
// password verilmezse geçici şifre üretilir; yanıtta BİR KEZ döner —
// admin bu bilgiyi acenteye iletmelidir.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/prisma";
import { applicationApproveSchema } from "@/lib/validators";

const BCRYPT_ROUNDS = 12;

type RouteParams = { params: Promise<{ id: string }> };

function generateTempPassword(): string {
  // URL-güvenli, okunabilir 12 karakterlik geçici şifre.
  return randomBytes(9).toString("base64url").slice(0, 12);
}

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
    const parsed = applicationApproveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Doğrulama hatası", details: parsed.error.flatten().fieldErrors },
        { status: 422 }
      );
    }
    const { password, discountRate, commission, feedId, notes } = parsed.data;

    // Başvuru bekleyen sürede aynı email/vergi no ile hesap açılmış olabilir.
    const [existingUser, existingAgency] = await Promise.all([
      prisma.user.findUnique({ where: { email: application.email } }),
      prisma.agency.findUnique({ where: { taxId: application.taxId } }),
    ]);
    if (existingUser) {
      return NextResponse.json(
        { error: "Bu email ile kayıtlı bir hesap zaten var" },
        { status: 409 }
      );
    }
    if (existingAgency) {
      return NextResponse.json(
        { error: "Bu vergi numarası ile kayıtlı bir acente zaten var" },
        { status: 409 }
      );
    }

    const plainPassword = password ?? generateTempPassword();
    const passwordHash = await bcrypt.hash(plainPassword, BCRYPT_ROUNDS);

    const result = await prisma.$transaction(async (tx: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      const user = await tx.user.create({
        data: {
          name: application.contactName,
          email: application.email,
          phone: application.phone,
          passwordHash,
          role: "AGENCY",
        },
      });

      const agency = await tx.agency.create({
        data: {
          userId: user.id,
          companyName: application.companyName,
          taxId: application.taxId,
          address: application.address,
          phone: application.companyPhone,
          discountRate: discountRate ?? 0,
          commission: commission ?? 0,
          feedId: feedId ?? null,
          notes: notes ?? null,
          isApproved: true,
          approvedById: session.user.id,
        },
      });

      await tx.agencyApplication.update({
        where: { id },
        data: {
          status: "APPROVED",
          reviewedById: session.user.id,
          reviewedAt: new Date(),
          agencyId: agency.id,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "APPROVE_AGENCY_APPLICATION",
          entity: "AgencyApplication",
          entityId: id,
          newData: {
            companyName: application.companyName,
            taxId: application.taxId,
            createdUserId: user.id,
            createdAgencyId: agency.id,
          } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        },
      });

      await tx.notification.create({
        data: {
          userId: user.id,
          type: "AGENCY_APPROVED",
          title: "Acente Hesabınız Oluşturuldu",
          message: `Tebrikler! ${application.companyName} acente başvurunuz onaylandı ve hesabınız oluşturuldu.`,
        },
      });

      return { user, agency };
    });

    return NextResponse.json({
      message: "Başvuru onaylandı, acente hesabı oluşturuldu",
      agency: result.agency,
      credentials: {
        email: application.email,
        // Geçici şifre yalnızca bu yanıtta görünür; DB'de sadece hash tutulur.
        tempPassword: plainPassword,
      },
    });
  } catch (error) {
    console.error("[ADMIN_AGENCY_APPLICATION_APPROVE]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
