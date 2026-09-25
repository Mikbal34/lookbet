// GET  /api/profile/misafirler — hesaptaki kayıtlı misafirler
// POST /api/profile/misafirler — { name, surname, birthDate (YYYY-AA-GG), gender? }

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/prisma";

const EN_FAZLA = 20;

const tarihGecerli = (s: string) => {
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s && d.getTime() < Date.now() && d.getUTCFullYear() >= 1900;
};

const misafirSchema = z.object({
  name: z.string().trim().min(2, "Adı yaz").max(60),
  surname: z.string().trim().min(2, "Soyadı yaz").max(60),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Doğum tarihi gerekli").refine(tarihGecerli, "Doğum tarihi geçersiz"),
  gender: z.enum(["Male", "Female"]).optional(),
});

const ALANLAR = { id: true, name: true, surname: true, birthDate: true, gender: true } as const;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Giriş yapman gerekiyor" }, { status: 401 });
  const misafirler = await prisma.savedGuest.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
    select: ALANLAR,
  });
  return NextResponse.json({ misafirler });
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Giriş yapman gerekiyor" }, { status: 401 });
    const parsed = misafirSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Geçersiz bilgi" }, { status: 400 });
    }
    const sayi = await prisma.savedGuest.count({ where: { userId: session.user.id } });
    if (sayi >= EN_FAZLA) {
      return NextResponse.json({ error: `En fazla ${EN_FAZLA} misafir kaydedebilirsin` }, { status: 400 });
    }
    const misafir = await prisma.savedGuest.create({
      data: { ...parsed.data, userId: session.user.id },
      select: ALANLAR,
    });
    return NextResponse.json({ misafir }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/profile/misafirler]", error);
    return NextResponse.json({ error: "Misafir kaydedilemedi" }, { status: 500 });
  }
}
