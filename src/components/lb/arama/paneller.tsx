"use client";

// Arama panelleri: yer önerileri, takvim, misafirler. Masaüstü çubukta ve
// mobil tam ekran aramada aynı parçalar kullanılıyor.

import * as React from "react";
import { Ikon } from "../ikon";
import { Nesne, type NesneAdi } from "../nesne";
import {
  AYLAR, GUNLER, aralikMetni, ayniGun, geceSayisi, gunBasi, hizliTarihler,
} from "./durum";
import s from "./paneller.module.css";

/* ── Yer ─────────────────────────────────────────────────────────── */

const POPULER: { ad: string; ust: string; alt: string; nesne: NesneAdi }[] = [
  { ad: "Bodrum", ust: "Muğla", alt: "Koylar, marina ve beach club'lar", nesne: "bodrum" },
  { ad: "Antalya", ust: "Akdeniz", alt: "Her şey dahil, uzun sahil", nesne: "antalya" },
  { ad: "Kapadokya", ust: "Nevşehir", alt: "Mağara oteller ve balonlar", nesne: "kapadokya" },
  { ad: "İstanbul", ust: "Marmara", alt: "Boğaz ve tarihi yarımada", nesne: "istanbul" },
  { ad: "Uludağ", ust: "Bursa", alt: "Kayak merkezi otelleri", nesne: "kayak" },
  { ad: "Afyonkarahisar", ust: "Ege", alt: "Termal ve kaplıca otelleri", nesne: "termal" },
];

interface KonumOnerisi { id: string; ad: string; ust: string | null; tur: string; otel: number }

