// Rezervasyon onayı: anahtar kartı gelir, numara ve iki yol (Rezervasyonlarım,
// yeni arama). Otel adı ve tarihler ödeme sayfasından adresle gelir.

import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { AltBilgi } from "@/components/lb/alt-bilgi";
import { Nesne } from "@/components/lb/nesne";
import { isoOku } from "@/components/lb/arama/durum";
import { bicimleyici } from "@/i18n/bicim";
import s from "@/components/odeme/onay.module.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("odeme");
  return { title: t("onay.metaBaslik") };
}

export default async function OnaySayfasi({ searchParams }: {
  searchParams: Promise<{ bookingNumber?: string; hotelName?: string; checkIn?: string; checkOut?: string; durum?: string }>;
}) {
  const { bookingNumber, hotelName, checkIn, checkOut, durum } = await searchParams;
  const t = await getTranslations("odeme");
  const b = bicimleyici(await getLocale());
  // "bekliyor": talep alındı ama otelden onay henüz gelmedi (ya da tedarikçi
  // yanıtı gecikti); "onaylandı" denmez, numara yoksa gösterilmez.
  const onayli = durum !== "bekliyor";
  const giris = isoOku(checkIn);
  const cikis = isoOku(checkOut);
  const ozet = [hotelName, giris && cikis ? `${b.gunAyUzun(giris)} – ${b.gunAyYil(cikis)}` : null].filter(Boolean).join(" · ");

  return (
    <div className={`lb ${s.sayfa}`}>
      <header className={s.ust}>
        <Link href="/" className={`lb-y ${s.logo}`}>LookBeds</Link>
      </header>
      <main className={s.ana}>
        <div className={s.kart}>
          <Nesne ad="anahtar-karti" boyut={150} className={s.nesne} />
          <h1 className="lb-y">{onayli ? t("onay.onaylandi") : t("onay.alindi")}</h1>
          {ozet && <p className={s.ozet}>{ozet}</p>}
          <p>{onayli ? t("onay.epostaGonderildi") : t("onay.onayBekleniyor")}</p>
          {bookingNumber && (
            <div className={s.no}>
              <small>{t("onay.numara")}</small>
              <b aria-label={t("onay.numaraEtiket", { no: bookingNumber })}>{bookingNumber}</b>
              <span>{t("onay.numaraNot")}</span>
            </div>
          )}
          <div className={s.yollar}>
            <Link href="/reservations" className={s.dugme}>{t("onay.rezervasyonlarim")}</Link>
            <Link href="/" className={s.ikincil}>{t("onay.yeniArama")}</Link>
          </div>
        </div>
      </main>
      <AltBilgi />
    </div>
  );
}
