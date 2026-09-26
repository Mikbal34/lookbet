// Acente kullanıcısının panel durumu: onaylı acente paneli görür; onaysızsa
// başvuru formu, "inceleniyor", "onaylanmadı" (bilgileri düzeltip yeniden
// başvurabilir) ya da "hesap kapalı" ekranı. Panel düzeni ve başvuru ucu bunu
// kullanır.

import { prisma } from "@/lib/prisma";

export type AcenteDurumu =
  | { tur: "onayli" }
  | { tur: "basvuru" }
  | { tur: "inceleniyor"; sirket: string; tarih: string }
  | { tur: "reddedildi"; sirket: string; sebep: string | null; onceki: OncekiBasvuru }
  | { tur: "kapali" };

/** Reddedilen başvurunun bilgileri: yeniden başvuru formu bunlarla dolu açılır. */
export interface OncekiBasvuru {
  contactName: string;
  phone: string;
  companyName: string;
  taxId: string;
  taxOffice: string;
  tursabNo: string;
  address: string;
  companyPhone: string;
  website: string;
}

export async function acenteDurumu(userId: string, email: string): Promise<AcenteDurumu> {
  const acente = await prisma.agency.findUnique({ where: { userId }, select: { isApproved: true } });
  if (acente) return acente.isApproved ? { tur: "onayli" } : { tur: "kapali" };

  // Panelden yapılan başvuru kullanıcıya bağlı; eski (formdan gelen)
  // başvurular yalnız e-postayla eşleşir.
  const basvuru = await prisma.agencyApplication.findFirst({
    where: { OR: [{ userId }, { email }] },
    orderBy: { createdAt: "desc" },
    select: {
      status: true, createdAt: true, rejectionReason: true,
      contactName: true, phone: true, companyName: true, taxId: true, taxOffice: true, tursabNo: true, address: true, companyPhone: true, website: true,
    },
  });
  if (!basvuru) return { tur: "basvuru" };
  if (basvuru.status === "REJECTED") {
    const b = basvuru;
    return {
      tur: "reddedildi",
      sirket: b.companyName,
      sebep: b.rejectionReason,
      onceki: {
        contactName: b.contactName ?? "", phone: b.phone ?? "", companyName: b.companyName, taxId: b.taxId, taxOffice: b.taxOffice ?? "",
        tursabNo: b.tursabNo ?? "", address: b.address ?? "", companyPhone: b.companyPhone ?? "", website: b.website ?? "",
      },
    };
  }
  return { tur: "inceleniyor", sirket: basvuru.companyName, tarih: basvuru.createdAt.toISOString() };
}
