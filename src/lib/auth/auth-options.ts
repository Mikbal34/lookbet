import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import AppleProvider from "next-auth/providers/apple";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { kodHatasi, verifyLoginCode } from "@/lib/auth/login-code";
import { istemciIp } from "@/lib/hiz-siniri";
import { getTranslations } from "next-intl/server";

// Hesaplar şifresiz (e-posta kodu); passwordHash sütunu zorunlu olduğu için
// hiçbir şifreyle eşleşmeyecek rastgele bir hash yazılır.
const rastgeleHash = () => bcrypt.hashSync(randomBytes(32).toString("hex"), 10);

// OAuth veya OTP ile gelen müşteriyi bul/oluştur (passwordless hesap).
async function findOrCreateCustomer(email: string, name?: string | null) {
  const existing = await prisma.user.findUnique({
    where: { email },
    include: { agency: true },
  });
  if (existing) return existing;

  return prisma.user.create({
    data: {
      email,
      name: name || email.split("@")[0],
      passwordHash: rastgeleHash(),
      role: "CUSTOMER",
    },
    include: { agency: true },
  });
}

const HESAP_KAPALI = "Hesap kapalı ya da silinmiş";

// Oturum başına DB okuması: aynı kullanıcı için 15 sn önbellek (her API
// isteği ve useSession yoklaması DB'ye gitmesin). Hesabı değiştiren yönetim
// işlemleri (onay, rol, kapatma) hesapOnbelleginiSil ile hemen etkili olur;
// başka yoldan değişiklik en geç 15 sn'de yansır.
type HesapDurumu = { name: string; role: string; isActive: boolean; agency: { id: string; isApproved: boolean } | null };
const hesapOnbellegi = new Map<string, { zaman: number; deger: HesapDurumu | null }>();

/** Kullanıcının oturum bilgisi bir sonraki istekte DB'den okunsun. */
export function hesapOnbelleginiSil(userId: string) {
  hesapOnbellegi.delete(userId);
}
async function hesapDurumu(userId: string): Promise<HesapDurumu | null> {
  const simdi = Date.now();
  const o = hesapOnbellegi.get(userId);
  if (o && simdi - o.zaman < 15_000) return o.deger;
  const deger = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, role: true, isActive: true, agency: { select: { id: true, isApproved: true } } },
  });
  if (hesapOnbellegi.size > 5000) hesapOnbellegi.clear();
  hesapOnbellegi.set(userId, { zaman: simdi, deger });
  return deger;
}

const providers: NextAuthOptions["providers"] = [
  // Müşteri girişi: email + tek kullanımlık kod (şifresiz).
  // Hesap yoksa doğrulama sonrası otomatik oluşturulur.
  CredentialsProvider({
    id: "email-otp",
    name: "Email Kod",
    credentials: {
      email: { label: "Email", type: "email" },
      code: { label: "Kod", type: "text" },
    },
    async authorize(credentials, req) {
      const t = await getTranslations("api.giris");
      if (!credentials?.email || !credentials?.code) {
        throw new Error(t("epostaVeKodGerekli"));
      }

      const email = credentials.email.toLowerCase().trim();
      const sonuc = await verifyLoginCode(email, credentials.code.trim(), istemciIp(req?.headers));
      if (!sonuc.gecerli) throw await kodHatasi(sonuc);

      // Rol ve kapalı hesap mesajları kod doğrulandıktan sonra: e-postanın
      // sahibi olduğu kanıtlanmadan hesabın varlığı söylenmez.
      const user = await findOrCreateCustomer(email);

      if (!user.isActive) {
        throw new Error(t("hesapKapali"));
      }
      if (user.role !== "CUSTOMER") {
        throw new Error(t("acenteGirisiKullan"));
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        agencyId: null,
      };
    },
  }),

  // Acente ve yönetici girişi: e-posta + tek kullanımlık kod (şifresiz).
  // Yeni e-postada acente hesabı açılır; panel, başvuru onaylanana kadar
  // kilitlidir (bkz. lib/acente-durumu). Müşteri hesabı bu yoldan girmez.
  CredentialsProvider({
    id: "acente-otp",
    name: "Acente Kod",
    credentials: {
      email: { label: "Email", type: "email" },
      code: { label: "Kod", type: "text" },
    },
    async authorize(credentials, req) {
      const t = await getTranslations("api.giris");
      if (!credentials?.email || !credentials?.code) {
        throw new Error(t("epostaVeKodGerekli"));
      }
      const email = credentials.email.toLowerCase().trim();
      const sonuc = await verifyLoginCode(email, credentials.code.trim(), istemciIp(req?.headers));
      if (!sonuc.gecerli) throw await kodHatasi(sonuc);
      const user =
        (await prisma.user.findUnique({ where: { email }, include: { agency: true } })) ??
        (await prisma.user.create({
          data: {
            email,
            name: email.split("@")[0],
            passwordHash: rastgeleHash(),
            role: "AGENCY",
          },
          include: { agency: true },
        }));
      if (user.role === "CUSTOMER") {
        throw new Error(t("musteriHesabi"));
      }
      if (!user.isActive) {
        throw new Error(t("hesapKapali"));
      }
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        agencyId: user.agency?.isApproved ? user.agency.id : null,
      };
    },
  }),
];

