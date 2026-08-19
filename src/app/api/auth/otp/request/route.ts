// POST /api/auth/otp/request (public)
// Müşteri passwordless girişi: email'e 6 haneli kod gönderir.
// Hesap yoksa da kod gönderilir — doğrulama sonrası hesap otomatik açılır.
//   Body: { email }

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createLoginCode, sendLoginCode } from "@/lib/auth/login-code";

const schema = z.object({
  email: z.string().email("Geçerli bir email adresi girin"),
});

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Geçerli bir email adresi girin" },
        { status: 422 }
      );
    }

    const email = parsed.data.email.toLowerCase().trim();

    // Şifreli hesaplar (acente/admin) bu akışı kullanamaz — kendi girişleri var.
    const existing = await prisma.user.findUnique({
      where: { email },
      select: { role: true, isActive: true },
    });
    if (existing && existing.role !== "CUSTOMER") {
      return NextResponse.json(
        { error: "Bu hesap için lütfen acente/yönetici girişini kullanın." },
        { status: 403 }
      );
    }
    if (existing && !existing.isActive) {
      return NextResponse.json(
        { error: "Hesabınız devre dışı bırakılmış." },
        { status: 403 }
      );
    }

    const code = await createLoginCode(email);
    await sendLoginCode(email, code);

    // Lokal geliştirmede (mailer yoksa) kodu yanıtla da döndür ki test edilebilsin.
    const devMode = !process.env.RESEND_API_KEY && process.env.NODE_ENV !== "production";

    return NextResponse.json({
      message: "Giriş kodu email adresinize gönderildi",
      ...(devMode ? { devCode: code } : {}),
    });
  } catch (error) {
    console.error("[OTP_REQUEST_POST]", error);
    return NextResponse.json(
      { error: "Kod gönderilirken bir hata oluştu" },
      { status: 500 }
    );
  }
}
