"use client";

// Favoriler — şimdilik bu cihazda (localStorage); /favoriler bunları listeler.
// Hesaba bağlı favoriler ayrı iş.

import * as React from "react";

const ANAHTAR = "lookbet.favoriler";

export function useFavoriler() {
  const [fav, setFav] = React.useState<Set<string>>(() => new Set());
  const [hazir, setHazir] = React.useState(false);
  React.useEffect(() => {
    try {
      const k = localStorage.getItem(ANAHTAR);
      if (k) setFav(new Set(JSON.parse(k)));
    } catch {}
    setHazir(true);
  }, []);
  const degistir = React.useCallback(
    (kod: string) =>
      setFav((f) => {
        const y = new Set(f);
        if (y.has(kod)) y.delete(kod);
        else y.add(kod);
        try {
          localStorage.setItem(ANAHTAR, JSON.stringify([...y]));
        } catch {}
        return y;
      }),
    []
  );
  return { fav, degistir, hazir };
}
