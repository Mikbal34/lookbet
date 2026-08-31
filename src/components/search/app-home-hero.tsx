"use client";

// Uygulama ana sayfasının turuncu bloğu: tam genişlik kampanya karuseli ve
// alt kenarına binen arama kartı.
//
// Karusel kimlik çubuğunun ALTINDAN başlıyor (-mt ile yukarı çekiliyor);
// çubuk saydam olduğu için görsel onun arkasından görünüyor. Slaytların
// içeriği üstte çubuğun, altta arama kartının altında kalmasın diye
// dolgulanmış.
//
// Arama kartı üç satıra bölündü (nereye / tarih / kişi). Üçü de aynı tam
// ekran arama katmanını açıyor — mobilde satır içi form doldurmak yerine
// odaklı bir ekrana geçmek, Pegasus'un ve Booking'in yaptığı.

import * as React from "react";
import {
  LbAra,
  LbKonum,
  LbMisafir,
  LbTakvimDuz,
  type IkonProps,
} from "@/components/ui/icons";
import { CAMPAIGNS } from "@/lib/constants/campaigns";
import { cn } from "@/lib/utils/cn";
import { formatDateRange } from "@/lib/utils";

export interface AppHomeHeroProps {
  destination?: string;
  checkIn?: string;
  checkOut?: string;
  adults?: number;
  onAc: () => void;
}

export function AppHomeHero({
  destination,
  checkIn,
  checkOut,
  adults = 2,
  onAc,
}: AppHomeHeroProps) {
  const [aktif, setAktif] = React.useState(0);
  const seritRef = React.useRef<HTMLDivElement | null>(null);

  const seritKaydi = () => {
    const el = seritRef.current;
    if (!el || el.clientWidth === 0) return;
    setAktif(Math.round(el.scrollLeft / el.clientWidth));
  };

  const tarihMetni =
    checkIn && checkOut ? formatDateRange(checkIn, checkOut) : "Tarih seç";

  return (
    <div className="b2c-only relative bg-paper">
      {/* Karusel — kimlik çubuğunun altından başlar */}
      <div className="relative">
      <div
        ref={seritRef}
        onScroll={seritKaydi}
        className="no-scrollbar -mt-14 flex snap-x snap-mandatory overflow-x-auto"
        aria-label="Kampanyalar"
      >
        {CAMPAIGNS.map((k) => (
          <div
            key={k.code}
            className="relative h-72 w-full shrink-0 snap-center bg-navy"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={k.image}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover"
              loading="lazy"
            />
            {/* İki ayrı okunabilirlik maskesi. Tek bir baştan sona gradyan,
                ortada zayıf kalıp metni parlak gökyüzünün üstünde okunmaz
                bırakıyordu. */}
            <div
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-ink/55 to-transparent"
            />
            <div
              aria-hidden="true"
              className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-ink/90 via-ink/55 to-transparent"
            />

            <div className="relative flex h-full flex-col justify-end px-4 pt-14 pb-[68px]">
              <span className="text-[10px] font-bold tracking-[0.14em] text-white/90 uppercase">
                {k.tag} · {k.until}
              </span>
              <div className="mt-1 flex items-end gap-2">
                <span className="text-[32px] leading-none font-extrabold text-gold">
                  {k.amount}
                </span>
                <span className="pb-0.5 text-[15px] leading-tight font-bold text-white">
                  {k.title}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Nokta göstergesi — karuselin alt kenarından yukarıda, arama kartının
          bindiği yerin (32px) üstünde kalacak şekilde. */}
      <div
        className="absolute inset-x-0 bottom-11 flex justify-center gap-1.5"
        aria-hidden="true"
      >
        {CAMPAIGNS.map((k, i) => (
          <span
            key={k.code}
            className={cn(
              "h-1.5 rounded-full transition-all",
              i === aktif ? "w-4 bg-white" : "w-1.5 bg-white/45"
            )}
          />
        ))}
      </div>
      </div>

      {/* Arama kartı — karuselin alt kenarına biniyor */}
      <div className="relative -mt-8 px-4 pb-4">
        <div className="overflow-hidden rounded-xl bg-white shadow-[0_10px_26px_-8px_rgb(11_13_20/0.4)]">
          <SatirDugmesi
            ikon={LbKonum}
            etiket="Nereye"
            deger={destination || "Şehir, bölge veya otel"}
            dolu={!!destination}
            onClick={onAc}
          />
          <SatirDugmesi
            ikon={LbTakvimDuz}
            etiket="Tarih"
            deger={tarihMetni}
            dolu={!!(checkIn && checkOut)}
            onClick={onAc}
          />
          <SatirDugmesi
            ikon={LbMisafir}
            etiket="Kişi"
            deger={`${adults} Yetişkin`}
            dolu
            onClick={onAc}
            sonSatir
          />

          <button
            type="button"
            onClick={onAc}
            className="flex h-12 w-full items-center justify-center gap-2 bg-gold text-[15px] font-bold text-ink active:bg-gold-dark"
          >
            <LbAra size={16} />
            Otel ara
          </button>
        </div>
      </div>
    </div>
  );
}

function SatirDugmesi({
  ikon: Ikon,
  etiket,
  deger,
  dolu,
  onClick,
  sonSatir = false,
}: {
  ikon: React.ComponentType<IkonProps>;
  etiket: string;
  deger: string;
  dolu: boolean;
  onClick: () => void;
  sonSatir?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        // 46px: dokunma hedefi için yeterli, üç satır + CTA'yı şişirmeyecek
        // kadar da dar.
        "flex h-[46px] w-full items-center gap-2.5 px-3.5 text-left active:bg-chip",
        !sonSatir && "border-b border-line"
      )}
    >
      <Ikon size={16} className="text-navy" />
      <span className="w-12 shrink-0 text-[11.5px] font-semibold text-muted">
        {etiket}
      </span>
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-right text-[14px] font-bold",
          dolu ? "text-ink" : "text-muted/70"
        )}
      >
        {deger}
      </span>
    </button>
  );
}
