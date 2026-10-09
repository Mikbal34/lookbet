import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Yönetim: giriş sayfası (/admin/giris) açık, yönetici zaten girdiyse panele.
    // Panel ve API'si yönetici olmayana "bulunamadı": varlığı dışarıdan belli
    // olmasın (siteden bağlantı da yok).
    if (path === "/admin/giris") {
      if (token?.role === "ADMIN") return NextResponse.redirect(new URL("/admin", req.url));
      return NextResponse.next();
    }
    if (path.startsWith("/admin") || path.startsWith("/api/admin")) {
      if (token?.role !== "ADMIN") {
        if (path.startsWith("/api/")) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
        return NextResponse.rewrite(new URL("/_bulunamadi", req.url));
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
        // fonksiyonunda: acente sayfaları /agency/login'e yönlendirir; yönetim
        // yönetici olmayana "bulunamadı" döner (giriş: /admin/giris).
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
