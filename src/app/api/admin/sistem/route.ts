import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";

// GET /api/admin/sistem — Yönetim › Sistem: çalışan yapılandırma, salt okunur.
// Değerler sunucunun ortam değişkenlerinden (.env.production) gelir; gizli
// anahtarların kendisi değil yalnız tanımlı olup olmadıkları döner.

export const dynamic = "force-dynamic";

const tanimli = (ad: string, enAz = 1) => (process.env[ad]?.length ?? 0) >= enAz;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  let tedarikci: string | null = null;
  try {
    tedarikci = process.env.ROYAL_API_BASE_URL ? new URL(process.env.ROYAL_API_BASE_URL).host : null;
  } catch {}

  return NextResponse.json({
    tedarikci: {
      adres: tedarikci,
      ornekVeri: process.env.ROYAL_API_MOCK === "true",
      b2cFeed: process.env.ROYAL_API_FEED_ID_B2C || null,
      b2bFeed: process.env.ROYAL_API_FEED_ID_B2B || null,
    },
    servisler: {
      eposta: tanimli("RESEND_API_KEY"),
      harita: tanimli("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY"),
      zamanlanmisIsler: tanimli("CRON_SECRET", 16),
      googleGiris: tanimli("GOOGLE_CLIENT_ID") && tanimli("GOOGLE_CLIENT_SECRET"),
      appleGiris: tanimli("APPLE_CLIENT_ID") && tanimli("APPLE_CLIENT_SECRET"),
    },
    ortam: process.env.NODE_ENV,
  });
}
