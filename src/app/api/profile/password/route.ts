import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/prisma";

// Şifre değiştirme — yalnızca şifreyle giren hesaplar (ADMIN / AGENCY).
//
// Müşteriler bilerek şifresiz: hesapları oluşturulurken passwordHash'e
// rastgele bir değer yazılıyor (bkz. findOrCreateCustomer) ve giriş tek
// kullanımlık email koduyla yapılıyor. Onlara şifre belirletmek, arayüzün
// desteklemediği ikinci bir giriş yolu açardı; bu yüzden 403.

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Mevcut şifre gerekli"),
  newPassword: z
    .string()
    .min(8, "Yeni şifre en az 8 karakter olmalı")
    .max(72, "Yeni şifre en fazla 72 karakter olabilir"), // bcrypt sınırı
});

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role === "CUSTOMER") {
      return NextResponse.json(
        {
          error:
            "Müşteri hesapları şifresizdir; giriş tek kullanımlık email koduyla yapılır.",
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = passwordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, passwordHash: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "Mevcut şifre hatalı" },
        { status: 400 }
      );
    }

    if (currentPassword === newPassword) {
      return NextResponse.json(
        { error: "Yeni şifre mevcut şifreyle aynı olamaz" },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await bcrypt.hash(newPassword, 10) },
    });

    // Güvenlik açısından anlamlı bir olay: kaydediliyor. Şifrelerin kendisi
    // veya hash'leri hiçbir şekilde loga yazılmıyor.
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "CHANGE_PASSWORD",
        entity: "User",
        entityId: user.id,
      },
    });

    return NextResponse.json({ message: "Şifreniz güncellendi" });
  } catch (error) {
    console.error("[PROFILE_PASSWORD_PUT]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