export function YerPaneli({ yazilan, onSec }: { yazilan: string; onSec: (ad: string, ust: string | null, id?: string | null) => void }) {
  const [oneriler, setOneriler] = React.useState<KonumOnerisi[] | null>(null);
  const q = yazilan.trim();
  React.useEffect(() => {
    if (q.length < 2) return;
    const iptal = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/konum/oneri?q=${encodeURIComponent(q)}`, { signal: iptal.signal })
        .then((r) => r.json())
        .then((d) => setOneriler(d.oneriler ?? []))
        .catch(() => {});
    }, 180);
    return () => {
      clearTimeout(t);
      iptal.abort();
    };
  }, [q]);

  if (q.length < 2 || !oneriler) {
    return (
      <div>
        <p className={s.kucukBaslik}>Önerilen yerler</p>
        {POPULER.map((p) => (
          <button key={p.ad} type="button" className={s.yer} onClick={() => onSec(p.ad, p.ust)}>
            <span className={s.kutu}><Nesne ad={p.nesne} boyut={40} /></span>
            <span><b>{p.ad}</b><small>{p.alt}</small></span>
          </button>
        ))}
      </div>
    );
  }
  if (oneriler.length === 0) {
    return (
      <div className={s.bosOneri}>
        <b>“{q}” için bir yer bulamadık</b>
        <span>Şehir, ilçe ya da bölge adıyla dene; otel adıyla da arayabilirsin.</span>
        <button type="button" className={s.yer} onClick={() => onSec(q, null)}>
          <span className={s.kutu}><Ikon ad="search" boyut={20} /></span>
          <span><b>“{q}” adıyla ara</b><small>Otel adında geçenler</small></span>
        </button>
      </div>
    );
  }
  return (
    <div>
      {oneriler.map((o) => (
        <button key={o.id} type="button" className={s.yer} onClick={() => onSec(o.ad, o.ust, o.id)}>
          <span className={s.kutu}><Ikon ad="pin" boyut={20} /></span>
          <span>
            <b>{o.ad}</b>
            <small>{[o.ust, `${o.otel.toLocaleString("tr-TR")} otel`].filter(Boolean).join(" · ")}</small>
          </span>
        </button>
      ))}
    </div>
  );
}

/* ── Takvim ──────────────────────────────────────────────────────── */

function Ay({ ay, giris, cikis, bugun, onGun, onceki, sonraki }: {
  ay: Date; giris: Date | null; cikis: Date | null; bugun: Date;
  onGun: (d: Date) => void; onceki?: () => void; sonraki?: () => void;
}) {
  const y = ay.getFullYear(), m = ay.getMonth();
  const bosluk = (new Date(y, m, 1).getDay() + 6) % 7;
  const gunSayisi = new Date(y, m + 1, 0).getDate();
  return (
    <div className={s.ay}>
      <div className={s.ayUst}>
        <button type="button" className={s.ayOk} onClick={onceki} aria-label="Önceki ay" style={{ visibility: onceki ? "visible" : "hidden" }}>
          <Ikon ad="chevron-left" boyut={16} kalinlik={2.2} />
        </button>
        <h3>{AYLAR[m]} {y}</h3>
        <button type="button" className={s.ayOk} onClick={sonraki} aria-label="Sonraki ay" style={{ visibility: sonraki ? "visible" : "hidden" }}>
          <Ikon ad="chevron-right" boyut={16} kalinlik={2.2} />
        </button>
      </div>
      <div className={s.gunler}>
        {GUNLER.map((g) => <span key={g} className={s.hg}>{g}</span>)}
        {Array.from({ length: bosluk }, (_, i) => <span key={`b${i}`} />)}
        {Array.from({ length: gunSayisi }, (_, i) => {
          const d = new Date(y, m, i + 1);
          const bas = ayniGun(d, giris), son = ayniGun(d, cikis);
          const arada = !!giris && !!cikis && d > giris && d < cikis;
          return (
            <button
              key={i}
              type="button"
              className={s.gun}
              data-bas={bas || undefined}
              data-son={son || undefined}
              data-arada={arada || undefined}
              disabled={d < bugun}
              aria-pressed={bas || son}
              aria-label={`${i + 1} ${AYLAR[m]}`}
              onClick={() => onGun(d)}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function Takvim({ giris, cikis, onDegis, ikiAy = true, hizli = true }: {
  giris: Date | null; cikis: Date | null;
  onDegis: (giris: Date | null, cikis: Date | null, bitti: boolean) => void;
  ikiAy?: boolean; hizli?: boolean;
}) {
  const bugun = React.useMemo(() => gunBasi(new Date()), []);
  const [ay, setAy] = React.useState(() => {
    const d = giris ?? bugun;
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const ilkAy = new Date(bugun.getFullYear(), bugun.getMonth(), 1);
  const sonrakiAy = new Date(ay.getFullYear(), ay.getMonth() + 1, 1);
  const secenekler = React.useMemo(() => hizliTarihler(bugun), [bugun]);

  const gunSec = (d: Date) => {
    if (!giris || cikis || d <= giris) onDegis(d, null, false);
    else onDegis(giris, d, true);
  };
  const git = (n: number) => setAy(new Date(ay.getFullYear(), ay.getMonth() + n, 1));
  const aylar = ikiAy ? [ay, sonrakiAy] : [ay];

  return (
    <div className={hizli ? s.takvimHizli : undefined}>
      {hizli && (
        <div className={s.hizli}>
          {secenekler.map((h) => (
            <button
              key={h.ad}
              type="button"
              aria-pressed={ayniGun(giris, h.bas) && ayniGun(cikis, h.son)}
              onClick={() => {
                setAy(new Date(h.bas.getFullYear(), h.bas.getMonth(), 1));
                onDegis(h.bas, h.son, true);
              }}
            >
              <b>{h.ad}</b>
              <span>{aralikMetni(h.bas, h.son)}</span>
            </button>
          ))}
        </div>
      )}
      <div>
        <div className={s.aylar} data-tek={!ikiAy || undefined}>
          {aylar.map((a, i) => (
            <Ay
              key={a.getTime()}
              ay={a}
              giris={giris}
              cikis={cikis}
              bugun={bugun}
              onGun={gunSec}
              onceki={i === 0 && a > ilkAy ? () => git(-1) : undefined}
              sonraki={i === aylar.length - 1 ? () => git(1) : undefined}
            />
          ))}
        </div>
        <div className={s.tarihAlt}>
          <span>{giris && cikis ? `${geceSayisi(giris, cikis)} gece` : "Giriş ve çıkış günlerini seç"}</span>
          <button type="button" className={s.metinDugme} onClick={() => onDegis(null, null, false)} disabled={!giris}>
            Temizle
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Misafirler ──────────────────────────────────────────────────── */

function Sayac({ ad, alt, deger, en, enCok, onDegis }: {
  ad: string; alt: string; deger: number; en: number; enCok: number; onDegis: (n: number) => void;
}) {
  return (
    <div className={s.sayac}>
      <div><b>{ad}</b><small>{alt}</small></div>
      <div className={s.sayacD}>
        <button type="button" className={s.adim} onClick={() => onDegis(deger - 1)} disabled={deger <= en} aria-label={`${ad} azalt`}>
          <Ikon ad="minus" boyut={14} kalinlik={2.2} />
        </button>
        <output aria-live="polite">{deger}</output>
        <button type="button" className={s.adim} onClick={() => onDegis(deger + 1)} disabled={deger >= enCok} aria-label={`${ad} artır`}>
          <Ikon ad="plus" boyut={14} kalinlik={2.2} />
        </button>
      </div>
    </div>
  );
}

export function MisafirPaneli({ yetiskin, cocuklar, onDegis }: {
  yetiskin: number; cocuklar: number[]; onDegis: (yetiskin: number, cocuklar: number[]) => void;
}) {
  return (
    <div>
      <Sayac ad="Yetişkin" alt="18 yaş ve üzeri" deger={yetiskin} en={1} enCok={6} onDegis={(n) => onDegis(n, cocuklar)} />
      <Sayac
        ad="Çocuk"
        alt="0–17 yaş"
        deger={cocuklar.length}
        en={0}
        enCok={4}
        onDegis={(n) => onDegis(yetiskin, n > cocuklar.length ? [...cocuklar, 6] : cocuklar.slice(0, n))}
      />
      {cocuklar.length > 0 && (
        <div className={s.yaslar}>
          <p>Fiyat çocukların yaşına göre değişiyor.</p>
          <div>
            {cocuklar.map((y, i) => (
              <label key={i}>
                <span>{i + 1}. çocuğun yaşı</span>
                <select value={y} onChange={(e) => onDegis(yetiskin, cocuklar.map((c, j) => (j === i ? +e.target.value : c)))}>
                  {Array.from({ length: 18 }, (_, n) => <option key={n} value={n}>{n === 0 ? "1 yaşından küçük" : `${n} yaş`}</option>)}
                </select>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

