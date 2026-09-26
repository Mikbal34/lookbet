// GET  /api/profile/misafirler — hesaptaki kayıtlı misafirler
// POST /api/profile/misafirler — { name, surname, birthDate (YYYY-AA-GG), gender? }

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/prisma";
import { hataCevirici } from "@/lib/dogrulama";

const EN_FAZLA = 20;

const tarihGecerli = (s: string) => {
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s && d.getTime() < Date.now() && d.getUTCFullYear() >= 1900;
};

// Mesajlar metin anahtarı (api.profil.*), yanıtta isteğin diline çevrilir.
const misafirSchema = z.object({
  name: z.string().trim().min(2, "adYaz").max(60),
  surname: z.string().trim().min(2, "soyadYaz").max(60),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "dogumGerekli").refine(tarihGecerli, "dogumGecersiz"),
  gender: z.enum(["Male", "Female"]).optional(),
});

const ALANLAR = { id: true, name: true, surname: true, birthDate: true, gender: true } as const;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: (await getTranslations("api"))("genel.girisGerekli") }, { status: 401 });
  const misafirler = await prisma.savedGuest.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
    select: ALANLAR,
  });
  return NextResponse.json({ misafirler });
}

export async function POST(req: NextRequest) {
  const t = await getTranslations("api");
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: t("genel.girisGerekli") }, { status: 401 });
    const parsed = misafirSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      const ilk = parsed.error.issues[0]?.message;
      return NextResponse.json({ error: ilk ? (await hataCevirici("profil"))(ilk) : t("genel.gecersizIstek") }, { status: 400 });
    }
    const sayi = await prisma.savedGuest.count({ where: { userId: session.user.id } });
    if (sayi >= EN_FAZLA) {
      return NextResponse.json({ error: t("profil.misafirSiniri", { sayi: EN_FAZLA }) }, { status: 400 });
    }
    const misafir = await prisma.savedGuest.create({
      data: { ...parsed.data, userId: session.user.id },
      select: ALANLAR,
    });
    return NextResponse.json({ misafir }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/profile/misafirler]", error);
    return NextResponse.json({ error: t("profil.misafirKaydedilemedi") }, { status: 500 });
  }
}
