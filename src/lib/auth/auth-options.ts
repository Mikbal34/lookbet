import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import AppleProvider from "next-auth/providers/apple";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { verifyLoginCode } from "@/lib/auth/login-code";

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
      // Passwordless hesap: şifreyle girilemesin diye rastgele hash.
      passwordHash: bcrypt.hashSync(randomBytes(32).toString("hex"), 10),
      role: "CUSTOMER",
    },
    include: { agency: true },
  });
}

const providers: NextAuthOptions["providers"] = [
  // Acente + admin girişi (email + şifre). Müşteri tarafı bunu kullanmaz.
  CredentialsProvider({
    id: "credentials",
    name: "credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) {
        throw new Error("Email ve şifre gereklidir");
      }

      const user = await prisma.user.findUnique({
        where: { email: credentials.email },
        include: { agency: true },
      });

      if (!user) {
        throw new Error("Geçersiz email veya şifre");
      }

      if (!user.isActive) {
        throw new Error("Hesabınız devre dışı bırakılmış");
      }

      const isPasswordValid = await bcrypt.compare(
        credentials.password,
        user.passwordHash
      );

      if (!isPasswordValid) {
        throw new Error("Geçersiz email veya şifre");
      }

      // Check if agency user is approved
      if (user.role === "AGENCY" && user.agency && !user.agency.isApproved) {
        throw new Error("Acente hesabınız henüz onaylanmamış");
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        agencyId: user.agency?.id || null,
      };
    },
  }),

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
    async jwt({ token, user, account }) {
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
