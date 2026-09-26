// Şifresiz giriş: 6 haneli tek kullanımlık e-posta kodu üretimi, gönderimi ve
// doğrulaması. RESEND_API_KEY tanımlıysa gerçek e-posta gönderilir; tanımlı
// değilse (lokal geliştirme) kod sunucu konsoluna yazılır.
//
// Kaba kuvvete karşı:
//   - kod başına en fazla 5 deneme; hak, karşılaştırmadan ÖNCE atomik düşülür
//     (aynı anda gönderilen denemeler sınırı aşamaz);
//   - e-posta başına 15 dk'da 10, IP başına 30 hatalı deneme: yeni kod istemek
//     bu sayaçları sıfırlamaz;
//   - kod isteme sınırları /api/auth/otp/request'te; nginx'te de IP başına sınır.

import { createHmac, randomInt, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { hizSiniri, sifirla, sinirdaMi } from "@/lib/hiz-siniri";
import { epostaGonder } from "@/lib/eposta";

const CODE_TTL_MS = 10 * 60 * 1000; // 10 dakika
const MAX_ATTEMPTS = 5;
const HATA_PENCERESI_MS = 15 * 60 * 1000;
const EPOSTA_HATA_SINIRI = 10;
const IP_HATA_SINIRI = 30;

export function generateCode(): string {
  return String(randomInt(100000, 1000000));
}

// Kod DB'de HMAC olarak durur: sızan tablo, sunucu sırrı olmadan işe yaramaz.
function kodOzeti(email: string, code: string): string {
  const sir = process.env.NEXTAUTH_SECRET;
  if (!sir) throw new Error("NEXTAUTH_SECRET tanımlı değil");
  return createHmac("sha256", sir).update(`${email}:${code}`).digest("hex");
}

export async function createLoginCode(email: string): Promise<string> {
  const code = generateCode();
  const veri = { codeHash: kodOzeti(email, code), expiresAt: new Date(Date.now() + CODE_TTL_MS), attempts: 0, createdAt: new Date() };
  // E-posta başına tek aktif kod (email tekil): yeni kod eskisinin yerine
  // geçer. Tek ifade (INSERT … ON CONFLICT); aynı anda iki istek yarışırsa
  // ikincisi bir kez daha dener.
  const yaz = () => prisma.loginCode.upsert({ where: { email }, create: { email, ...veri }, update: veri });
  await yaz().catch((e) => {
    if ((e as { code?: string }).code === "P2002") return yaz();
    throw e;
  });
  return code;
}

export async function sendLoginCode(email: string, code: string): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    // Canlıda mailer yoksa sessizce "gönderildi" deme: kimse giriş yapamazdı.
    if (process.env.NODE_ENV === "production") throw new Error("RESEND_API_KEY tanımlı değil; giriş kodu gönderilemiyor");
    // Mailer yok (lokal geliştirme): kodu sunucu loguna yaz.
    console.log(`[LOGIN_CODE] ${email} için giriş kodu: ${code}`);
    return;
  }
  await epostaGonder({
    to: email,
    subject: `LookBeds giriş kodun: ${code}`,
    html: `
        <div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;max-width:420px;margin:0 auto;color:#141414">
          <h2 style="margin:0 0 8px">LookBeds giriş kodun</h2>
          <p style="font-size:34px;font-weight:700;letter-spacing:8px;margin:16px 0;color:#141414">${code}</p>
          <p style="color:#6b6b6b;line-height:1.5">Kod 10 dakika geçerli. Bu girişi sen istemediysen e-postayı yok sayabilirsin.</p>
        </div>`,
    text: `LookBeds giriş kodun: ${code}\nKod 10 dakika geçerli. Bu girişi sen istemediysen e-postayı yok sayabilirsin.`,
  });
}

export type KodSonucu = { gecerli: true } | { gecerli: false; kilitDk?: number };

// Kod doğrulama: başarılıysa kodu tüketir (siler).
export async function verifyLoginCode(email: string, code: string, ip: string | null): Promise<KodSonucu> {
  const eAnahtar = `otp-hata:e:${email}`;
  const ipAnahtar = ip ? `otp-hata:ip:${ip}` : null;
  const kilit = [sinirdaMi(eAnahtar, EPOSTA_HATA_SINIRI), ipAnahtar ? sinirdaMi(ipAnahtar, IP_HATA_SINIRI) : null].find((k) => k?.dolu);
  if (kilit) return { gecerli: false, kilitDk: Math.max(1, Math.ceil(kilit.bekle / 60)) };

  const hata = (): KodSonucu => {
    hizSiniri(eAnahtar, EPOSTA_HATA_SINIRI, HATA_PENCERESI_MS);
    if (ipAnahtar) hizSiniri(ipAnahtar, IP_HATA_SINIRI, HATA_PENCERESI_MS);
    return { gecerli: false };
  };

  if (!/^\d{6}$/.test(code)) return hata();

  const record = await prisma.loginCode.findFirst({
    where: { email },
    orderBy: { createdAt: "desc" },
  });
  if (!record) return hata();

  if (record.expiresAt < new Date() || record.attempts >= MAX_ATTEMPTS) {
    await prisma.loginCode.delete({ where: { id: record.id } }).catch(() => {});
    return hata();
  }

  // Hakkı karşılaştırmadan önce düş: aynı anda gelen denemelerin her biri
  // ayrı bir hak harcar, "attempts < 5" okumasını birlikte geçemezler.
  const hak = await prisma.loginCode.updateMany({
    where: { id: record.id, attempts: { lt: MAX_ATTEMPTS } },
    data: { attempts: { increment: 1 } },
  });
  if (hak.count === 0) return hata();

  const beklenen = Buffer.from(record.codeHash, "hex");
  const gelen = Buffer.from(kodOzeti(email, code), "hex");
  if (beklenen.length !== gelen.length || !timingSafeEqual(beklenen, gelen)) return hata();

  // Tek kullanımlık: silme başarısızsa (aynı anda iki doğru deneme) ikincisi reddedilir.
  const silinen = await prisma.loginCode.deleteMany({ where: { id: record.id } });
  if (silinen.count === 0) return hata();
  sifirla(eAnahtar);
  return { gecerli: true };
}

/** authorize() içinde: geçersiz kodda kullanıcıya gösterilecek hata. */
export function kodHatasi(s: Extract<KodSonucu, { gecerli: false }>): Error {
  return new Error(
    s.kilitDk
      ? `Çok fazla hatalı deneme. ${s.kilitDk} dakika sonra tekrar dene.`
      : "Kod hatalı veya süresi dolmuş"
  );
}
