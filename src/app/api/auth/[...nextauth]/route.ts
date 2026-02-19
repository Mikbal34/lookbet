import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";

// Usage:
//   GET  /api/auth/session
//   GET  /api/auth/csrf
//   GET  /api/auth/providers
//   GET  /api/auth/signout
//   POST /api/auth/signin/credentials
//   POST /api/auth/signout
//   POST /api/auth/callback/credentials

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
