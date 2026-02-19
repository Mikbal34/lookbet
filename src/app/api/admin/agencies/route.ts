import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
    const search = searchParams.get("search") ?? "";
    const isApprovedParam = searchParams.get("isApproved");

    const skip = (page - 1) * limit;

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

    return NextResponse.json({
      agencies,
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

    const body = await req.json();
    const {
      userId,
      companyName,
      taxId,
      address,
      phone,
      discountRate,
      commission,
      feedId,
      notes,
      isApproved,
    } = body;

    if (!userId || !companyName || !taxId) {
      return NextResponse.json(
        { error: "userId, companyName and taxId are required" },
        { status: 400 }
      );
    }

    const userExists = await prisma.user.findUnique({ where: { id: userId } });
    if (!userExists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const taxIdExists = await prisma.agency.findUnique({ where: { taxId } });
    if (taxIdExists) {
      return NextResponse.json({ error: "Tax ID already registered" }, { status: 409 });
    }

    const agency = await prisma.agency.create({
      data: {
        userId,
        companyName,
        taxId,
        address,
        phone,
        discountRate: discountRate ?? 0,
        commission: commission ?? 0,
        feedId,
        notes,
        isApproved: isApproved ?? false,
        approvedById: isApproved ? session.user.id : undefined,
      },
    });

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
