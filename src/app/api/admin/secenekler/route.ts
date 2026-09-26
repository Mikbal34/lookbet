import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/prisma";

// GET /api/admin/secenekler — yönetim formlarının seçenekleri.
//   (parametresiz) pansiyon türleri ve onaylı, kullanıcı hesabı açık acenteler
//   ?otel=… ad ya da kodla en fazla 8 otel (fiyat kuralı / komisyon formu)

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Bu işlem için yönetici yetkisi gerekiyor" }, { status: 403 });
  }
  const otel = req.nextUrl.searchParams.get("otel")?.trim();
  if (otel !== undefined) {
    if (otel.length < 2) return NextResponse.json({ oteller: [] });
    const oteller = await prisma.hotel.findMany({
      where: {
        isActive: true,
        OR: [{ name: { contains: otel, mode: "insensitive" } }, { hotelCode: { equals: otel } }],
      },
      take: 8,
      orderBy: { name: "asc" },
      select: { hotelCode: true, name: true, location: { select: { name: true, parent: { select: { name: true } } } } },
    });
    return NextResponse.json({
      oteller: oteller.map((o) => ({
        kod: o.hotelCode,
        ad: o.name,
        yer: [o.location?.name, o.location?.parent?.name].filter(Boolean).join(", ") || null,
      })),
    });
  }
  const [pansiyonlar, acenteler] = await Promise.all([
    prisma.boardType.findMany({ orderBy: { name: "asc" }, select: { code: true, name: true } }),
    prisma.agency.findMany({
      // Kapatılmış (kullanıcısı pasif) acente kural/komisyon seçicisinde çıkmasın.
      where: { isApproved: true, user: { isActive: true } },
      orderBy: { companyName: "asc" },
      select: { id: true, companyName: true, commission: true, discountRate: true },
    }),
  ]);
  return NextResponse.json({ pansiyonlar, acenteler });
}
