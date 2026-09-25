// DELETE /api/profile/misafirler/:id — yalnız kendi kayıtlı misafirini siler.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/prisma";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Giriş yapman gerekiyor" }, { status: 401 });
  const { id } = await params;
  const { count } = await prisma.savedGuest.deleteMany({ where: { id, userId: session.user.id } });
  if (!count) return NextResponse.json({ error: "Misafir bulunamadı" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
