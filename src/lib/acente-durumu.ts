// Acente kullanıcısının panel durumu: onaylı acente paneli görür; onaysızsa
// sırasıyla başvuru formu (bir kez), "inceleniyor", "onaylanmadı" ya da
// "hesap kapalı" ekranı. Panel düzeni ve başvuru ucu bunu kullanır.

import { prisma } from "@/lib/prisma";

export type AcenteDurumu =
  | { tur: "onayli" }
  | { tur: "basvuru" }
  | { tur: "inceleniyor"; sirket: string; tarih: string }
  | { tur: "reddedildi"; sirket: string; sebep: string | null }
  | { tur: "kapali" };

export async function acenteDurumu(userId: string, email: string): Promise<AcenteDurumu> {
  const acente = await prisma.agency.findUnique({ where: { userId }, select: { isApproved: true } });
  if (acente) return acente.isApproved ? { tur: "onayli" } : { tur: "kapali" };

  // Panelden yapılan başvuru kullanıcıya bağlı; eski (formdan gelen)
  // başvurular yalnız e-postayla eşleşir.
  const basvuru = await prisma.agencyApplication.findFirst({
    where: { OR: [{ userId }, { email }] },
    orderBy: { createdAt: "desc" },
    select: { status: true, companyName: true, createdAt: true, rejectionReason: true },
  });
  if (!basvuru) return { tur: "basvuru" };
  if (basvuru.status === "REJECTED") return { tur: "reddedildi", sirket: basvuru.companyName, sebep: basvuru.rejectionReason };
  return { tur: "inceleniyor", sirket: basvuru.companyName, tarih: basvuru.createdAt.toISOString() };
}
