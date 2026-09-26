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
        // Yönetici girişi acente girişiyle aynı sayfada (e-posta kodu);
        // girişten sonra istenen sayfaya dönülür.
        return NextResponse.redirect(new URL(`/agency/login?callbackUrl=${encodeURIComponent(path + req.nextUrl.search)}`, req.url));
      }
    }

    // Agency routes (login sayfası hariç — o herkese açık)
    if (path.startsWith("/agency") && path !== "/agency/login") {
      if (token?.role !== "AGENCY") {
        return NextResponse.redirect(new URL(`/agency/login?callbackUrl=${encodeURIComponent(path + req.nextUrl.search)}`, req.url));
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

        // /agency ve /admin rotalarının auth kontrolü yukarıdaki middleware
        // fonksiyonunda: girişsiz veya rolü uymayan kullanıcı /agency/login'e
        // yönlendirilir (genel /login'e değil), API'ye 403 döner.
        if (path.startsWith("/agency") || path.startsWith("/admin") || path.startsWith("/api/admin")) {
          return true;
        }

        // Diğer API'ler oturumu kendileri denetler ve JSON 401 döner; giriş
        // sayfasına yönlendirme (HTML) istemciyi yanıltıyordu.
        if (path.startsWith("/api/")) return true;

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
    "/api/admin/:path*",
    "/api/booking/:path*",
    "/api/reservations/:path*",
  ],
};
