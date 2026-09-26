import { getLocale, getTranslations } from "next-intl/server";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/prisma";
import { getReservationDetail } from "@/lib/royal-api";
import type { Prisma, ReservationStatus } from "@/generated/prisma/client";
import { politikalariOranla, rezervasyonYaniti } from "@/lib/rezervasyon-yanit";
import { kuponBirak } from "@/lib/pricing/kupon";
import { boardTypeAdi, boardTypeAdlari } from "@/lib/board-types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function mapApiStatus(apiStatus: string | undefined): ReservationStatus | null {
  if (!apiStatus) return null;
  if (/cancel/i.test(apiStatus)) return "CANCELLED";
  if (/confirm/i.test(apiStatus)) return "CONFIRMED";
  if (/fail|reject|error/i.test(apiStatus)) return "FAILED";
  if (/pend|wait|request/i.test(apiStatus)) return "PENDING";
  return null;
}

const sonTazeleme = new Map<string, number>();
function tazelenebilir(id: string): boolean {
  const simdi = Date.now();
  if (simdi - (sonTazeleme.get(id) ?? 0) < 2 * 60_000) return false;
  if (sonTazeleme.size > 5000) sonTazeleme.clear();
  sonTazeleme.set(id, simdi);
  return true;
}

// GET /api/reservations/:id
// Returns a single reservation.
// Access rules:
//   ADMIN   – can view any reservation
//   AGENCY  – can view reservations belonging to their agency
//   CUSTOMER – can view only their own reservations
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const t = await getTranslations("api");
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: t("genel.girisGerekli") },
        { status: 401 }
      );
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: t("genel.gecersizIstek") }, { status: 400 });
    }

    let reservation = await prisma.reservation.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        agency: { select: { id: true, companyName: true } },
      },
    });

    if (!reservation) {
      return NextResponse.json({ error: t("rezervasyon.bulunamadi") }, { status: 404 });
    }

    // Yetki: tedarikçiye gitmeden ve kaydı güncellemeden önce.
    const role = session.user.role;
    if (role === "CUSTOMER" && reservation.userId !== session.user.id) {
      return NextResponse.json({ error: t("rezervasyon.erisimYok") }, { status: 403 });
    }
    if (role === "AGENCY" && (!session.user.agencyId || reservation.agencyId !== session.user.agencyId)) {
      return NextResponse.json({ error: t("rezervasyon.erisimYok") }, { status: 403 });
    }

    // Sonuçlanmamış rezervasyonu tedarikçiden tazele (otel tarafında iptal ya
    // da onay olmuş olabilir). Aynı rezervasyon için en fazla 2 dakikada bir;
    // hata olursa yerel kayıt olduğu gibi döner.
    if (
      reservation.bookingNumber &&
      (reservation.status === "PENDING" || reservation.status === "CONFIRMED") &&
      tazelenebilir(id)
    ) {
      try {
        const apiDetail = await getReservationDetail(reservation.bookingNumber);
        const mappedStatus = mapApiStatus(apiDetail.status);

        const statusChanged = mappedStatus && mappedStatus !== reservation.status;
        const policyMissing =
          !reservation.cancellationPolicy &&
          (apiDetail.cancellationPolicies?.length ?? 0) > 0;

        if (statusChanged || policyMissing) {
          // Otel tarafında iptal: kupon kullanımı da geri verilir (iptal ucundaki gibi).
          if (statusChanged && mappedStatus === "CANCELLED") await prisma.$transaction((tx) => kuponBirak(tx, id)).catch((e) => console.error("[rez tazele] kupon", id, e));
          reservation = await prisma.reservation.update({
            where: { id },
            data: {
              ...(statusChanged ? { status: mappedStatus, ...(mappedStatus === "CANCELLED" ? { cancelledAt: new Date() } : {}) } : {}),
              ...(policyMissing
                ? {
                    // Etscore politikaları net fiyat üzerinden; satış fiyatına oranla.
                    cancellationPolicy: politikalariOranla(
                      apiDetail.cancellationPolicies,
                      reservation.totalPrice,
                      reservation.discountedPrice ?? reservation.totalPrice
                    ) as unknown as Prisma.InputJsonArray,
                  }
                : {}),
            },
            include: {
              user: { select: { id: true, name: true, email: true } },
              agency: { select: { id: true, companyName: true } },
            },
          });
        }
      } catch (refreshError) {
        console.warn("[GET /api/reservations/[id]] supplier refresh failed", refreshError);
      }
    }

    // Liste ucundaki gibi pansiyon kodunu görünen ada çevir; ayrıca otelin
    // yerel kaydından fotoğraf/yıldız/konum ekle. Detay sayfası tepede otel
    // fotoğrafı gösteriyor ve bu bilgiler rezervasyon satırında tutulmuyor.
    // İkinci bir istemci isteği yerine burada birleştiriliyor — tedarikçiye
    // değil yerel tabloya bakıldığı için ek gecikme getirmiyor.
    const [pansiyonAdlari, otel] = await Promise.all([
      boardTypeAdlari(role === "CUSTOMER" ? await getLocale() : "tr"),
      prisma.hotel.findUnique({
        where: { hotelCode: reservation.hotelCode },
        select: {
          thumbnailImage: true,
          images: true,
          stars: true,
          address: true,
          phone: true,
          latitude: true,
          longitude: true,
          location: { select: { name: true } },
        },
      }),
    ]);

    // images alanı Json?; yerel kayıtta düz URL dizisi olarak tutuluyor.
    const gorseller = Array.isArray(otel?.images)
      ? (otel.images as unknown[]).filter((u): u is string => typeof u === "string")
      : [];

    return NextResponse.json({
      ...rezervasyonYaniti(reservation, role),
      boardTypeName: boardTypeAdi(reservation.boardType, pansiyonAdlari),
      hotel: otel
        ? {
            image: otel.thumbnailImage ?? gorseller[0] ?? null,
            stars: otel.stars,
            address: otel.address,
            city: otel.location?.name ?? null,
            // Detay sayfasındaki hızlı eylemler (ara / yol tarifi) için.
            phone: otel.phone,
            latitude: otel.latitude,
            longitude: otel.longitude,
          }
        : null,
    });
  } catch (error) {
    console.error("[GET /api/reservations/[id]]", error);
    return NextResponse.json(
      { error: t("rezervasyon.getirmeHatasi") },
      { status: 500 }
    );
  }
}
