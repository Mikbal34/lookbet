import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/prisma";
import { sayfalama, tarihAraligi } from "../_ortak";

// GET /api/admin/audit-logs ?entity ?userId ?dateFrom ?dateTo ?page ?limit
// dateFrom/dateTo: "YYYY-AA-GG" (Türkiye günü) ya da ISO; geçersizse 400.

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Bu işlem için yönetici yetkisi gerekiyor" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const { page, limit, skip } = sayfalama(searchParams);
    const entity = searchParams.get("entity");
    const userId = searchParams.get("userId");
    const tarih = tarihAraligi(searchParams);
    if (tarih.hata) return tarih.hata;

    const where: Record<string, unknown> = {};

    if (entity) {
      where.entity = entity;
    }

    if (userId) {
      where.userId = userId;
    }

    if (tarih.filtre) {
      where.createdAt = tarih.filtre;
    }

    const [auditLogs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return NextResponse.json({
      auditLogs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[ADMIN_AUDIT_LOGS_GET]", error);
    return NextResponse.json({ error: "Sunucu hatası, biraz sonra tekrar dene" }, { status: 500 });
  }
}
