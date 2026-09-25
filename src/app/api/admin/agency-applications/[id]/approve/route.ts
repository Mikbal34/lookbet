// POST /api/admin/agency-applications/[id]/approve (sadece ADMIN)
// Başvuruyu onaylar: Agency açılır ve başvuru APPROVED'a çekilir, tek
// transaction'da. Başvuru panelden yapıldıysa acentenin kullanıcısı zaten
// var (acente girişinde açıldı), ona bağlanır; eski başvurularda kullanıcı
// açılır. Şifre yok: acente e-posta koduyla girer, panel hemen açılır.
//   Body: { discountRate?, commission?, feedId?, notes? }

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/prisma";
import { applicationApproveSchema } from "@/lib/validators";

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
    const parsed = applicationApproveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Doğrulama hatası", details: parsed.error.flatten().fieldErrors },
        { status: 422 }
      );
    }
    const { discountRate, commission, feedId, notes } = parsed.data;

    const [existingUser, existingAgency] = await Promise.all([
      prisma.user.findUnique({
        where: application.userId ? { id: application.userId } : { email: application.email },
        include: { agency: { select: { id: true } } },
      }),
      prisma.agency.findUnique({ where: { taxId: application.taxId } }),
    ]);
    if (existingUser && (existingUser.role !== "AGENCY" || existingUser.agency)) {
      return NextResponse.json(
        { error: "Bu e-posta başka bir hesaba ya da acenteye bağlı" },
        { status: 409 }
      );
    }
    if (existingAgency) {
      return NextResponse.json(
        { error: "Bu vergi numarası ile kayıtlı bir acente zaten var" },
        { status: 409 }
      );
    }

    const result = await prisma.$transaction(async (tx: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      const user =
        existingUser ??
        (await tx.user.create({
          data: {
            name: application.contactName,
            email: application.email,
            phone: application.phone,
            // Şifresiz hesap: hiçbir şifreyle eşleşmeyen rastgele hash.
            passwordHash: await bcrypt.hash(randomBytes(32).toString("hex"), 10),
            role: "AGENCY",
          },
        }));

      const agency = await tx.agency.create({
        data: {
          userId: user.id,
          companyName: application.companyName,
          taxId: application.taxId,
          taxOffice: application.taxOffice,
          tursabNo: application.tursabNo,
          website: application.website,
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
          title: "Acente başvurunuz onaylandı",
          message: `Tebrikler! ${application.companyName} başvurunuz onaylandı; LookBeds Partner paneliniz açıldı.`,
        },
      });

      return { user, agency };
    });

    return NextResponse.json({
      message: "Başvuru onaylandı, acente paneli açıldı",
      agency: result.agency,
      email: application.email,
    });
  } catch (error) {
    console.error("[ADMIN_AGENCY_APPLICATION_APPROVE]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
