import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/prisma";
import { userUpdateSchema } from "@/lib/validators";
import { benzersizIhlali } from "../../_ortak";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
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
            taxId: true,
            address: true,
            phone: true,
            discountRate: true,
            commission: true,
            feedId: true,
            isApproved: true,
            notes: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("[ADMIN_USERS_ID_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const existing = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = userUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Bilgileri kontrol et", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Yönetici kendini kilitlemesin: kendi rolünü düşüremez, kendini kapatamaz.
    if (id === session.user.id && ((parsed.data.role && parsed.data.role !== "ADMIN") || parsed.data.isActive === false)) {
      return NextResponse.json({ error: "Kendi rolünü değiştiremez, hesabını kapatamazsın" }, { status: 400 });
    }

    // E-posta değişiyorsa başka hesapta (büyük/küçük harf fark etmeden) olmasın.
    if (parsed.data.email && parsed.data.email !== existing.email) {
      const baska = await prisma.user.findFirst({
        where: { id: { not: id }, email: { equals: parsed.data.email, mode: "insensitive" } },
        select: { id: true },
      });
      if (baska) return NextResponse.json({ error: "Bu e-posta başka bir hesapta kayıtlı" }, { status: 409 });
    }

    const updatedUser = await prisma.user
      .update({
        where: { id },
        data: parsed.data,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          isActive: true,
          updatedAt: true,
        },
      })
      .catch((e) => {
        // E-posta başka bir hesaptaysa (benzersiz alan).
        if (benzersizIhlali(e)) return null;
        throw e;
      });
    if (!updatedUser) {
      return NextResponse.json({ error: "Bu e-posta başka bir hesapta kayıtlı" }, { status: 409 });
    }

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE_USER",
        entity: "User",
        entityId: id,
        oldData: existing,
        newData: parsed.data,
      },
    });

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error("[ADMIN_USERS_ID_PATCH]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const existing = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (id === session.user.id) {
      return NextResponse.json({ error: "Cannot deactivate your own account" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "SOFT_DELETE_USER",
        entity: "User",
        entityId: id,
        oldData: existing,
        newData: { isActive: false },
      },
    });

    return NextResponse.json({ message: "User deactivated successfully" });
  } catch (error) {
    console.error("[ADMIN_USERS_ID_DELETE]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
