import { prisma } from "@/lib/prisma";

type Istemci = Pick<typeof prisma, "user" | "notification">;

/** Etkin tüm yöneticilere panel bildirimi (Yönetim › Bildirimler). */
export async function yoneticilereBildir(
  p: { type: string; title: string; message: string },
  db: Istemci = prisma
): Promise<void> {
  const adminler = await db.user.findMany({ where: { role: "ADMIN", isActive: true }, select: { id: true } });
  if (!adminler.length) return;
  await db.notification.createMany({ data: adminler.map((a) => ({ userId: a.id, ...p })) });
}
