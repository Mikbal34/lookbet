"use client";

// "Yaklaşan rezervasyonun" — uygulama ana sayfasında arama kartının hemen
// altında duran vurgulu kart.
//
// Neden akış içinde, perde değil: Pegasus bunu her açılışta tam ekran perde
// olarak gösteriyor, ama o perde 86 gün sonrası için bile çıkıp yeni arama
// yapmak isteyeni durduruyor. Otelde aciliyet uçaktakinden farklı; kart
// gövdenin ilk öğesi olduğu için zaten kaçırılmıyor.
//
// Veri yoksa (girişsiz kullanıcı, rezervasyonu olmayan kullanıcı) hiçbir şey
// render edilmiyor — boş bir "henüz rezervasyonun yok" kutusu ana sayfada
// yer kaplamasın.

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { CalendarCheck, ChevronRight, Moon } from "lucide-react";
import { formatDateRange, getNightCount } from "@/lib/utils";

type Rezervasyon = {
  id: string;
  hotelName: string | null;
  hotelCode: string;
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

  return (
    <section className="b2c-only px-4 pt-5" aria-label="Yaklaşan rezervasyonun">
      <Link
        href={`/reservations/${data.id}`}
        className="flex items-center gap-3 rounded-xl border border-navy/15 bg-chip-blue px-4 py-3.5 active:bg-chip"
      >
        <CalendarCheck className="size-5 shrink-0 text-navy" aria-hidden="true" />

        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold tracking-[0.1em] text-navy uppercase">
            {kalanGun > 0
              ? `Konaklamana ${kalanGun} gün kaldı`
              : "Konaklaman devam ediyor"}
          </p>
          <p className="mt-0.5 truncate text-[15px] font-bold text-ink">
            {data.hotelName || data.hotelCode}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-slate-text">
            {formatDateRange(data.checkIn, data.checkOut)}
            <Moon className="size-3" aria-hidden="true" />
            {geceler} gece
          </p>
        </div>

        <ChevronRight className="size-5 shrink-0 text-navy" aria-hidden="true" />
      </Link>
    </section>
  );
}
