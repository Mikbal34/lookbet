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
import { hizSiniri, istemciIp, sinirdaMi } from "@/lib/hiz-siniri";
import { getTranslations } from "next-intl/server";

const schema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  tur: z.enum(["musteri", "acente"]).default("musteri"),
});

export async function POST(request: Request): Promise<NextResponse> {
  const t = await getTranslations("api.giris");
  const cok = (bekle: number) =>
    NextResponse.json(
      { error: bekle > 90 ? t("cokKodDakika", { dk: Math.ceil(bekle / 60) }) : t("cokKodSaniye", { sn: bekle }) },
      { status: 429, headers: { "Retry-After": String(bekle) } }
    );
  try {
    const body = await request.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: t("gecersizEposta") }, { status: 422 });
    }
    const { email } = parsed.data;

    const ip = istemciIp(request.headers);
    const sinirlar: [string, number, number][] = [
      [`otp-istek:e:${email}`, 5, 15 * 60_000],
      [`otp-istek-aralik:${email}`, 1, 30_000],
    ];
    if (ip) sinirlar.unshift([`otp-istek:ip:${ip}`, 20, 15 * 60_000]);
    // Önce saymadan bak: 30 sn kuralına takılan istek 15 dk'lık hakkı yemesin
    // (art arda denemeler yoksa 15 dk kilitliyordu).
    for (const [anahtar, sinir] of sinirlar) {
      const s = sinirdaMi(anahtar, sinir);
      if (s.dolu) return cok(s.bekle);
    }
    for (const [anahtar, sinir, pencere] of sinirlar) hizSiniri(anahtar, sinir, pencere);

    const code = await createLoginCode(email);
    await sendLoginCode(email, code);

    // Lokal geliştirmede (mailer yoksa) kodu yanıtla da döndür ki test edilebilsin.
    const devMode = !process.env.RESEND_API_KEY && process.env.NODE_ENV !== "production";

    return NextResponse.json({
      message: t("kodGonderildi"),
      ...(devMode ? { devCode: code } : {}),
    });
  } catch (error) {
    console.error("[OTP_REQUEST_POST]", error);
    return NextResponse.json({ error: t("kodGonderilemedi") }, { status: 500 });
  }
}
