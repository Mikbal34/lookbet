import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/prisma";
import { createBookingSchema } from "@/lib/validators";
import { misafirleriDenetle } from "@/lib/validators/booking.schema";
import { createBooking, fiyatKaydi, fiyatKodunuAyir, fiyatKodunuGeriKoy } from "@/lib/royal-api";
import { EtscoreError } from "@/lib/royal-api/client";
import { calculatePrice, fiyatBaglami } from "@/lib/pricing";
import { KuponAlinamadi, kuponAyir, kuponBirak, kuponDegerlendir, type KuponOzeti } from "@/lib/pricing/kupon";
import { feedBul } from "@/lib/feed";
import { REZERVASYON_KAPALI_MESAJI, rezervasyonYapabilir } from "@/lib/rezervasyon-ayar";
import { politikalariOranla, rezervasyonYaniti } from "@/lib/rezervasyon-yanit";
import { yoneticilereBildir } from "@/lib/bildirim";
import { epostaGonder, rezervasyonOnayEpostasi } from "@/lib/eposta";
import { generateClientReferenceId } from "@/lib/utils";
import type { Prisma } from "@/generated/prisma/client";

// POST /api/booking — rezervasyon (giriş gerekli).
//
// Fiyat, tarihler, pansiyon, kişi sayıları ve iptal koşulları fiyat kodunun
// sunucudaki kaydından (oda araması) gelir; istemcinin gönderdiği tutar yalnız
// müşterinin onayladığı fiyatla karşılaştırmak için kullanılır.
//
// Sıra (yarım kalan rezervasyon ya da çift rezervasyon olmasın diye):
//   1. Fiyat kodu ayrılır (aynı anda ikinci istek burada düşer).
//   2. PENDING kayıt + kupon kullanımı tek transaction'da yazılır; fiyat kodu
//      kayıtta tekil — süreç yeniden başlasa da aynı kodla ikinci kayıt olmaz.
//   3. Etscore'a gönderilir (zaman aşımıyla).
//      • Onay: kayıt güncellenir.
//      • Red (4xx): kayıt FAILED, kupon ve fiyat kodu geri verilir.
//      • Sonuç belirsiz (zaman aşımı, bağlantı, 5xx): kayıt PENDING kalır,
//        "kontrol gerekli" işaretlenir, yöneticiye bildirim gider;
//        clientReferenceId ile Etscore'dan kontrol edilir.

