// Rezervasyon onayı: anahtar kartı gelir, numara ve iki yol (Rezervasyonlarım,
// yeni arama). Otel adı ve tarihler ödeme sayfasından adresle gelir.

import type { Metadata } from "next";
import Link from "next/link";
import { AltBilgi } from "@/components/lb/alt-bilgi";
import { Nesne } from "@/components/lb/nesne";
import { AYLAR, isoOku } from "@/components/lb/arama/durum";
import s from "@/components/odeme/onay.module.css";

export const metadata: Metadata = { title: "Rezervasyon onaylandı — LookBeds" };

const gun = (d: Date | null) => (d ? `${d.getDate()} ${AYLAR[d.getMonth()]}` : "");

export default async function OnaySayfasi({ searchParams }: {
  searchParams: Promise<{ bookingNumber?: string; hotelName?: string; checkIn?: string; checkOut?: string }>;
}) {
  const { bookingNumber, hotelName, checkIn, checkOut } = await searchParams;
  const giris = isoOku(checkIn);
  const cikis = isoOku(checkOut);
  const ozet = [hotelName, giris && cikis ? `${gun(giris)} – ${gun(cikis)} ${cikis.getFullYear()}` : null].filter(Boolean).join(" · ");

  return (
    <div className={`lb ${s.sayfa}`}>
      <header className={s.ust}>
        <Link href="/" className={`lb-y ${s.logo}`}>LookBeds</Link>
      </header>
      <main className={s.ana}>
        <div className={s.kart}>
          <Nesne ad="anahtar-karti" boyut={150} className={s.nesne} />
          <h1 className="lb-y">Rezervasyonun onaylandı!</h1>
          {ozet && <p className={s.ozet}>{ozet}</p>}
          <p>Onay bilgileri e-posta adresine gönderilecek.</p>
          {bookingNumber && (
            <div className={s.no}>
              <small>Rezervasyon numarası</small>
              <b aria-label={`Rezervasyon numarası: ${bookingNumber}`}>{bookingNumber}</b>
              <span>Otelde bu numara sorulabilir</span>
            </div>
          )}
          <div className={s.yollar}>
            <Link href="/reservations" className={s.dugme}>Rezervasyonlarım</Link>
            <Link href="/" className={s.ikincil}>Yeni arama</Link>
          </div>
        </div>
      </main>
      <AltBilgi />
    </div>
  );
}
