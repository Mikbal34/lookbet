// Usage:
//   POST /api/auth/register
//   Body (customer): { type: "customer", name, email, password, confirmPassword, phone? }
//   Body (agency):   { type: "agency",   name, email, password, confirmPassword, phone,
//                      companyName, taxId, address?, companyPhone? }

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema, agencyRegisterSchema } from "@/lib/validators";
// UserRole values used as string literals since Prisma v7 doesn't export enum directly from barrel

const BCRYPT_ROUNDS = 12;

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();

    if (
      typeof body !== "object" ||
      body === null ||
      !("type" in body) ||
      (body.type !== "customer" && body.type !== "agency")
    ) {
      return NextResponse.json(
        { error: 'Geçersiz kayıt türü. "customer" veya "agency" olmalı.' },
        { status: 400 }
      );
    }

    const registrationType = (body as { type: "customer" | "agency" }).type;

    // ── Customer registration ───────────────────────────────────────────────
    if (registrationType === "customer") {
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
    }

    // ── Agency registration ─────────────────────────────────────────────────
    const parsed = agencyRegisterSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Doğrulama hatası", details: parsed.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    const { name, email, password, phone, companyName, taxId, address, companyPhone } =
      parsed.data;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: "Bu email adresi zaten kullanılıyor." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Create user + agency atomically so a failure in either rolls back both.
    const user = await prisma.$transaction(async (tx: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      const newUser = await tx.user.create({
        data: {
          name,
          email,
          phone: phone ?? null,
          passwordHash,
          role: "AGENCY",
        },
      });

      await tx.agency.create({
        data: {
          userId: newUser.id,
          companyName,
          taxId,
          address: address ?? null,
          phone: companyPhone ?? null,
          isApproved: false,
        },
      });

      return newUser;
    });

    // Return the user without the password hash.
    const { passwordHash: _omit, ...safeUser } = user;

    return NextResponse.json(
      {
        user: safeUser,
        message:
          "Acente kaydınız alındı. Hesabınız yönetici onayından sonra aktif hale gelecektir.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/auth/register]", error);
    return NextResponse.json(
      { error: "Sunucu hatası. Lütfen daha sonra tekrar deneyin." },
      { status: 500 }
    );
  }
}
