// POST /api/auth/otp/request (public)
// Şifresiz giriş: e-postaya 6 haneli kod gönderir.
//   Body: { email, tur?: "musteri" | "acente" }
// Hesabın var olup olmadığı, rolü ya da kapalı olduğu burada SÖYLENMEZ (e-posta
// listesi çıkarılmasın): kod her geçerli e-postaya gider. Rol uyuşmazlığı ve
// kapalı hesap, kod doğrulandıktan sonra (e-postanın sahibi olduğu kanıtlanınca)
// authorize() içinde bildirilir (lib/auth/auth-options).
// Sınırlar: e-posta başına 30 sn'de 1 ve 15 dk'da 5 kod; IP başına 15 dk'da 20.

import { NextResponse } from "next/server";
import { z } from "zod";
import { createLoginCode, sendLoginCode } from "@/lib/auth/login-code";
import { hizSiniri, istemciIp } from "@/lib/hiz-siniri";

const schema = z.object({
  email: z.string().trim().toLowerCase().email("Geçerli bir email adresi girin").max(254),
  tur: z.enum(["musteri", "acente"]).default("musteri"),
});

const cok = (bekle: number) =>
  NextResponse.json(
    { error: bekle > 90 ? `Çok fazla kod istendi. ${Math.ceil(bekle / 60)} dakika sonra tekrar dene.` : `Yeni kod için ${bekle} saniye bekle.` },
    { status: 429, headers: { "Retry-After": String(bekle) } }
  );

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Geçerli bir email adresi girin" }, { status: 422 });
    }
    const { email } = parsed.data;

    const ip = istemciIp(request.headers);
    const sinirlar: [string, number, number][] = [
      [`otp-istek:e:${email}`, 5, 15 * 60_000],
      [`otp-istek-aralik:${email}`, 1, 30_000],
    ];
    if (ip) sinirlar.unshift([`otp-istek:ip:${ip}`, 20, 15 * 60_000]);
    for (const [anahtar, sinir, pencere] of sinirlar) {
      const s = hizSiniri(anahtar, sinir, pencere);
      if (!s.izin) return cok(s.bekle);
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
    return NextResponse.json({ error: "Kod gönderilirken bir hata oluştu" }, { status: 500 });
  }
}
