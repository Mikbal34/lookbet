"use client";

// Alışveriş ekranlarında (arama, otel, oda, ödeme) fiyat seçilen para
// biriminde: üst çubuktaki dil/para penceresi. Fiyatlar EUR; TL, USD ya da GBP
// seçildiyse TCMB kuruyla YAKLAŞIK gösterilir (/api/kur, saatte bir). Ödeme ve
// kayıt EUR — ödeme sayfası bunu ayrıca yazar. Rezervasyon geçmişi ve paneller
// kaydedildiği birimde kalır (otel-detay/yardimci para()).

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocale } from "@/components/providers/locale-provider";

interface Kurlar {
  kaynak: string;
  tarih: string;
  eur: Record<string, number>;
}

const bicim = (n: number, birim: string) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: birim || "EUR", maximumFractionDigits: 0 }).format(n);

export function useFiyat() {
  const { currency } = useLocale();
  const hedef = currency || "EUR";
  const kur = useQuery({
    queryKey: ["kur"],
    queryFn: async (): Promise<Kurlar | null> => {
      const r = await fetch("/api/kur");
      return r.ok ? r.json() : null;
    },
    staleTime: 60 * 60_000,
    enabled: hedef !== "EUR",
  });
  const oran = hedef === "EUR" ? null : (kur.data?.eur?.[hedef] ?? null);
  /** EUR tutarı seçilen birimde (kur yoksa ya da tutar başka birimdeyse olduğu gibi). */
  const yaz = React.useCallback(
    (tutar: number, kaynak = "EUR") => (oran && (kaynak || "EUR") === "EUR" ? bicim(tutar * oran, hedef) : bicim(tutar, kaynak)),
    [oran, hedef]
  );
  return {
    yaz,
    /** Tutarlar çevrilerek mi gösteriliyor (EUR dışı birim ve kur var). */
    cevrildi: !!oran,
    /** Gösterimdeki birim. */
    birim: oran ? hedef : "EUR",
    /** TCMB bülten tarihi (GG.AA.YYYY). */
    kurTarihi: kur.data?.tarih ?? null,
    /** Asıl (ödeme) biriminde yazım. */
    asil: bicim,
  };
}
