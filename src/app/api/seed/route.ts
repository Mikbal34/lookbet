import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { syncAll } from "@/lib/royal-api";

// GET /api/seed?token=XXX
// Deploy sonrası BİR KEZ çalıştırılır: test kullanıcılarını oluşturur ve
// (mock modda) otel/lokasyon içeriğini DB'ye yükler. SEED_TOKEN ile korunur.
// İdempotenttir — tekrar çağrılırsa kullanıcılar upsert edilir, içerik yenilenir.
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const expected = process.env.SEED_TOKEN;

  if (!expected || token !== expected) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const hash = (p: string) => bcrypt.hashSync(p, 10);
    const defaultPassword = process.env.SEED_ADMIN_PASSWORD || "Lookbet123!";

    // 1) Admin
    const admin = await prisma.user.upsert({
      where: { email: "admin@lookbet.com" },
      update: {},
      create: {
        email: "admin@lookbet.com",
        name: "Lookbet Admin",
        role: "ADMIN",
        isActive: true,
        passwordHash: hash(defaultPassword),
      },
    });

    // 2) Müşteri (şifresiz OTP ile giriyor; passwordHash sadece zorunlu alan)
    await prisma.user.upsert({
      where: { email: "musteri@lookbet.com" },
      update: {},
      create: {
        email: "musteri@lookbet.com",
        name: "Test Müşteri",
        role: "CUSTOMER",
        isActive: true,
        passwordHash: hash(randomBytes(16).toString("hex")),
      },
    });

    // 3) Acente + onaylı acente kaydı
    const agencyUser = await prisma.user.upsert({
      where: { email: "acente@lookbet.com" },
      update: {},
      create: {
        email: "acente@lookbet.com",
        name: "Test Acente Yetkilisi",
        role: "AGENCY",
        isActive: true,
        passwordHash: hash(defaultPassword),
      },
    });
    const existingAgency = await prisma.agency.findUnique({
      where: { userId: agencyUser.id },
    });
    if (!existingAgency) {
      await prisma.agency.create({
        data: {
          userId: agencyUser.id,
          companyName: "Demo Turizm A.Ş.",
          taxId: "1234567890",
          phone: "+902420000000",
          isApproved: true,
          approvedById: admin.id,
          discountRate: 5,
          commission: 3,
        },
      });
    }

    // 4) İçerik (mock modda oteller/lokasyonlar/vb.)
    const feedId =
      process.env.ROYAL_API_FEED_ID_B2B ??
      process.env.ROYAL_API_FEED_ID_B2C ??
      "MOCK";
    const content = await syncAll(feedId);

    return NextResponse.json({
      ok: true,
      users: ["admin@lookbet.com", "musteri@lookbet.com", "acente@lookbet.com"],
      adminPassword: defaultPassword,
      content,
    });
  } catch (error) {
    console.error("[GET /api/seed]", error);
    return NextResponse.json(
      { error: "Seed sırasında hata oluştu", detail: String(error) },
      { status: 500 }
    );
  }
}
