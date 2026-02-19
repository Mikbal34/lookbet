import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Admin routes
    if (path.startsWith("/admin") || path.startsWith("/api/admin")) {
      if (token?.role !== "ADMIN") {
        if (path.startsWith("/api/")) {
          return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
        }
        return NextResponse.redirect(new URL("/login", req.url));
      }
    }

    // Agency routes
    if (path.startsWith("/agency")) {
      if (token?.role !== "AGENCY") {
        return NextResponse.redirect(new URL("/login", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;

        // Public routes - no auth needed
        if (
          path === "/" ||
          path === "/login" ||
          path === "/register" ||
          path.startsWith("/register/") ||
          path.startsWith("/api/auth/")
        ) {
          return true;
        }

        // All other routes require authentication
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    "/admin/:path*",
    "/agency/:path*",
    "/reservations/:path*",
    "/booking/:path*",
    "/profile/:path*",
    "/api/admin/:path*",
    "/api/booking/:path*",
    "/api/reservations/:path*",
  ],
};
