// POST /api/agency-applications (public)
// Acente başvuru formu. Hesap OLUŞTURMAZ — başvuruyu kaydeder, admin
// panelde incelenip onaylanınca hesap açılır.
//   Body: { contactName, email, phone, companyName, taxId, address?, companyPhone?, message? }

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { agencyApplicationSchema } from "@/lib/validators";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();

    const parsed = agencyApplicationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Doğrulama hatası", details: parsed.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    const data = parsed.data;

    // Aynı email/vergi no ile bekleyen başvuru varsa tekrar alma.
    const existingApplication = await prisma.agencyApplication.findFirst({
      where: {
        status: "PENDING",
        OR: [{ email: data.email }, { taxId: data.taxId }],
      },
    });
    if (existingApplication) {
      return NextResponse.json(
        { error: "Bu email veya vergi numarası ile bekleyen bir başvuru zaten var." },
        { status: 409 }
      );
    }

    // Email zaten bir hesaba aitse ya da vergi no kayıtlı bir acenteye aitse reddet.
    const [existingUser, existingAgency] = await Promise.all([
      prisma.user.findUnique({ where: { email: data.email } }),
      prisma.agency.findUnique({ where: { taxId: data.taxId } }),
    ]);
    if (existingUser) {
      return NextResponse.json(
        { error: "Bu email adresi ile kayıtlı bir hesap zaten var." },
        { status: 409 }
      );
    }
    if (existingAgency) {
      return NextResponse.json(
        { error: "Bu vergi numarası ile kayıtlı bir acente zaten var." },
        { status: 409 }
      );
    }

    const application = await prisma.agencyApplication.create({
      data: {
        contactName: data.contactName,
        email: data.email,
        phone: data.phone,
        companyName: data.companyName,
        taxId: data.taxId,
        address: data.address ?? null,
        companyPhone: data.companyPhone ?? null,
        message: data.message ?? null,
      },
      select: { id: true, companyName: true, status: true, createdAt: true },
    });

    // Adminlere bildirim düşür (Notification.userId nullable — genel bildirim).
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN", isActive: true },
      select: { id: true },
    });
    if (admins.length > 0) {
      await prisma.notification.createMany({
        data: admins.map((admin: { id: string }) => ({
          userId: admin.id,
          type: "AGENCY_APPLICATION",
          title: "Yeni Acente Başvurusu",
          message: `${data.companyName} acente başvurusu yaptı. Admin panelden inceleyebilirsiniz.`,
        })),
      });
    }

    return NextResponse.json({ application }, { status: 201 });
  } catch (error) {
    console.error("[AGENCY_APPLICATION_POST]", error);
    return NextResponse.json(
      { error: "Başvuru sırasında bir hata oluştu" },
      { status: 500 }
    );
  }
}
