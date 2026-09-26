import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/prisma";
import { sayfalama } from "../_ortak";

// GET /api/admin/users ?search ?role ?page ?limit
// Kullanıcılar kendi girişleriyle (e-posta kodu) açılır; rol ve kapatma
// PATCH /api/admin/users/:id ile.

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Bu işlem için yönetici yetkisi gerekiyor" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const { page, limit, skip } = sayfalama(searchParams);
    const search = searchParams.get("search") ?? "";
    const role = searchParams.get("role") ?? "";

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    if (role && ["CUSTOMER", "AGENCY", "ADMIN"].includes(role)) {
      where.role = role;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          agency: {
            select: {
              id: true,
              companyName: true,
              isApproved: true,
            },
          },
          _count: { select: { reservations: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);
    const roller = await prisma.user.groupBy({ by: ["role"], _count: { _all: true } });
    const rolSayilari = Object.fromEntries(roller.map((r) => [r.role, r._count._all]));

    return NextResponse.json({
      users,
      rolSayilari,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[ADMIN_USERS_GET]", error);
    return NextResponse.json({ error: "Sunucu hatası, biraz sonra tekrar dene" }, { status: 500 });
  }
}
