import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/prisma";

// Tek bildirimin okundu/okunmadı durumu. Admin bildirim listesindeki
// işaretleme düğmesi buraya PATCH atıyor. Yalnız oturumdaki yöneticinin
// kendi bildirimi değişir; başkasınınki 404 (varlığı da sızmasın).

type RouteParams = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  isRead: z.boolean(),
});

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const body = await req.json().catch(() => ({}));
    const parsed = patchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "isRead (true/false) gerekli", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await prisma.notification.findFirst({ where: { id, userId: session.user.id }, select: { id: true } });
    if (!existing) {
      return NextResponse.json({ error: "Bildirim bulunamadı" }, { status: 404 });
    }

    const notification = await prisma.notification.update({
      where: { id },
      data: { isRead: parsed.data.isRead },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    return NextResponse.json({ notification });
  } catch (error) {
    console.error("[ADMIN_NOTIFICATIONS_ID_PATCH]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
