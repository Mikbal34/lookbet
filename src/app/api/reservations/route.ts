import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/prisma";
import { otelBilgisiEkle } from "@/lib/rezervasyon-otel";
import { rezervasyonYaniti } from "@/lib/rezervasyon-yanit";

type ReservationStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "FAILED";

// Where clause type – kept loose to avoid a hard dependency on the generated
// Prisma client types, which require `prisma generate` to be run first.
type ReservationWhereInput = Record<string, unknown>;

const VALID_STATUSES: ReservationStatus[] = [
  "PENDING",
  "CONFIRMED",
  "CANCELLED",
  "FAILED",
];

// GET /api/reservations
// Requires authentication.
// Role-scoped listing:
//   AGENCY  – reservations belonging to their agency
//   CUSTOMER, ADMIN – only their own reservations (admin: Yönetim › Rezervasyonlar)
//
// Query params:
//   status  – filter by ReservationStatus
//   page    – 1-based page number (default: 1)
//   limit   – page size (default: 20, max: 100)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Bu işlem için giriş yapmanız gerekiyor" },
        { status: 401 }
      );
    }

    const { searchParams } = request.nextUrl;

    const statusParam = searchParams.get("status");
    const pageParam = parseInt(searchParams.get("page") ?? "1", 10);
    const limitParam = Math.min(
      parseInt(searchParams.get("limit") ?? "20", 10),
      100
    );

    const page = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
    const limit = isNaN(limitParam) || limitParam < 1 ? 20 : limitParam;
    const skip = (page - 1) * limit;

    // Build the where clause based on role
    const where: ReservationWhereInput = {};

    const role = session.user.role;
    const userId = session.user.id;
    const agencyId = session.user.agencyId;

    if (role === "AGENCY") {
      if (!agencyId) {
        return NextResponse.json(
          { error: "Acente bilgisi bulunamadı" },
          { status: 403 }
        );
      }
      where.agencyId = agencyId;
    } else {
      // Müşteri ve yönetici: kendi rezervasyonları ("Rezervasyonlarım").
      // Yönetici tüm rezervasyonları Yönetim › Rezervasyonlar'da görür.
      where.userId = userId;
    }

    if (statusParam && VALID_STATUSES.includes(statusParam as ReservationStatus)) {
      where.status = statusParam as ReservationStatus;
    }

    // ?upcoming=true — konaklaması henüz bitmemiş, iptal/başarısız olmayan
    // rezervasyonlar, girişe en yakın önce. Uygulama ana sayfasındaki
    // "yaklaşan rezervasyonun" kartı bunu kullanıyor: aksi hâlde istemcinin
    // sayfalarca kayıt çekip kendi ayıklaması gerekirdi.
    const upcoming = searchParams.get("upcoming") === "true";
    if (upcoming) {
      where.checkOut = { gte: new Date() };
      where.status = { in: ["PENDING", "CONFIRMED"] as ReservationStatus[] };
    }

    // ?zaman=gelecek|gecmis|iptal — Rezervasyonlarım sayfasındaki üç sekme.
    //   gelecek: konaklaması bitmemiş, aktif (beklemede/onaylı)
    //   gecmis:  konaklaması bitmiş, aktif kalmış (tamamlanan)
    //   iptal:   iptal edilmiş ya da tamamlanamamış, tarihi ne olursa olsun
    const zaman = searchParams.get("zaman");
    const simdi = new Date();
    const AKTIF = ["PENDING", "CONFIRMED"] as ReservationStatus[];
    const ZAMAN_KOSULU: Record<string, ReservationWhereInput> = {
      gelecek: { checkOut: { gte: simdi }, status: { in: AKTIF } },
      gecmis: { checkOut: { lt: simdi }, status: { in: AKTIF } },
      iptal: { status: { in: ["CANCELLED", "FAILED"] as ReservationStatus[] } },
    };
    const temel = { ...where };
    if (zaman && ZAMAN_KOSULU[zaman]) Object.assign(where, ZAMAN_KOSULU[zaman]);

    const [reservations, total] = await Promise.all([
      prisma.reservation.findMany({
        where,
        skip,
        take: limit,
        // Gelecek: girişe en yakın önce. Geçmiş ve varsayılan: en yeni önce.
        orderBy:
          upcoming || zaman === "gelecek"
            ? { checkIn: "asc" }
            : zaman === "gecmis"
              ? { checkIn: "desc" }
              : { createdAt: "desc" },
        include: {
          user: { select: { id: true, name: true, email: true } },
          agency: { select: { id: true, companyName: true } },
        },
      }),
      prisma.reservation.count({ where }),
    ]);

    // Sekme başlıklarındaki sayılar (yalnız ?zaman ile istenince).
    const sayilar = zaman
      ? Object.fromEntries(
          await Promise.all(
            Object.entries(ZAMAN_KOSULU).map(async ([k, kosul]) => [k, await prisma.reservation.count({ where: { ...temel, ...kosul } })] as const)
          )
        )
      : undefined;

    // Kartlardaki fotoğraf, yıldız, konum ve pansiyon adı; net fiyat ve
    // yönetim alanları yalnız yöneticiye (lib/rezervasyon-yanit).
    const cikti = (await otelBilgisiEkle(reservations)).map((r) => rezervasyonYaniti(r, role));

    return NextResponse.json({
      data: cikti,
      sayilar,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[GET /api/reservations]", error);
    return NextResponse.json(
      { error: "Rezervasyonlar alınırken bir hata oluştu" },
      { status: 500 }
    );
  }
}
