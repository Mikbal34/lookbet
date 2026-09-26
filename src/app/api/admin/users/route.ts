import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/prisma";
import { userCreateSchema } from "@/lib/validators";
import { benzersizIhlali, sayfalama } from "../_ortak";

// GET  /api/admin/users ?search ?role ?page ?limit
// POST /api/admin/users { name, email, role? } — şifre yok: giriş e-posta
//      koduyla. passwordHash'e hiçbir şifreyle eşleşmeyen rastgele hash
//      yazılır (auth-options'taki gibi; gönderilen password yok sayılır).

const rastgeleHash = () => bcrypt.hash(randomBytes(32).toString("hex"), 10);

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const parsed = userCreateSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Bilgileri kontrol et", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    // E-posta şemada küçük harfe çevrildi; giriş de küçük harfle arar.
    const { name, email, role } = parsed.data;

    // Eski kayıtlarda büyük harfli e-posta kalmış olabilir: büyük/küçük harf duyarsız bak.
    const existing = await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } }, select: { id: true } });
    if (existing) {
      return NextResponse.json({ error: "Bu e-posta başka bir hesapta kayıtlı" }, { status: 409 });
    }

    const user = await prisma.user
      .create({
        data: {
          name,
          email,
          passwordHash: await rastgeleHash(),
          role,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      })
      .catch((e) => {
        if (benzersizIhlali(e)) return null;
        throw e;
      });
    if (!user) {
      return NextResponse.json({ error: "Bu e-posta başka bir hesapta kayıtlı" }, { status: 409 });
    }

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE_USER",
        entity: "User",
        entityId: user.id,
        newData: { name, email, role: user.role },
      },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error("[ADMIN_USERS_POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
