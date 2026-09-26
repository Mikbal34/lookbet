// GET /api/agency/dashboard (sadece AGENCY)
// Acentenin şirket ve anlaşma bilgileri (Şirket sayfası, üst çubuk). Satış ve
// komisyon rakamları /api/agency/kazanc'ta (girişi o ayda olan onaylı
// rezervasyonlar); rezervasyon listesi /api/reservations'ta.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "AGENCY" || !session.user.agencyId) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
    }

    const agency = await prisma.agency.findUnique({
      where: { id: session.user.agencyId },
      select: {
        companyName: true,
        taxId: true,
        taxOffice: true,
        tursabNo: true,
        website: true,
        address: true,
        phone: true,
        discountRate: true,
        commission: true,
        isApproved: true,
        createdAt: true,
      },
    });
    if (!agency) {
      return NextResponse.json({ error: "Acente bulunamadı" }, { status: 404 });
    }

    return NextResponse.json({ agency });
  } catch (error) {
    console.error("[AGENCY_DASHBOARD_GET]", error);
    return NextResponse.json({ error: "Sunucu hatası, biraz sonra tekrar dene" }, { status: 500 });
  }
}
