"use client";

// Favoriler: kalbe basılan oteller (girişliyken hesapta, girişsiz bu cihazda).
// Her otelin kartı /api/hotels/{kod} ile doldurulur; kalbe tekrar basınca
// listeden çıkar.

import * as React from "react";
import Link from "next/link";
import { useQueries } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useFavoriler } from "@/components/lb/favoriler";
import { OtelKarti, OtelKartiIskelet } from "@/components/lb/otel-karti";
import { Nesne } from "@/components/lb/nesne";
import { HesapKabugu } from "./kabuk";
import s from "./hesap.module.css";

interface FavOtel {
  hotelCode: string;
  name?: string;
  stars?: number | null;
  address?: string | null;
  images?: { url: string; isMain?: boolean }[];
  thumbnailImage?: string | null;
  location?: { name: string; parent?: { name: string } | null } | null;
}

export function Favoriler() {
  const { fav, degistir, hazir } = useFavoriler();
  const girisli = useSession().status === "authenticated";
  // Kalpten çıkarılan kart hemen kaybolmasın: sayfa açıkken sırayı koru, geri eklenebilsin.
  const [kodlar, setKodlar] = React.useState<string[] | null>(null);
  if (hazir && kodlar === null) setKodlar([...fav].reverse());

  const sorgular = useQueries({
    queries: (kodlar ?? []).map((kod) => ({
      queryKey: ["otel", kod],
      queryFn: async (): Promise<FavOtel> => {
        const r = await fetch(`/api/hotels/${encodeURIComponent(kod)}`);
        if (!r.ok) throw new Error(r.status === 404 ? "yok" : "hata");
        return r.json();
      },
      staleTime: 10 * 60_000,
      retry: (n: number, e: Error) => e.message !== "yok" && n < 1,
    })),
  });

  let govde: React.ReactNode;
  if (!kodlar) {
    govde = <ul className={s.favIzgara} aria-busy="true">{Array.from({ length: 4 }, (_, i) => <OtelKartiIskelet key={i} />)}</ul>;
  } else if (!kodlar.length) {
    govde = (
      <div className={s.bos}>
        <Nesne ad="kartpostal" boyut={110} />
        <h2 className="lb-y">Henüz favorin yok</h2>
        <p>Aramada beğendiğin otelin kalbine bas; hepsini burada toplarız.</p>
        <Link href="/" className={`${s.dugme} ${s.siyah}`}>Otel ara</Link>
      </div>
    );
  } else {
    govde = (
      <ul className={s.favIzgara}>
        {kodlar.map((kod, i) => {
          const q = sorgular[i];
          if (q?.isPending) return <OtelKartiIskelet key={kod} />;
          // Artık bulunamayan otel (kaldırılmış) sessizce atlanır.
          if (!q?.data) return null;
          const o = q.data;
          const foto = o.images?.find((g) => g.isMain)?.url ?? o.images?.[0]?.url ?? o.thumbnailImage ?? null;
          const yer = o.location ? [o.location.name, o.location.parent?.name].filter(Boolean).join(", ") : o.address;
          return (
            <OtelKarti
              key={kod}
              sira={i}
              otel={{ kod, ad: o.name ?? kod, foto, yildiz: o.stars ?? 0, yer: yer || null }}
              href={`/hotel/${kod}`}
              favori={fav.has(kod)}
              onFavori={() => degistir(kod)}
            />
          );
        })}
      </ul>
    );
  }

  const sayi = kodlar ? kodlar.filter((k, i) => fav.has(k) && !sorgular[i]?.isError).length : 0;
  return (
    <HesapKabugu kirinti="Favoriler" herkeseAcik>
      <div className={s.favBas}>
        <div>
          <h1 className="lb-y">Favoriler</h1>
          <p>
            {girisli
              ? sayi ? `${sayi} otel · hesabına kayıtlı` : "Kalbe bastığın oteller hesabına kaydedilir"
              : sayi ? `${sayi} otel · giriş yaptığında hesabına kaydedilir` : "Giriş yaptığında favorilerin hesabına kaydedilir"}
          </p>
        </div>
      </div>
      {govde}
    </HesapKabugu>
  );
}
