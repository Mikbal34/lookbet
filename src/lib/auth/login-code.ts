// Passwordless müşteri girişi: 6 haneli tek kullanımlık email kodu üretimi,
// gönderimi ve doğrulaması. RESEND_API_KEY tanımlıysa gerçek email gönderilir;
// tanımlı değilse (lokal geliştirme) kod sunucu konsoluna yazılır.

import { randomInt } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const CODE_TTL_MS = 10 * 60 * 1000; // 10 dakika
const MAX_ATTEMPTS = 5;

export function generateCode(): string {
  return String(randomInt(100000, 1000000));
}

export async function createLoginCode(email: string): Promise<string> {
  const code = generateCode();
  const codeHash = bcrypt.hashSync(code, 10);

  // Aynı email'in önceki kodlarını geçersiz kıl — her an tek aktif kod.
  await prisma.loginCode.deleteMany({ where: { email } });
  await prisma.loginCode.create({
    data: {
      email,
      codeHash,
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
    },
  });

  return code;
}

export async function sendLoginCode(email: string, code: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    // Lokal geliştirme: mailer yok, kodu sunucu loguna yaz.
    console.log(`[LOGIN_CODE] ${email} için giriş kodu: ${code}`);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "Lookbet <noreply@lookbet.com>",
      to: [email],
      subject: `Lookbet giriş kodunuz: ${code}`,
      html: `
        <div style="font-family:sans-serif;max-width:420px;margin:0 auto">
          <h2 style="color:#111">Lookbet giriş kodunuz</h2>
          <p style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#2563eb">${code}</p>
          <p style="color:#555">Bu kod 10 dakika geçerlidir. Siz talep etmediyseniz bu emaili yok sayın.</p>
        </div>`,
    }),
  });

  if (!res.ok) {
    throw new Error(`Email gönderilemedi: ${res.status}`);
  }
}

// Kod doğrulama: başarılıysa kodu tüketir (siler) ve true döner.
export async function verifyLoginCode(
  email: string,
  code: string
): Promise<boolean> {
  const record = await prisma.loginCode.findFirst({
    where: { email },
    orderBy: { createdAt: "desc" },
  });

  if (!record) return false;

  if (record.expiresAt < new Date() || record.attempts >= MAX_ATTEMPTS) {
    await prisma.loginCode.delete({ where: { id: record.id } }).catch(() => {});
    return false;
  }

  const valid = bcrypt.compareSync(code, record.codeHash);

  if (!valid) {
    await prisma.loginCode.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    return false;
  }

  await prisma.loginCode.delete({ where: { id: record.id } }).catch(() => {});
  return true;
}
