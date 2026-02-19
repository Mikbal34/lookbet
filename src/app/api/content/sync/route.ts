import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { syncAll } from "@/lib/royal-api";

// POST /api/content/sync
// Admin-only endpoint.
// Triggers a full content synchronisation from the Royal API: currencies,
// board types, facilities, room attributes, locations and hotels are all
// upserted into the local database.
//
// The B2B feedId is used for hotel list retrieval because admins are
// operating in a back-office context.  Fall back to B2C if the B2B env
// variable is not configured.
export async function POST(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Bu işlem için giriş yapmanız gerekiyor" },
        { status: 401 }
      );
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Bu işlem için admin yetkisi gerekiyor" },
        { status: 403 }
      );
    }

    const feedId =
      process.env.ROYAL_API_FEED_ID_B2B ??
      process.env.ROYAL_API_FEED_ID_B2C ??
      "";

    if (!feedId) {
      return NextResponse.json(
        { error: "Feed ID yapılandırması eksik" },
        { status: 500 }
      );
    }

    const results = await syncAll(feedId);

    return NextResponse.json({
      success: true,
      syncedAt: new Date().toISOString(),
      results,
    });
  } catch (error) {
    console.error("[POST /api/content/sync]", error);
    return NextResponse.json(
      { error: "İçerik senkronizasyonu sırasında bir hata oluştu" },
      { status: 500 }
    );
  }
}
