"use client";

// Arama panelleri: yer önerileri, takvim, misafirler. Masaüstü çubukta ve
// mobil tam ekran aramada aynı parçalar kullanılıyor.

import * as React from "react";
import { useTranslations } from "next-intl";
import { useBicim } from "@/i18n/use-bicim";
import { Ikon } from "../ikon";
import { Nesne, type NesneAdi } from "../nesne";
import { aralikOzeti, ayniGun, geceSayisi, gunBasi, hizliAraliklar } from "./durum";
import s from "./paneller.module.css";

/* ── Yer ─────────────────────────────────────────────────────────── */

// `ad` aramaya giden Türkçe konum adı (veritabanındaki adlarla eşleşiyor);
// görünen ad ve açıklama metinlerde (arama.yer.populer.<anahtar>).
const POPULER: { anahtar: "bodrum" | "antalya" | "kapadokya" | "istanbul" | "uludag" | "afyonkarahisar"; ad: string; ust: string; nesne: NesneAdi }[] = [
  { anahtar: "bodrum", ad: "Bodrum", ust: "Muğla", nesne: "bodrum" },
  { anahtar: "antalya", ad: "Antalya", ust: "Akdeniz", nesne: "antalya" },
  { anahtar: "kapadokya", ad: "Kapadokya", ust: "Nevşehir", nesne: "kapadokya" },
  { anahtar: "istanbul", ad: "İstanbul", ust: "Marmara", nesne: "istanbul" },
  { anahtar: "uludag", ad: "Uludağ", ust: "Bursa", nesne: "kayak" },
  { anahtar: "afyonkarahisar", ad: "Afyonkarahisar", ust: "Ege", nesne: "termal" },
];

interface KonumOnerisi { id: string; ad: string; ust: string | null; tur: string; otel: number }

