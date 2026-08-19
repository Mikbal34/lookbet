// POST /api/auth/register
// SADECE bireysel (customer) kayıt. Acenteler kendi kendine kayıt OLAMAZ —
// /api/agency-applications üzerinden başvuru yapar, hesabı admin onayıyla açılır.
//   Body: { type: "customer", name, email, password, confirmPassword, phone? }

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validators";

const BCRYPT_ROUNDS = 12;

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();

    if (typeof body !== "object" || body === null || !("type" in body)) {
      return NextResponse.json(
        { error: 'Geçersiz kayıt türü. "customer" olmalı.' },
        { status: 400 }
      );
    }

    if ((body as { type: unknown }).type === "agency") {
      return NextResponse.json(
        {
          error:
            "Acente hesapları doğrudan kayıt ile açılamaz. Lütfen acente başvuru formunu doldurun; başvurunuz onaylanınca hesabınız oluşturulacaktır.",
        },
        { status: 403 }
      );
    }

    if ((body as { type: unknown }).type !== "customer") {
      return NextResponse.json(
        { error: 'Geçersiz kayıt türü. "customer" olmalı.' },
        { status: 400 }
      );
    }

    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Doğrulama hatası", details: parsed.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    const { name, email, password, phone } = parsed.data;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: "Bu email adresi zaten kullanılıyor." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone: phone ?? null,
        passwordHash,
        role: "CUSTOMER",
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error("[REGISTER_POST]", error);
    return NextResponse.json(
      { error: "Kayıt sırasında bir hata oluştu" },
      { status: 500 }
    );
  }
}
