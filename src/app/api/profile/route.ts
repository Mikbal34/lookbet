import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/prisma";

// Kullanıcının kendi profili. Yalnızca ad ve telefon değiştirilebilir:
// email kimlik olarak kullanılıyor (girişin anahtarı), rol ve isActive ise
// yönetici yetkisinde — bunları buradan değiştirilebilir yapmak yetki
// yükseltme yolu açardı.

const profileSchema = z.object({
  name: z.string().trim().min(2, "Ad en az 2 karakter olmalı").max(100),
  phone: z
    .string()
    .trim()
    .min(7, "Telefon numarası geçersiz")
    .max(20)
    .optional(),
});

const PUBLIC_FIELDS = {
  id: true,
  email: true,
  name: true,
  phone: true,
  role: true,
} as const;

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: PUBLIC_FIELDS,
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("[PROFILE_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = profileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, phone } = parsed.data;

    // Hedef her zaman oturumdaki kullanıcı; gövdeden gelen bir id kabul
    // edilmiyor ki başkasının profili güncellenemesin.
    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: { name, phone: phone ?? null },
      select: PUBLIC_FIELDS,
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error("[PROFILE_PUT]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
