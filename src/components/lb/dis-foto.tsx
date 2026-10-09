"use client";
/* eslint-disable @next/next/no-img-element -- tedarikçi görselleri dış kaynaklı */

// Tedarikçiden gelen otel/oda fotoğrafları. Bazı adresler açılmıyor (ör. etstur
// görsel sunucusu başka sitelerden gösterilmeye izin vermiyor, 403); tarayıcının
// kırık görsel simgesi yerine yedek gösterilir ya da fotoğraf listeden düşülür.
// Açılmayan adresler oturum boyunca akılda: aynı fotoğraf başka sayfada tekrar
// denenmez, galerideki sayaç da açılanlara göre sayar.

import * as React from "react";

const BOS: ReadonlySet<string> = new Set();
let kirik = BOS;
const dinleyiciler = new Set<() => void>();

export function kirikBildir(url: string) {
  if (kirik.has(url)) return;
  kirik = new Set(kirik).add(url);
  dinleyiciler.forEach((f) => f());
}

function abone(f: () => void) {
  dinleyiciler.add(f);
  return () => void dinleyiciler.delete(f);
}

/** Açılamayan fotoğraf adresleri; biri eklenince yeni küme döner (useMemo bağımlılığı olabilir). */
export function useKirikFotolar(): ReadonlySet<string> {
  return React.useSyncExternalStore(abone, () => kirik, () => BOS);
}

/** Tek fotoğraf: adres yoksa ya da açılmazsa `yedek`. */
export function DisFoto({ src, yedek = null, ...ozellik }: Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src: string | null | undefined;
  yedek?: React.ReactNode;
}) {
  const k = useKirikFotolar();
  if (!src || k.has(src)) return <>{yedek}</>;
  return <img src={src} alt="" {...ozellik} onError={() => kirikBildir(src)} />;
}
