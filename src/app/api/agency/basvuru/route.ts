// POST /api/agency/basvuru (acente kullanıcısı, onaysız)
// Panelden bir kez yapılan acente başvurusu. E-posta oturumdan gelir (kodla
// doğrulanmış). Başvuru admin panele düşer; onaylanınca panel açılır.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/prisma";
import { acenteDurumu } from "@/lib/acente-durumu";
import { acenteBasvuruSchema } from "@/lib/validators";

const bosa = (v?: string) => (v?.trim() ? v.trim() : null);

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "AGENCY" || !session.user.email) {
      return NextResponse.json({ error: "Acente girişi gerekli" }, { status: 401 });
    }

    const durum = await acenteDurumu(session.user.id, session.user.email);
    if (durum.tur !== "basvuru") {
      return NextResponse.json({ error: "Başvurun zaten alındı" }, { status: 409 });
    }

    const parsed = acenteBasvuruSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Bilgileri kontrol et", details: parsed.error.flatten().fieldErrors },
        { status: 422 }
      );
    }
    const d = parsed.data;

    const [kayitliAcente, bekleyen] = await Promise.all([
      prisma.agency.findUnique({ where: { taxId: d.taxId }, select: { id: true } }),
      prisma.agencyApplication.findFirst({ where: { taxId: d.taxId, status: "PENDING" }, select: { id: true } }),
    ]);
    if (kayitliAcente || bekleyen) {
      return NextResponse.json(
        { error: "Bu vergi numarasıyla kayıtlı bir acente ya da bekleyen bir başvuru var", details: { taxId: ["Bu vergi no kullanımda"] } },
        { status: 409 }
      );
    }

    const basvuru = await prisma.$transaction(async (tx) => {
      const b = await tx.agencyApplication.create({
        data: {
          userId: session.user.id,
          email: session.user.email!,
          contactName: d.contactName,
          phone: d.phone,
          companyName: d.companyName,
          taxId: d.taxId,
          taxOffice: d.taxOffice,
          tursabNo: bosa(d.tursabNo),
          website: bosa(d.website),
          address: d.address,
          companyPhone: bosa(d.companyPhone),
          message: bosa(d.message),
        },
        select: { id: true, companyName: true, createdAt: true },
      });
      // Girişte e-postanın başından türetilen adı yetkilinin adıyla değiştir.
      await tx.user.update({ where: { id: session.user.id }, data: { name: d.contactName, phone: d.phone } });
      const adminler = await tx.user.findMany({ where: { role: "ADMIN", isActive: true }, select: { id: true } });
      if (adminler.length) {
        await tx.notification.createMany({
          data: adminler.map((a) => ({
            userId: a.id,
            type: "AGENCY_APPLICATION",
            title: "Yeni Acente Başvurusu",
            message: `${d.companyName} acente başvurusu yaptı. Admin panelden inceleyebilirsiniz.`,
          })),
        });
      }
      return b;
    });

    return NextResponse.json({ basvuru }, { status: 201 });
  } catch (error) {
    console.error("[AGENCY_BASVURU_POST]", error);
    return NextResponse.json({ error: "Başvuru gönderilemedi, tekrar dene" }, { status: 500 });
  }
}
