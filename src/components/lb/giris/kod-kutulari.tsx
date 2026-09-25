"use client";

// 6 haneli giriş kodu: her hane ayrı kutu. Yazdıkça ilerler, geri tuşu bir
// önceki kutuya döner, yapıştırılan kod kutulara dağılır; altı hane dolunca
// onTamam çağrılır. Hatada üst bileşen `titre`yi artırır: kutular sallanır,
// yeniden kurulur ve ilk kutu odak alır.

import * as React from "react";
import s from "./kod-kutulari.module.css";

export function KodKutulari({ deger, onDegis, onTamam, titre = 0 }: {
  deger: string[];
  onDegis: (y: string[]) => void;
  onTamam: (kod: string) => void;
  titre?: number;
}) {
  const kutular = React.useRef<(HTMLInputElement | null)[]>([]);

  const yaz = (i: number, v: string) => {
    const r = v.replace(/\D/g, "");
    const y = [...deger];
    if (r.length > 1) {
      r.slice(0, 6 - i).split("").forEach((c, j) => (y[i + j] = c));
      kutular.current[Math.min(5, i + r.length)]?.focus();
    } else {
      y[i] = r;
      if (r && i < 5) kutular.current[i + 1]?.focus();
    }
    onDegis(y);
    if (y.join("").length === 6) onTamam(y.join(""));
  };

  return (
    <div key={titre} className={s.kod} data-titre={titre > 0 || undefined} role="group" aria-label="6 haneli kod">
      {deger.map((c, i) => (
        <input
          key={i}
          ref={(e) => {
            kutular.current[i] = e;
          }}
          value={c}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          autoFocus={i === 0}
          aria-label={`${i + 1}. hane`}
          data-dolu={!!c || undefined}
          onChange={(e) => {
            const v = e.target.value;
            // Dolu kutuya yazılınca eski rakamı at, yenisini al.
            yaz(i, c && v.length === 2 ? (v.startsWith(c) ? v.slice(1) : v.slice(0, 1)) : v);
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !c && i > 0) {
              const y = [...deger];
              y[i - 1] = "";
              onDegis(y);
              kutular.current[i - 1]?.focus();
              e.preventDefault();
            }
            if (e.key === "ArrowLeft" && i > 0) kutular.current[i - 1]?.focus();
            if (e.key === "ArrowRight" && i < 5) kutular.current[i + 1]?.focus();
          }}
          onPaste={(e) => {
            const r = e.clipboardData.getData("text").replace(/\D/g, "");
            if (!r) return;
            e.preventDefault();
            yaz(0, r);
          }}
        />
      ))}
    </div>
  );
}
