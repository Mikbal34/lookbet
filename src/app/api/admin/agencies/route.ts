import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/prisma";
import { agencyCreateSchema } from "@/lib/validators";
import { benzersizIhlali, sayfalama } from "../_ortak";

// GET  /api/admin/agencies ?search ?isApproved ?page ?limit
// POST /api/admin/agencies — var olan, etkin, rolü acente ve henüz acentesi
//      olmayan kullanıcıya acente açar (başvuru dışı yol; yalnız API).

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const parsed = agencyCreateSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Bilgileri kontrol et", details: parsed.error.flatten().fieldErrors },
        { status: 422 }
      );
    }
    const { userId, companyName, taxId, address, phone, discountRate, commission, feedId, notes, isApproved } = parsed.data;

    // Acente yalnız etkin, rolü acente ve henüz acentesi olmayan kullanıcıya açılır.
    const kullanici = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, isActive: true, agency: { select: { id: true } } },
    });
    if (!kullanici) {
      return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });
    }
    if (!kullanici.isActive) {
      return NextResponse.json({ error: "Kullanıcı hesabı kapalı; önce hesabı aç" }, { status: 422 });
    }
    if (kullanici.role !== "AGENCY") {
      return NextResponse.json({ error: "Kullanıcının rolü acente değil" }, { status: 422 });
    }
    if (kullanici.agency) {
      return NextResponse.json({ error: "Bu kullanıcının zaten bir acentesi var" }, { status: 409 });
    }

    const taxIdExists = await prisma.agency.findUnique({ where: { taxId }, select: { id: true } });
    if (taxIdExists) {
      return NextResponse.json({ error: "Bu vergi numarasıyla kayıtlı bir acente zaten var" }, { status: 409 });
    }

    const agency = await prisma.agency
      .create({
        data: {
          userId,
          companyName,
          taxId,
          address: address ?? null,
          phone: phone ?? null,
          discountRate,
          commission,
          feedId: feedId ?? null,
          notes: notes ?? null,
          isApproved,
          approvedById: isApproved ? session.user.id : undefined,
        },
      })
      .catch((e) => {
        // Aynı kullanıcıya ya da vergi noya aynı anda ikinci acente.
        if (benzersizIhlali(e)) return null;
        throw e;
      });
    if (!agency) {
      return NextResponse.json({ error: "Bu kullanıcıya ya da vergi numarasına bağlı bir acente zaten var" }, { status: 409 });
    }

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE_AGENCY",
        entity: "Agency",
        entityId: agency.id,
        newData: { companyName, taxId, userId },
      },
    });

    return NextResponse.json({ agency }, { status: 201 });
  } catch (error) {
    console.error("[ADMIN_AGENCIES_POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