export function YerPaneli({ yazilan, onSec }: { yazilan: string; onSec: (ad: string, ust: string | null, id?: string | null) => void }) {
  const t = useTranslations("arama");
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
        <p className={s.kucukBaslik}>{t("yer.onerilen")}</p>
        {POPULER.map((p) => (
          <button key={p.ad} type="button" className={s.yer} onClick={() => onSec(p.ad, p.ust)}>
            <span className={s.kutu}><Nesne ad={p.nesne} boyut={40} /></span>
            <span><b>{t(`yer.populer.${p.anahtar}.ad`)}</b><small>{t(`yer.populer.${p.anahtar}.alt`)}</small></span>
          </button>
        ))}
      </div>
    );
  }
  if (oneriler.length === 0) {
    return (
      <div className={s.bosOneri}>
        <b>{t("yer.bulunamadi", { q })}</b>
        <span>{t("yer.ipucu")}</span>
        <button type="button" className={s.yer} onClick={() => onSec(q, null)}>
          <span className={s.kutu}><Ikon ad="search" boyut={20} /></span>
          <span><b>{t("yer.adiylaAra", { q })}</b><small>{t("yer.adiylaAraAlt")}</small></span>
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
            <small>{[o.ust, t("yer.otelSayisi", { sayi: o.otel })].filter(Boolean).join(" · ")}</small>
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
  const t = useTranslations("arama.takvim");
  const b = useBicim();
  const y = ay.getFullYear(), m = ay.getMonth();
  const bosluk = (new Date(y, m, 1).getDay() + 6) % 7;
  const gunSayisi = new Date(y, m + 1, 0).getDate();
  return (
    <div className={s.ay}>
      <div className={s.ayUst}>
        <button type="button" className={s.ayOk} onClick={onceki} aria-label={t("oncekiAy")} style={{ visibility: onceki ? "visible" : "hidden" }}>
          <Ikon ad="chevron-left" boyut={16} kalinlik={2.2} />
        </button>
        <h3>{b.ayYil(ay)}</h3>
        <button type="button" className={s.ayOk} onClick={sonraki} aria-label={t("sonrakiAy")} style={{ visibility: sonraki ? "visible" : "hidden" }}>
          <Ikon ad="chevron-right" boyut={16} kalinlik={2.2} />
        </button>
      </div>
      <div className={s.gunler}>
        {b.gunlerKisa.map((g) => <span key={g} className={s.hg}>{g}</span>)}
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
              aria-label={b.gunAyUzun(d)}
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
  const t = useTranslations("arama.takvim");
  const tk = useTranslations("ortak");
  const b = useBicim();
  const bugun = React.useMemo(() => gunBasi(new Date()), []);
  const [ay, setAy] = React.useState(() => {
    const d = giris ?? bugun;
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const ilkAy = new Date(bugun.getFullYear(), bugun.getMonth(), 1);
  const sonrakiAy = new Date(ay.getFullYear(), ay.getMonth() + 1, 1);
  const secenekler = React.useMemo(() => hizliAraliklar(bugun), [bugun]);

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
              key={h.anahtar}
              type="button"
              aria-pressed={ayniGun(giris, h.bas) && ayniGun(cikis, h.son)}
              onClick={() => {
                setAy(new Date(h.bas.getFullYear(), h.bas.getMonth(), 1));
                onDegis(h.bas, h.son, true);
              }}
            >
              <b>{t(`hizli.${h.anahtar}`)}</b>
              <span>{aralikOzeti(h.bas, h.son, b)}</span>
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
          <span>{giris && cikis ? tk("gece", { sayi: geceSayisi(giris, cikis) }) : t("gunSec")}</span>
          <button type="button" className={s.metinDugme} onClick={() => onDegis(null, null, false)} disabled={!giris}>
            {t("temizle")}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Misafirler ──────────────────────────────────────────────────── */

function Sayac({ tur, deger, en, enCok, onDegis }: {
  tur: "yetiskin" | "cocuk"; deger: number; en: number; enCok: number; onDegis: (n: number) => void;
}) {
  const t = useTranslations("arama.misafir");
  return (
    <div className={s.sayac}>
      <div><b>{t(`${tur}.ad`)}</b><small>{t(`${tur}.alt`)}</small></div>
      <div className={s.sayacD}>
        <button type="button" className={s.adim} onClick={() => onDegis(deger - 1)} disabled={deger <= en} aria-label={t(`${tur}.azalt`)}>
          <Ikon ad="minus" boyut={14} kalinlik={2.2} />
        </button>
        <output aria-live="polite">{deger}</output>
        <button type="button" className={s.adim} onClick={() => onDegis(deger + 1)} disabled={deger >= enCok} aria-label={t(`${tur}.artir`)}>
          <Ikon ad="plus" boyut={14} kalinlik={2.2} />
        </button>
      </div>
    </div>
  );
}

export function MisafirPaneli({ yetiskin, cocuklar, onDegis }: {
  yetiskin: number; cocuklar: number[]; onDegis: (yetiskin: number, cocuklar: number[]) => void;
}) {
  const t = useTranslations("arama.misafir");
  return (
    <div>
      <Sayac tur="yetiskin" deger={yetiskin} en={1} enCok={6} onDegis={(n) => onDegis(n, cocuklar)} />
      <Sayac
        tur="cocuk"
        deger={cocuklar.length}
        en={0}
        enCok={4}
        onDegis={(n) => onDegis(yetiskin, n > cocuklar.length ? [...cocuklar, 6] : cocuklar.slice(0, n))}
      />
      {cocuklar.length > 0 && (
        <div className={s.yaslar}>
          <p>{t("yasNotu")}</p>
          <div>
            {cocuklar.map((y, i) => (
              <label key={i}>
                <span>{t("cocukYasi", { sira: i + 1 })}</span>
                <select value={y} onChange={(e) => onDegis(yetiskin, cocuklar.map((c, j) => (j === i ? +e.target.value : c)))}>
                  {Array.from({ length: 18 }, (_, n) => <option key={n} value={n}>{n === 0 ? t("birYasAlti") : t("yas", { sayi: n })}</option>)}
                </select>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