const eur = (n: number) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "EUR" }).format(n);
const kisalt = (s: string, n = 480) => (s.length > n ? `${s.slice(0, n)}…` : s);

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Bu işlem için giriş yapmanız gerekiyor" }, { status: 401 });
    }
    const userId = session.user.id;
    const userRole = session.user.role as "CUSTOMER" | "AGENCY" | "ADMIN";
    const agencyId = session.user.agencyId ?? undefined;

    if (!rezervasyonYapabilir(userRole)) {
      return NextResponse.json({ error: REZERVASYON_KAPALI_MESAJI, code: "REZERVASYON_KAPALI" }, { status: 503 });
    }
    // agencyId yalnız onaylı acentede dolu; onaysız acente rezervasyon yapamaz.
    if (userRole === "AGENCY" && !agencyId) {
      return NextResponse.json({ error: "Acente hesabın onaylanınca rezervasyon yapabilirsin" }, { status: 403 });
    }

    const parsed = createBookingSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Geçersiz istek verisi", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const input = parsed.data;

    // ── Fiyat kodunun kaydı: fiyatı belirleyen her şey buradan ──
    const feedId = await feedBul(userRole, agencyId);
    const kayit = fiyatKaydi(input.priceCode);
    if (!kayit || kayit.hotelCode !== input.hotelCode || kayit.feedId !== feedId) {
      return NextResponse.json(
        { error: "Fiyatın geçerlilik süresi doldu, lütfen odaları yeniden ara", code: "FIYAT_SURESI_DOLDU" },
        { status: 409 }
      );
    }
    const misafirler = input.rooms[0].guests;
    const misafirHatalari = misafirleriDenetle(misafirler, kayit);
    if (misafirHatalari.length) {
      return NextResponse.json(
        { error: misafirHatalari[0].mesaj, details: { rooms: misafirHatalari.map((h) => h.mesaj) } },
        { status: 422 }
      );
    }

    // ── Fiyat: net → kural → kampanya → acente indirimi → (kupon) → taban ──
    const fiyatGirdisi = {
      basePrice: kayit.tutar,
      hotelCode: kayit.hotelCode,
      boardType: kayit.boardType,
      checkIn: kayit.checkIn,
      checkOut: kayit.checkOut,
    };
    const baglam = await fiyatBaglami(userRole, agencyId);
    let fiyat = await calculatePrice({ ...fiyatGirdisi, userType: userRole, agencyId, baglam });
    let sonFiyat = fiyat.finalPrice;
    let komisyon = fiyat.commissionAmount;
    let kupon: (KuponOzeti & { tutar: number }) | null = null;
    if (input.couponCode) {
      const k = await kuponDegerlendir({ kod: input.couponCode, userId, userType: userRole, agencyId, girdi: fiyatGirdisi });
      if (k.durum === "gecersiz") {
        return NextResponse.json({ error: k.mesaj, alan: "kupon" }, { status: 422 });
      }
      fiyat = k.fiyat;
      sonFiyat = fiyat.finalPrice;
      komisyon = fiyat.commissionAmount;
      if (k.durum === "uygulandi") {
        kupon = { ...k.kupon, tutar: k.tutar };
        sonFiyat = k.sonFiyat;
        komisyon = k.komisyon;
      }
    }
    // Müşteri ekranda gördüğü tutarı onayladı; arada kural/kampanya/kupon
    // değiştiyse sessizce başka tutar alınmaz.
    if (Math.abs(sonFiyat - input.totalPrice) > Math.max(1, sonFiyat * 0.005)) {
      return NextResponse.json(
        {
          error: `Fiyat güncellendi: ödenecek tutar artık ${eur(sonFiyat)}. Odaları yeniden arayıp güncel fiyatla devam et.`,
          code: "FIYAT_DEGISTI",
          yeniFiyat: sonFiyat,
        },
        { status: 409 }
      );
    }
    const uygulananlar = kupon
      ? [...fiyat.appliedRules, { ruleId: `kupon-${kupon.id}`, name: `Kupon ${kupon.kod}`, type: "PERCENTAGE_DISCOUNT", value: 0, discountAmount: kupon.tutar }]
      : fiyat.appliedRules;

    // ── 1. Fiyat kodunu ayır ──
    const ayrilan = fiyatKodunuAyir(input.priceCode);
    if (!ayrilan) {
      return NextResponse.json({ error: "Bu oda için rezervasyon zaten işleniyor", code: "ISLENIYOR" }, { status: 409 });
    }

    const otel = await prisma.hotel.findUnique({ where: { hotelCode: kayit.hotelCode }, select: { name: true } });
    const clientReferenceId = generateClientReferenceId();

    // ── 2. PENDING kayıt + kupon kullanımı ──
    let rezervasyon;
    try {
      rezervasyon = await prisma.$transaction(async (tx) => {
        const r = await tx.reservation.create({
          data: {
            clientReferenceId,
            priceCode: input.priceCode,
            hotelCode: kayit.hotelCode,
            hotelName: otel?.name ?? input.hotelName ?? null,
            userId,
            agencyId: agencyId ?? null,
            checkIn: new Date(`${kayit.checkIn}T00:00:00Z`),
            checkOut: new Date(`${kayit.checkOut}T00:00:00Z`),
            status: "PENDING",
            totalPrice: kayit.tutar,
            discountedPrice: sonFiyat,
            discountAmount: fiyat.totalDiscount + (kupon?.tutar ?? 0),
            currency: kayit.para,
            boardType: kayit.boardType || null,
            roomType: kayit.roomName || null,
            contactName: `${input.contact.name} ${input.contact.surname}`,
            contactEmail: input.contact.email,
            contactPhone: input.contact.phone,
            guests: misafirler,
            cancellationPolicy: politikalariOranla(kayit.iptal, kayit.tutar, sonFiyat) as unknown as Prisma.InputJsonArray,
            appliedPriceRules: uygulananlar,
            commissionAmount: agencyId ? komisyon : null,
            discountId: fiyat.kampanya?.id ?? null,
            campaignDiscount: fiyat.kampanya?.tutar ?? null,
            couponId: kupon?.id ?? null,
            couponDiscount: kupon?.tutar ?? null,
            source: agencyId ? "AGENCY" : "CUSTOMER",
            // Ödeme sayfasındaki özel istek; rezervasyon detayında görünür.
            notes: input.additionalInfo ?? null,
          },
        });
        if (kupon) await kuponAyir(tx, { kupon, userId, reservationId: r.id, tutar: kupon.tutar });
        return r;
      });
    } catch (e) {
      fiyatKodunuGeriKoy(input.priceCode, ayrilan);
      if (e instanceof KuponAlinamadi) return NextResponse.json({ error: e.message, alan: "kupon" }, { status: 422 });
      if ((e as { code?: string }).code === "P2002") {
        return NextResponse.json({ error: "Bu oda için rezervasyon zaten yapıldı", code: "ISLENIYOR" }, { status: 409 });
      }
      throw e;
    }

    // ── 3. Etscore ──
    let onay;
    try {
      onay = await createBooking(
        {
          feedId,
          roomSearchId: kayit.roomSearchId,
          priceCode: input.priceCode,
          clientReferenceId,
          hotelCode: kayit.hotelCode,
          checkIn: kayit.checkIn,
          checkOut: kayit.checkOut,
          currency: kayit.para,
          contact: input.contact,
          rooms: input.rooms,
          additionalInfo: input.additionalInfo,
        },
        ayrilan
      );
    } catch (e) {
      const hata = e instanceof EtscoreError ? e : null;
      if (hata && !hata.belirsiz) {
        // Reddedildi: rezervasyon oluşmadı. Kayıt FAILED, kupon ve fiyat kodu geri.
        await prisma
          .$transaction(async (tx) => {
            await tx.reservation.update({
              where: { id: rezervasyon.id },
              data: { status: "FAILED", priceCode: null, statusNote: kisalt(`Etscore reddetti: ${hata.code ?? hata.status} ${hata.message}`) },
            });
            await kuponBirak(tx, rezervasyon.id);
          })
          .catch((x) => console.error("[BOOKING_RED_KAYDI]", rezervasyon.id, x));
        fiyatKodunuGeriKoy(input.priceCode, ayrilan);
        console.warn("[POST /api/booking] Etscore reddetti", clientReferenceId, hata.status, hata.code, hata.message);
        // Etscore'un giriş/yetki sorunu bizim tarafımızda: kullanıcıya iç mesaj gösterme.
        const bizde = hata.code === null && (hata.status === 401 || hata.status === 403);
        return NextResponse.json(
          bizde
            ? { error: "Rezervasyon şu an yapılamıyor; lütfen biraz sonra tekrar dene." }
            : { error: hata.message, code: hata.code },
          { status: bizde ? 503 : hata.status === 409 ? 409 : 422 }
        );
      }
      // Sonuç belirsiz: rezervasyon oluşmuş olabilir. Kayıt PENDING kalır.
      console.error("[POST /api/booking] sonuç belirsiz", clientReferenceId, e);
      const not = kisalt(`Etscore yanıtı alınamadı (${e instanceof Error ? e.message : String(e)}). clientReferenceId ${clientReferenceId} ile kontrol edin.`);
      await prisma.reservation
        .update({ where: { id: rezervasyon.id }, data: { needsReview: true, statusNote: not } })
        .catch((x) => console.error("[BOOKING_BELIRSIZ_KAYDI]", rezervasyon.id, x));
      await yoneticilereBildir({
        type: "RESERVATION_FAILED",
        title: "Rezervasyon kontrol bekliyor",
        message: `${otel?.name ?? kayit.hotelCode} (${kayit.checkIn}) rezervasyonunda Etscore yanıtı alınamadı. Referans: ${clientReferenceId}.`,
      }).catch((x) => console.error("[BOOKING_BILDIRIM]", x));
      return NextResponse.json(
        {
          reservation: rezervasyonYaniti(rezervasyon, userRole),
          belirsiz: true,
          message: "Rezervasyon talebin alındı; otelden onay bekleniyor. Sonucu Rezervasyonlarım'da göreceksin.",
        },
        { status: 202 }
      );
    }

    // ── Onay: kaydı güncelle ──
    const tedarikciFiyati = onay.totalPrice > 0 ? onay.totalPrice : kayit.tutar;
    const fiyatFarki = Math.abs(tedarikciFiyati - kayit.tutar) > 0.01;
    const guncel = await prisma.reservation
      .update({
        where: { id: rezervasyon.id },
        data: {
          bookingNumber: onay.bookingNumber || null,
          hotelConfirmationNumber: onay.hotelConfirmationNumber || null,
          roomConfirmationCodes: onay.roomConfirmationCodes ?? [],
          status: onay.status === "CONFIRMED" ? "CONFIRMED" : "PENDING",
          totalPrice: tedarikciFiyati,
          ...(fiyatFarki && {
            needsReview: true,
            statusNote: `Etscore'un aldığı tutar aramadakinden farklı: ${kayit.tutar} → ${tedarikciFiyati} ${kayit.para}`,
          }),
        },
      })
      .catch(async (x) => {
        // Etscore'da rezervasyon var, kayıt güncellenemedi: PENDING satır
        // clientReferenceId ile duruyor; yönetim tamamlar.
        console.error("[BOOKING_ONAY_KAYDI]", rezervasyon.id, onay.bookingNumber, x);
        await yoneticilereBildir({
          type: "RESERVATION_FAILED",
          title: "Rezervasyon kaydı tamamlanamadı",
          message: `Etscore onayladı (${onay.bookingNumber}) ama kayıt güncellenemedi. Referans: ${clientReferenceId}.`,
        }).catch(() => {});
        return { ...rezervasyon, bookingNumber: onay.bookingNumber, status: "CONFIRMED" as const };
      });

    // Onay e-postası iletişim adresine (arka planda; gönderilemezse akış bozulmaz).
    if (guncel.status === "CONFIRMED" && guncel.contactEmail) {
      const e = rezervasyonOnayEpostasi({ ...guncel, boardTypeName: kayit.boardTypeName });
      void epostaGonder({ to: guncel.contactEmail, ...e }).catch((x) => console.error("[BOOKING_EPOSTA]", guncel.id, x));
    }

    return NextResponse.json(
      {
        reservation: rezervasyonYaniti(guncel, userRole),
        bookingConfirmation: { bookingNumber: onay.bookingNumber, status: onay.status },
        pricing: {
          finalPrice: sonFiyat,
          totalDiscount: fiyat.totalDiscount + (kupon?.tutar ?? 0),
          kampanya: fiyat.kampanya,
          kupon: kupon && { kod: kupon.kod, tutar: kupon.tutar },
          ...(userRole === "AGENCY" ? { commissionAmount: komisyon } : {}),
          ...(userRole === "ADMIN" ? { originalPrice: fiyat.originalPrice, appliedRules: uygulananlar } : {}),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/booking]", error);
    return NextResponse.json({ error: "Rezervasyon oluşturulurken bir hata oluştu" }, { status: 500 });
  }
}