// Google / Apple: env tanımlıysa aktif olur.
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}
if (process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET) {
  providers.push(
    AppleProvider({
      clientId: process.env.APPLE_CLIENT_ID,
      clientSecret: process.env.APPLE_CLIENT_SECRET,
    })
  );
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers,
  // Kapatılan hesabın oturumu bilerek düşürülüyor (jwt callback); bunu
  // yığın iziyle hata diye yazma.
  logger: {
    error(code, metadata) {
      if (code === "JWT_SESSION_ERROR" && (metadata as { message?: string })?.message === HESAP_KAPALI) {
        console.warn("[auth] kapatılan hesabın oturumu sonlandırıldı");
        return;
      }
      console.error(`[next-auth][error][${code}]`, metadata);
    },
    warn(code) {
      console.warn(`[next-auth][warn][${code}]`);
    },
    debug() {},
  },
  callbacks: {
    // OAuth girişlerinde (Google/Apple) müşteri hesabını DB'de garanti et.
    async signIn({ user, account }) {
      if (account?.provider === "google" || account?.provider === "apple") {
        if (!user.email) return false;
        const dbUser = await findOrCreateCustomer(user.email, user.name);
        if (!dbUser.isActive) return false;
        // Acente/admin hesapları sosyal girişle bağlanamaz.
        if (dbUser.role !== "CUSTOMER") return false;
      }
      return true;
    },
    async jwt({ token, user, account, trigger, session }) {
      // Giriş penceresindeki "Hesabını tamamla" adımı adı güncelliyor
      // (useSession().update); jetondaki ad da yenilensin.
      if (trigger === "update" && typeof session?.name === "string") {
        token.name = session.name.trim().slice(0, 100);
      }
      if (trigger === "update" && token.userId) hesapOnbelleginiSil(token.userId as string);
      if (user) {
        if (account?.provider === "google" || account?.provider === "apple") {
          // OAuth user objesi bizim alanları taşımaz; DB'den doldur.
          const dbUser = await prisma.user.findUnique({
            where: { email: user.email! },
            include: { agency: true },
          });
          token.userId = dbUser?.id ?? token.sub ?? "";
          token.role = dbUser?.role ?? "CUSTOMER";
          token.agencyId = dbUser?.agency?.id ?? null;
        } else {
          token.role = user.role;
          token.userId = user.id;
          token.agencyId = user.agencyId;
        }
      }
      // Rol, aktiflik ve acente onayı jetonda bayatlamasın: her oturum
      // okumasında DB'den tazelenir. Kapatılan hesapta hata fırlatılır;
      // next-auth çerezi siler, getServerSession null döner (oturum düşer).
      // agencyId yalnız onaylı acentede dolu; API'ler buna bakıyor.
      if (token.userId) {
        const hesap = await hesapDurumu(token.userId as string);
        if (!hesap || !hesap.isActive) throw new Error(HESAP_KAPALI);
        // Ad da DB'den: acentenin adı başvuruda yazılıyor (girişte e-postadan).
        token.name = hesap.name;
        token.role = hesap.role;
        token.agencyId = hesap.role === "AGENCY" && hesap.agency?.isApproved ? hesap.agency.id : null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string;
        session.user.role = token.role as string;
        session.user.agencyId = token.agencyId as string | null;
      }
      return session;
    },
  },
};
