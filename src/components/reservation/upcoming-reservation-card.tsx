"use client";

// "Yaklaşan konaklaman" — uygulama ana sayfasında arama kartının altındaki
// kart. Pegasus'un yaklaşan uçuş kartının konaklama karşılığı: düz beyaz
// kart, fotoğraf ve renkli bant yok; doğal bir cümle + kalın sayı, altında
// giriş/çıkış kolonları, sonra tam genişlik CTA.
//
// Uçuştaki "kalkış — uçak — varış" düzeninin yerini "giriş — gece sayısı —
// çıkış" alıyor.
//
// Akış içinde duruyor, perde değil: Pegasus bunu her açılışta tam ekran
// perde olarak gösteriyor ama o perde 86 gün sonrası için bile çıkıp yeni
// arama yapmak isteyeni durduruyor. Otelde aciliyet uçaktakinden farklı.
//
// Kart tıklanabilir bir blok değil, içinde iki ayrı bağlantı var (Pegasus'ta
// da öyle): birincil "Rezervasyon detayı", ikincil "Otel bilgileri".
//
// Veri yoksa hiçbir şey render edilmiyor — boş bir kutu yer kaplamasın.

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { LbBina, LbYatak } from "@/components/ui/icons";
import { getNightCount } from "@/lib/utils";

type Rezervasyon = {
  id: string;
  bookingNumber: string | null;
  hotelName: string | null;
  hotelCode: string;
  roomType: string | null;
  checkIn: string;
  checkOut: string;
  status: string;
};

async function yaklasaniGetir(): Promise<Rezervasyon | null> {
  const res = await fetch("/api/reservations?upcoming=true&limit=1");
  if (!res.ok) return null;
  const json = await res.json();
  return json?.data?.[0] ?? null;
}

/** "10 Eyl, Per" — gün, kısa ay, kısa gün adı. */
function gunAyGun(tarih: string): string {
  const d = new Date(tarih);
  if (Number.isNaN(d.getTime())) return "";
  const gunAy = new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
  }).format(d);
  const gunAdi = new Intl.DateTimeFormat("tr-TR", { weekday: "short" }).format(d);
  return `${gunAy}, ${gunAdi}`;
}

export function UpcomingReservationCard() {
  const { status: oturum } = useSession();

  // "Şimdi"yi bir kez sabitliyoruz: Date.now()'u render gövdesinde çağırmak
  // her render'da farklı sonuç üretir ve saf olmayan bir çağrıdır.
  const [simdi] = React.useState(() => Date.now());

  const { data } = useQuery({
    queryKey: ["yaklasan-rezervasyon"],
    queryFn: yaklasaniGetir,
    enabled: oturum === "authenticated",
    staleTime: 60_000,
  });

  if (!data) return null;

  const geceler = getNightCount(data.checkIn, data.checkOut);
  const kalanGun = Math.ceil(
    (new Date(data.checkIn).getTime() - simdi) / 86_400_000
  );
  const otelAdi = data.hotelName || data.hotelCode;

  return (
    <section className="b2c-only px-4 pt-5" aria-label="Yaklaşan konaklaman">
      <div className="rounded-xl border border-line bg-white p-3.5">
        <p className="text-[14px] leading-snug text-ink">
          {otelAdi}
          {"'de konaklamana "}
          <b className="font-extrabold">
            {kalanGun > 0 ? `${kalanGun} gün` : "bugün"}
          </b>
          {kalanGun > 0 ? " kaldı!" : " giriş yapıyorsun!"}
        </p>

        <div className="mt-2.5 flex items-baseline justify-between gap-3 border-t border-line pt-2.5">
          <span className="text-[12.5px] font-semibold text-slate-text">
            {gunAyGun(data.checkIn)}, {new Date(data.checkIn).getFullYear()}
          </span>
          {data.bookingNumber && (
            <span className="font-mono text-[12.5px] text-muted">
              #{data.bookingNumber}
            </span>
          )}
        </div>

        {/* Uçuştaki kalkış — uçak — varış düzeninin konaklama karşılığı */}
        <div className="mt-2.5 flex items-end justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11.5px] text-muted">Giriş</p>
            <p className="mt-0.5 text-[14px] font-bold text-ink">
              {gunAyGun(data.checkIn)}
            </p>
          </div>

          <div className="flex shrink-0 flex-col items-center pb-0.5">
            <LbYatak size={18} className="text-navy" />
            <span className="mt-0.5 text-[11px] font-semibold text-muted">
              {geceler} gece
            </span>
          </div>

          <div className="min-w-0 text-right">
            <p className="text-[11.5px] text-muted">Çıkış</p>
            <p className="mt-0.5 text-[14px] font-bold text-ink">
              {gunAyGun(data.checkOut)}
            </p>
          </div>
        </div>

        <Link
          href={`/reservations/${data.id}`}
          className="mt-3.5 flex h-11 w-full items-center justify-center rounded-lg bg-gold text-[14.5px] font-bold text-ink active:bg-gold-dark"
        >
          Rezervasyon Detayı
        </Link>

        <Link
          href={`/hotel/${data.hotelCode}`}
          className="mt-0.5 flex min-h-11 w-full items-center justify-center gap-2 text-[13px] font-semibold text-slate-text active:text-ink"
        >
          <LbBina size={16} />
          Otel bilgileri
        </Link>
      </div>
    </section>
  );
}
