import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import AppleProvider from "next-auth/providers/apple";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { verifyLoginCode } from "@/lib/auth/login-code";

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
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.code) {
        throw new Error("Email ve kod gereklidir");
      }

      const email = credentials.email.toLowerCase().trim();
      const valid = await verifyLoginCode(email, credentials.code.trim());
      if (!valid) {
        throw new Error("Kod hatalı veya süresi dolmuş");
      }

      const user = await findOrCreateCustomer(email);

      if (!user.isActive) {
        throw new Error("Hesabınız devre dışı bırakılmış");
      }
      if (user.role !== "CUSTOMER") {
        throw new Error("Bu hesap için acente/yönetici girişini kullanın");
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
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.code) {
        throw new Error("E-posta ve kod gereklidir");
      }
      const email = credentials.email.toLowerCase().trim();
      const valid = await verifyLoginCode(email, credentials.code.trim());
      if (!valid) {
        throw new Error("Kod hatalı veya süresi dolmuş");
      }
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
        throw new Error("Bu e-posta bir müşteri hesabına ait");
      }
      if (!user.isActive) {
        throw new Error("Hesabınız devre dışı bırakılmış");
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
      // Acentenin onayı jetonda bayatlamasın: admin onaylayınca (ya da onayı
      // kaldırınca) yeniden giriş gerekmeden agencyId güncellensin. agencyId
      // yalnız onaylı acentede dolu; API'ler buna bakıyor.
      if (token.role === "AGENCY" && token.userId) {
        const acente = await prisma.agency.findUnique({
          where: { userId: token.userId as string },
          select: { id: true, isApproved: true },
        });
        token.agencyId = acente?.isApproved ? acente.id : null;
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
