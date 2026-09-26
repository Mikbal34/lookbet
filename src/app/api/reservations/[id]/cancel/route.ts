import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/prisma";
import { cancelReservation } from "@/lib/royal-api";
import { EtscoreError } from "@/lib/royal-api/client";
import { kuponBirak } from "@/lib/pricing/kupon";
import { rezervasyonYaniti } from "@/lib/rezervasyon-yanit";
import { yoneticilereBildir } from "@/lib/bildirim";
import { epostaGonder, iptalEpostasi } from "@/lib/eposta";
import { istemciIp } from "@/lib/hiz-siniri";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Aynı rezervasyon için aynı anda tek iptal (süreç içi; uygulama tek süreçte).
const surenler = new Set<string>();

// POST /api/reservations/:id/cancel
// Giriş ve sahiplik gerekir (müşteri kendi, acente kendi acentesinin, yönetici
// hepsini). Etscore'da iptal edilir; yerel kayıt YALNIZ Etscore iptali
// doğrularsa CANCELLED olur (aksi halde otel tarafında rezervasyon canlı
// kalırken bizde iptal görünürdü). Kupon kullanımı geri verilir.
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Bu işlem için giriş yapmanız gerekiyor" }, { status: 401 });
  }
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Rezervasyon ID gerekli" }, { status: 400 });

  const reservation = await prisma.reservation.findUnique({ where: { id } });
  if (!reservation) return NextResponse.json({ error: "Rezervasyon bulunamadı" }, { status: 404 });

  const role = session.user.role;
  if (role === "CUSTOMER" && reservation.userId !== session.user.id) {
    return NextResponse.json({ error: "Bu rezervasyonu iptal etme izniniz yok" }, { status: 403 });
  }
  if (role === "AGENCY" && (!session.user.agencyId || reservation.agencyId !== session.user.agencyId)) {
    return NextResponse.json({ error: "Bu rezervasyonu iptal etme izniniz yok" }, { status: 403 });
  }
  if (reservation.status === "CANCELLED") {
    return NextResponse.json({ error: "Rezervasyon zaten iptal edilmiş" }, { status: 409 });
  }
  if (reservation.status === "FAILED") {
    return NextResponse.json({ error: "Bu rezervasyon tamamlanmamış; iptal edilecek bir kayıt yok" }, { status: 409 });
  }
  if (!reservation.bookingNumber) {
    return NextResponse.json(
      { error: "Rezervasyon henüz otelden onay almadı; iptal için bizimle iletişime geç" },
      { status: 422 }
    );
  }
  if (surenler.has(id)) {
    return NextResponse.json({ error: "İptal işlemi sürüyor" }, { status: 409 });
  }
  surenler.add(id);

  try {
    let sonuc;
    try {
      sonuc = await cancelReservation({
        bookingNumber: reservation.bookingNumber,
        roomConfirmationCodes: Array.isArray(reservation.roomConfirmationCodes)
          ? (reservation.roomConfirmationCodes as unknown[]).filter((x): x is string => typeof x === "string")
          : [],
      });
    } catch (e) {
      if (e instanceof EtscoreError && !e.belirsiz) {
        console.warn("[cancel] Etscore reddetti", reservation.bookingNumber, e.status, e.code, e.message);
        const bizde = e.code === null && (e.status === 401 || e.status === 403);
        return NextResponse.json(
          bizde ? { error: "İptal şu an yapılamıyor; lütfen biraz sonra tekrar dene." } : { error: e.message, code: e.code },
          { status: bizde ? 503 : 422 }
        );
      }
      // Sonuç belirsiz: Etscore iptal etmiş olabilir.
      console.error("[cancel] sonuç belirsiz", reservation.bookingNumber, e);
      await kontrolIste(reservation.id, reservation.bookingNumber, `İptal isteğine Etscore yanıtı alınamadı: ${e instanceof Error ? e.message : String(e)}`);
      return NextResponse.json(
        { error: "İptal talebin iletildi ama otelden yanıt alınamadı. Ekibimiz kontrol edip sana dönecek." },
        { status: 502 }
      );
    }

    if (!/cancel/i.test(sonuc.status ?? "")) {
      // Etscore çağrısı başarılı ama durum iptal değil: yerelde iptal işaretleme.
      console.warn(`[cancel] Etscore durumu "${sonuc.status}" (${reservation.bookingNumber})`);
      await kontrolIste(reservation.id, reservation.bookingNumber, `İptal sonrası Etscore durumu: ${sonuc.status || "boş"}`);
      return NextResponse.json(
        { error: "İptal talebin alındı ama otelden iptal onayı gelmedi. Ekibimiz kontrol edip sana dönecek." },
        { status: 502 }
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const r = await tx.reservation.update({
        where: { id },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancellationFee: sonuc.cancellationFee ?? null,
          cancellationFeeCurrency: sonuc.currency || null,
          priceCode: null,
        },
      });
      await kuponBirak(tx, id);
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "CANCEL_RESERVATION",
          entity: "Reservation",
          entityId: id,
          oldData: { status: reservation.status },
          newData: { status: "CANCELLED", cancellationFee: sonuc.cancellationFee ?? null, currency: sonuc.currency || null },
          ipAddress: istemciIp(request.headers),
        },
      });
      return r;
    });

    // İptal e-postası (müşteriye satış fiyatına oranlı ücretle).
    const musteriGozu = rezervasyonYaniti(updated, "CUSTOMER");
    if (updated.contactEmail) {
      const e = iptalEpostasi({ ...updated, cancellationFee: musteriGozu.cancellationFee ?? null });
      void epostaGonder({ to: updated.contactEmail, ...e }).catch((x) => console.error("[IPTAL_EPOSTA]", id, x));
    }

    const yanit = rezervasyonYaniti(updated, role);
    return NextResponse.json({
      reservation: yanit,
      cancellation: { status: sonuc.status, cancellationFee: yanit.cancellationFee ?? null, currency: sonuc.currency },
    });
  } catch (error) {
    console.error("[POST /api/reservations/[id]/cancel]", error);
    return NextResponse.json({ error: "Rezervasyon iptal edilirken bir hata oluştu" }, { status: 500 });
  } finally {
    surenler.delete(id);
  }
}

async function kontrolIste(id: string, bookingNumber: string, not: string) {
  await prisma.reservation
    .update({ where: { id }, data: { needsReview: true, statusNote: not.slice(0, 480) } })
    .catch((x) => console.error("[cancel] kontrol notu yazılamadı", id, x));
  await yoneticilereBildir({
    type: "RESERVATION_FAILED",
    title: "İptal kontrol bekliyor",
    message: `${bookingNumber} numaralı rezervasyonun iptali doğrulanamadı. ${not}`.slice(0, 500),
  }).catch(() => {});
}
