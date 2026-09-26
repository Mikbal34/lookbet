import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/prisma";
import { sayfalama } from "../_ortak";

// GET /api/admin/agencies ?search ?isApproved ?page ?limit
// Acente yalnız başvuru onayıyla açılır (agency-applications/:id/approve).

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Bu işlem için yönetici yetkisi gerekiyor" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const { page, limit, skip } = sayfalama(searchParams);
    const search = searchParams.get("search") ?? "";
    const isApprovedParam = searchParams.get("isApproved");

    const where: Record<string, unknown> = {};

    if (isApprovedParam !== null) {
      where.isApproved = isApprovedParam === "true";
    }

    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: "insensitive" } },
        { taxId: { contains: search, mode: "insensitive" } },
        { user: { name: { contains: search, mode: "insensitive" } } },
        { user: { email: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [agencies, total] = await Promise.all([
      prisma.agency.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: { id: true, name: true, email: true, phone: true, isActive: true },
          },
          approvedBy: {
            select: { id: true, name: true },
          },
          _count: {
            select: { reservations: true },
          },
        },
      }),
      prisma.agency.count({ where }),
    ]);

    // Bu yılın satışı: onaylı rezervasyonların satış fiyatı.
    const yilBasi = new Date(new Date().getFullYear(), 0, 1);
    const satislar = await prisma.reservation.findMany({
      where: { agencyId: { in: agencies.map((a) => a.id) }, status: "CONFIRMED", createdAt: { gte: yilBasi } },
      select: { agencyId: true, totalPrice: true, discountedPrice: true },
    });
    const satis = new Map<string, number>();
    for (const r of satislar) satis.set(r.agencyId!, (satis.get(r.agencyId!) ?? 0) + (r.discountedPrice ?? r.totalPrice));

    return NextResponse.json({
      agencies: agencies.map((a) => ({ ...a, yilSatis: Math.round((satis.get(a.id) ?? 0) * 100) / 100 })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[ADMIN_AGENCIES_GET]", error);
    return NextResponse.json({ error: "Sunucu hatası, biraz sonra tekrar dene" }, { status: 500 });
  }
}
