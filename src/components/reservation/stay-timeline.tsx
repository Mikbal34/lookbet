"use client";

// Konaklama zaman çizelgesi.
//
// Pegasus'un uçuş detayındaki dikey çizgisinin karşılığı: bilgiyi "veri
// kategorisi"ne göre değil, ne zaman olacağına göre diziyor. Uçuşta
// hazırlık → check-in → bagaj → uçuş; konaklamada rezervasyon → giriş →
// konaklama → çıkış.
//
// Fark şu: kategoriye göre dizilmiş bir sayfa ("Konaklama Detayları",
// "Oda Bilgileri") her alanı eşit ağırlıkta gösterir ve kullanıcı aradığını
// taramak zorunda kalır. Zamana göre dizilince sayfa nerede olduğunu
// biliyor — girişten önce adres ve yol tarifi öne çıkıyor, konaklama
// sırasında oda ve pansiyon, sonrasında hepsi geçmişe düşüyor.
//
// İptal ve başarısız kayıtlarda hiç render edilmiyor: olmayacak bir yolculuğun
// adımlarını saymak yanıltıcı olur.

import * as React from "react";
import { LbKonum } from "@/components/ui/icons";
import { cn } from "@/lib/utils/cn";
import { formatDate } from "@/lib/utils";

type Durum = "tamam" | "simdi" | "bekliyor";

export interface StayTimelineProps {
  status: string;
  createdAt: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  roomType?: string | null;
  boardType?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

/** Günün başına yuvarlar — "kaç gün kaldı" saat farkından etkilenmesin. */
function gunBasi(t: number | string): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function StayTimeline({
  status,
  createdAt,
  checkIn,
  checkOut,
  nights,
  roomType,
  boardType,
  address,
  latitude,
  longitude,
}: StayTimelineProps) {
  // "Şimdi"yi bir kez sabitliyoruz: Date.now()'u render gövdesinde çağırmak
  // her render'da farklı sonuç üretir ve saf olmayan bir çağrıdır.
  const [simdi] = React.useState(() => gunBasi(Date.now()));

  const giris = gunBasi(checkIn);
  const cikis = gunBasi(checkOut);
  const kalanGun = Math.round((giris - simdi) / 86_400_000);
  const gecenGece = Math.round((simdi - giris) / 86_400_000);

  const girisDurumu: Durum =
    simdi < giris ? "simdi" : simdi === giris ? "simdi" : "tamam";
  const konaklamaDurumu: Durum =
    simdi < giris ? "bekliyor" : simdi < cikis ? "simdi" : "tamam";
  const cikisDurumu: Durum =
    simdi < cikis ? "bekliyor" : simdi === cikis ? "simdi" : "tamam";

  const yolTarifi =
    latitude != null && longitude != null
      ? `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
      : null;

  return (
    <ol className="mt-3">
      {/* Beklemedeki bir kayda "onaylandı" demek yanlış olur; otel henüz
          dönmemiş olabilir. Alt satır uydurma bir cümle değil, kaydın
          gerçekten oluşturulduğu tarih. */}
      <Adim
        durum={status === "CONFIRMED" ? "tamam" : "simdi"}
        baslik={
          status === "CONFIRMED" ? "Rezervasyon onaylandı" : "Rezervasyon alındı"
        }
        alt={`${formatDate(createdAt)} tarihinde oluşturuldu`}
      />

      <Adim
        durum={girisDurumu}
        baslik="Giriş"
        alt={formatDate(checkIn)}
        vurgu={
          kalanGun > 0
            ? `${kalanGun} gün kaldı`
            : kalanGun === 0
              ? "Bugün"
              : undefined
        }
      >
        {/* Adres ve yol tarifi girişin altında: oraya giriş günü gidiliyor,
            bilgi de o adımın yanında duruyor. */}
        {address && (
          <p className="mt-1.5 text-[13px] text-muted">{address}</p>
        )}
        {yolTarifi && (
          <a
            href={yolTarifi}
            target="_blank"
            rel="noopener noreferrer"
            className="-mb-2 inline-flex min-h-11 items-center gap-1.5 text-[13px] font-semibold text-navy-text active:text-navy-deep"
          >
            <LbKonum size={14} />
            Yol tarifi
          </a>
        )}
      </Adim>

      <Adim
        durum={konaklamaDurumu}
        baslik="Konaklama"
        alt={[`${nights} gece`, roomType, boardType].filter(Boolean).join(" · ")}
        vurgu={
          konaklamaDurumu === "simdi" && gecenGece > 0
            ? `${gecenGece + 1}. gecen`
            : undefined
        }
      />

      <Adim durum={cikisDurumu} baslik="Çıkış" alt={formatDate(checkOut)} son />
    </ol>
  );
}

function Adim({
  durum,
  baslik,
  alt,
  vurgu,
  son = false,
  children,
}: {
  durum: Durum;
  baslik: string;
  alt?: string;
  vurgu?: string;
  son?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <li className="relative flex gap-3">
      {/* İşaret sütunu — nokta ve onu bir sonrakine bağlayan çizgi */}
      <div className="flex w-4 shrink-0 flex-col items-center">
        <span
          className={cn(
            "mt-1 size-3 shrink-0 rounded-full border-2",
            durum === "bekliyor"
              ? "border-line-strong bg-paper"
              : "border-navy bg-navy",
            durum === "simdi" && "ring-3 ring-navy/20"
          )}
          aria-hidden="true"
        />
        {!son && (
          <span
            className={cn(
              "w-0.5 flex-1",
              durum === "tamam" ? "bg-navy/35" : "bg-line"
            )}
            aria-hidden="true"
          />
        )}
      </div>

      <div className={cn("min-w-0 flex-1", son ? "pb-0" : "pb-5")}>
        <div className="flex flex-wrap items-baseline gap-x-2">
          <h3
            className={cn(
              "text-[14px] font-semibold",
              durum === "bekliyor" ? "text-muted" : "text-ink"
            )}
          >
            {baslik}
          </h3>
          {vurgu && (
            <span className="text-[13px] font-bold text-navy-text">{vurgu}</span>
          )}
        </div>
        {alt && <p className="mt-0.5 text-[13px] text-muted">{alt}</p>}
        {children}
      </div>
    </li>
  );
}
