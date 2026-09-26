import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/prisma";
import { profilHatasi } from "@/lib/dogrulama";

// Kullanıcının kendi profili: ad, telefon, doğum tarihi, uyruk. Alanlar
// ayrı ayrı güncellenebilir (Hesabım'da satır satır düzenleniyor). E-posta
// kimlik olarak kullanılıyor (girişin anahtarı), rol ve isActive ise
// yönetici yetkisinde — bunları buradan değiştirilebilir yapmak yetki
// yükseltme yolu açardı. Şema mesajları metin anahtarı (api.profil.*).

const tarihGecerli = (s: string) => {
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s && d.getTime() < Date.now() && d.getUTCFullYear() >= 1900;
};

const profileSchema = z
  .object({
    name: z.string().trim().min(2, "adKisa").max(100).optional(),
    // Boş dize telefonu siler.
    phone: z.union([z.literal(""), z.string().trim().min(7, "telefonGecersiz").max(20)]).optional(),
    birthDate: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(tarihGecerli, "dogumGecersiz")]).optional(),
    nationality: z.string().regex(/^[A-Z]{2}$/, "uyrukGecersiz").optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), "alanYok");

const PUBLIC_FIELDS = {
  id: true,
  email: true,
  name: true,
  phone: true,
  birthDate: true,
  nationality: true,
  role: true,
  createdAt: true,
} as const;

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: PUBLIC_FIELDS,
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("[PROFILE_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const parsed = profileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(await profilHatasi(parsed.error), { status: 400 });
    }

    const { name, phone, birthDate, nationality } = parsed.data;

    // Hedef her zaman oturumdaki kullanıcı; gövdeden gelen bir id kabul
    // edilmiyor ki başkasının profili güncellenemesin.
    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(phone !== undefined ? { phone: phone || null } : {}),
        ...(birthDate !== undefined ? { birthDate: birthDate || null } : {}),
        ...(nationality !== undefined ? { nationality } : {}),
      },
      select: PUBLIC_FIELDS,
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error("[PROFILE_PUT]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
