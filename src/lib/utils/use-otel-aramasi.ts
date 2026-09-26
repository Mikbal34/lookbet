"use client";

// Otel araması — sonuçlar gelen gelene.
//
// /api/hotels/search'ü akış (NDJSON) modunda çağırır: Etscore'a 50'lik
// paketler paralel gidiyor, her paketin otelleri geldiği anda listeye
// ekleniyor. İlk oteller ~0,3 sn'de görünüyor, liste ~2,5 sn'de tamamlanıyor
// (İstanbul). Önceden kullanıcı tüm liste gelene kadar (~6 sn) boş iskelete
// bakıyordu.
//
// Sonuçlar 5 dakika bellekte: otelden geri dönünce iskelet yanıp sönmesin.
// Sunucuda ayrıca 10 dakikalık önbellek var (lib/arama-onbellegi.ts).

import { sunucuMesaji } from "@/lib/utils";
import * as React from "react";
import { useTranslations } from "next-intl";
import type { HotelSearchResult } from "@/lib/royal-api/types";

export type AramaDurumu = "bekliyor" | "akiyor" | "bitti" | "hata";

export interface OtelAramasi {
  hotels: HotelSearchResult[];
  durum: AramaDurumu;
  hata: string | null;
  /** Hiç otel gelmeden bekleniyor: iskelet göster. */
  ilkYukleme: boolean;
  /** Oteller geliyor, liste henüz tamam değil. */
  devamEdiyor: boolean;
}

const ISTEMCI_OMRU_MS = 5 * 60 * 1000;
const istemciOnbellegi = new Map<string, { hotels: HotelSearchResult[]; zaman: number }>();

type Satir =
  | { tip: "bas"; searchId: string; eslesme: string; onbellek: boolean }
  | { tip: "oteller"; hotels: HotelSearchResult[] }
  | { tip: "son"; toplam: number }
  | { tip: "hata"; error: string };

export function useOtelAramasi(payload: object, etkin: boolean): OtelAramasi {
  const anahtar = React.useMemo(() => JSON.stringify(payload), [payload]);
  const [durum, setDurum] = React.useState<AramaDurumu>("bekliyor");
  const [hotels, setHotels] = React.useState<HotelSearchResult[]>([]);
  const [hata, setHata] = React.useState<string | null>(null);
  // Sunucu mesaj vermezse gösterilen metin; dil değişince arama yeniden başlamasın.
  const t = useTranslations("arama.hata");
  const tk = useTranslations("ortak");
  const yedekHata = React.useEffectEvent(() => t("arama"));
  const cokSik = React.useEffectEvent(() => tk("cokSik"));

  React.useEffect(() => {
    if (!etkin) return;

    const kayit = istemciOnbellegi.get(anahtar);
    if (kayit && Date.now() - kayit.zaman < ISTEMCI_OMRU_MS) {
      setHotels(kayit.hotels);
      setHata(null);
      setDurum("bitti");
      return;
    }

    const iptal = new AbortController();
    let toplanan: HotelSearchResult[] = [];
    setHotels([]);
    setHata(null);
    setDurum("akiyor");

    const satiriIsle = (satir: Satir) => {
      if (satir.tip === "oteller") {
        toplanan = [...toplanan, ...satir.hotels];
        setHotels(toplanan);
      } else if (satir.tip === "son") {
        istemciOnbellegi.set(anahtar, { hotels: toplanan, zaman: Date.now() });
        setDurum("bitti");
      } else if (satir.tip === "hata") {
        setHata(satir.error);
        setDurum("hata");
      }
    };

    (async () => {
      try {
        const res = await fetch("/api/hotels/search", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/x-ndjson" },
          body: anahtar,
          signal: iptal.signal,
        });
        if (!res.ok) throw new Error(await sunucuMesaji(res, yedekHata(), cokSik()));

        // Akış desteklenmiyorsa (ör. araya giren bir vekil) tek JSON'a düş.
        if (!res.body || !res.headers.get("content-type")?.includes("ndjson")) {
          const d = (await res.json()) as { hotels?: HotelSearchResult[] };
          satiriIsle({ tip: "oteller", hotels: d.hotels ?? [] });
          satiriIsle({ tip: "son", toplam: d.hotels?.length ?? 0 });
          return;
        }

        const okuyucu = res.body.getReader();
        const cozucu = new TextDecoder();
        let tampon = "";
        for (;;) {
          const { done, value } = await okuyucu.read();
          if (done) break;
          tampon += cozucu.decode(value, { stream: true });
          let i: number;
          while ((i = tampon.indexOf("\n")) >= 0) {
            const satir = tampon.slice(0, i).trim();
            tampon = tampon.slice(i + 1);
            if (satir) satiriIsle(JSON.parse(satir) as Satir);
          }
        }
        // "son" satırı gelmeden akış kapandıysa: gelenle yetin.
        setDurum((d) => (d === "akiyor" ? "bitti" : d));
      } catch (e) {
        if (iptal.signal.aborted) return;
        setHata(e instanceof Error ? e.message : yedekHata());
        setDurum("hata");
      }
    })();

    return () => iptal.abort();
  }, [anahtar, etkin]);

  return {
    hotels,
    durum,
    hata,
    ilkYukleme: etkin && (durum === "bekliyor" || (durum === "akiyor" && hotels.length === 0)),
    devamEdiyor: durum === "akiyor" && hotels.length > 0,
  };
}
