// GET /api/admin/agency-applications?status=PENDING|APPROVED|REJECTED|KARAR&page=1&limit=20&search=
// Acente başvurularını listeler (sadece ADMIN).

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/prisma";
import { sayfalama } from "../_ortak";

const VALID_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Bu işlem için yönetici yetkisi gerekiyor" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const { page, limit, skip } = sayfalama(searchParams);
    const statusParam = searchParams.get("status");
    const search = searchParams.get("search") ?? "";

    const where: Record<string, unknown> = {};

    if (statusParam && (VALID_STATUSES as readonly string[]).includes(statusParam)) {
      where.status = statusParam;
    } else if (statusParam === "KARAR") {
      // Karar geçmişi: onaylanan ve reddedilenler.
      where.status = { in: ["APPROVED", "REJECTED"] };
    }

    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: "insensitive" } },
        { taxId: { contains: search, mode: "insensitive" } },
        { contactName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const [applications, total, pendingCount] = await Promise.all([
      prisma.agencyApplication.findMany({
        where,
        skip,
        take: limit,
        orderBy: statusParam === "KARAR" ? { reviewedAt: "desc" } : { createdAt: "desc" },
        include: {
          reviewedBy: { select: { id: true, name: true } },
          agency: { select: { id: true, user: { select: { email: true } } } },
        },
      }),
      prisma.agencyApplication.count({ where }),
      prisma.agencyApplication.count({ where: { status: "PENDING" } }),
    ]);

    return NextResponse.json({
      applications,
      pendingCount,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[ADMIN_AGENCY_APPLICATIONS_GET]", error);
    return NextResponse.json({ error: "Sunucu hatası, biraz sonra tekrar dene" }, { status: 500 });
  }
}
