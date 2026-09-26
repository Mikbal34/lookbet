import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/prisma";
import { tarihAraligi } from "../../_ortak";

// GET /api/admin/reservations/export — listedeki filtrelerle CSV (en fazla
// SATIR_SINIRI satır; aşılırsa son satırda not ve X-Export-Truncated başlığı).

const SATIR_SINIRI = 10_000;

function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) return "";
  let str = String(value);
  // Formül enjeksiyonu: = + - @ sekme ya da CR ile başlayan metin hücresi
  // Excel/Sheets'te formül olarak çalışabilir (misafir adı, not gibi dışarıdan
  // gelen alanlar). Başına ' eklenir; sayılar olduğu gibi kalır.
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(str)) str = `'${str}`;
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatDate(date: Date | null | undefined): string {
  if (!date) return "";
  return date.toISOString().replace("T", " ").substring(0, 19);
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const agencyId = searchParams.get("agencyId");
    const hotelCode = searchParams.get("hotelCode");
    const tarih = tarihAraligi(searchParams);
    if (tarih.hata) return tarih.hata;
    const search = (searchParams.get("search") ?? "").trim();

    const where: Record<string, unknown> = {};

    const validStatuses = ["PENDING", "CONFIRMED", "CANCELLED", "FAILED"];
    if (status && validStatuses.includes(status)) {
      where.status = status;
    }

    const source = searchParams.get("source");
    if (source === "CUSTOMER" || source === "AGENCY") {
      where.source = source;
    }

    if (agencyId) {
      where.agencyId = agencyId;
    }

    if (hotelCode) {
      where.hotelCode = hotelCode;
    }

    if (tarih.filtre) {
      where.createdAt = tarih.filtre;
    }

    if (search) {
      where.OR = [
        { bookingNumber: { contains: search, mode: "insensitive" } },
        { contactName: { contains: search, mode: "insensitive" } },
        { contactEmail: { contains: search, mode: "insensitive" } },
        { hotelName: { contains: search, mode: "insensitive" } },
        { agency: { companyName: { contains: search, mode: "insensitive" } } },
      ];
    }

    // Bir fazlası istenir: sınır aşıldı mı anlaşılsın.
    const bulunan = await prisma.reservation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: SATIR_SINIRI + 1,
      include: {
        user: { select: { id: true, name: true, email: true } },
        agency: { select: { id: true, companyName: true } },
      },
    });
    const kesildi = bulunan.length > SATIR_SINIRI;
    const reservations = kesildi ? bulunan.slice(0, SATIR_SINIRI) : bulunan;

    const headers = [
      "ID",
      "Booking Number",
      "Status",
      "Hotel Code",
      "Hotel Name",
      "Check In",
      "Check Out",
      "Total Price",
      "Discounted Price",
      "Currency",
      "Board Type",
      "Room Type",
      "Contact Name",
      "Contact Email",
      "Contact Phone",
      "User Name",
      "User Email",
      "Agency",
      "Source",
      "Created At",
    ];

    type ReservationWithRelations = (typeof reservations)[number];

    const rows = reservations.map((r: ReservationWithRelations) => [
      escapeCsvField(r.id),
      escapeCsvField(r.bookingNumber),
      escapeCsvField(r.status),
      escapeCsvField(r.hotelCode),
      escapeCsvField(r.hotelName),
      escapeCsvField(formatDate(r.checkIn)),
      escapeCsvField(formatDate(r.checkOut)),
      escapeCsvField(r.totalPrice),
      escapeCsvField(r.discountedPrice),
      escapeCsvField(r.currency),
      escapeCsvField(r.boardType),
      escapeCsvField(r.roomType),
      escapeCsvField(r.contactName),
      escapeCsvField(r.contactEmail),
      escapeCsvField(r.contactPhone),
      escapeCsvField(r.user?.name),
      escapeCsvField(r.user?.email),
      escapeCsvField(r.agency?.companyName),
      escapeCsvField(r.source),
      escapeCsvField(formatDate(r.createdAt)),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row: string[]) => row.join(",")),
      // Kesildiyse dosyada da görünsün (indirme bağlantısı başlığı göstermez).
      ...(kesildi ? [escapeCsvField(`NOT: Yalnız en yeni ${SATIR_SINIRI.toLocaleString("tr-TR")} rezervasyon alındı; tamamı için tarih ya da durumla daraltın.`)] : []),
    ].join("\n");

    const filename = `reservations-export-${new Date().toISOString().substring(0, 10)}.csv`;

    // BOM: Excel UTF-8'i ancak bununla tanıyor (yoksa Türkçe harfler bozuluyor).
    return new NextResponse(`\uFEFF${csvContent}`, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "X-Export-Row-Limit": String(SATIR_SINIRI),
        ...(kesildi ? { "X-Export-Truncated": "true" } : {}),
      },
    });
  } catch (error) {
    console.error("[ADMIN_RESERVATIONS_EXPORT_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
