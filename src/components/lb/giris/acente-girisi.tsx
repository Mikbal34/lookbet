"use client";

// Acente (ve yönetici) girişi — Airbnb'nin giriş sayfası gibi: arka planda
// nesne posterlerinden yatık bir ızgara, ortada tek kart. Şifresiz: e-postaya
// 6 haneli kod gider, kodla girilir. Yeni e-postada acente hesabı açılır ve
// panelde bir kez başvuru formu doldurulur; panel onaydan sonra açılır.

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getSession, signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Ikon } from "@/components/lb/ikon";
import { Nesne, type NesneAdi } from "@/components/lb/nesne";
import { guvenliHedef } from "./hedef";
import { KodKutulari } from "./kod-kutulari";
import s from "./acente-girisi.module.css";

// Bölgeler biraz daha büyük; zeminler nesnenin tonuna yakın, çok açık.
const POSTER: [NesneAdi, string][] = [
  ["bodrum", "#e9f0f3"], ["termal", "#f4eee8"], ["kapadokya", "#f3eee7"], ["deniz", "#e8f0f3"], ["antalya", "#eef1ec"], ["kayak", "#eef0f4"],
  ["sehir", "#f1f0ec"], ["plaj", "#f6f1e7"], ["spa", "#eef3ee"], ["bavul", "#f3efe9"], ["kartpostal", "#eceef1"], ["zil", "#f2f1ee"],
  ["kahvalti", "#f5efe6"], ["hersey-dahil", "#eff1f4"], ["pasaport", "#eef0ee"], ["kapi", "#f3f1ed"],
];
const IZGARA = [...POSTER, ...POSTER.slice(5), ...POSTER.slice(0, 5)];
const BOLGE = new Set<NesneAdi>(["bodrum", "kapadokya", "antalya"]);

export function AcenteGirisi() {
  const router = useRouter();
  const p = useSearchParams();
  const ham = p.get("callbackUrl");
  const t = useTranslations("giris");
  const tk = useTranslations("ortak");
  const [adim, setAdim] = React.useState<"eposta" | "kod">("eposta");
  const [eposta, setEposta] = React.useState("");
  const [kod, setKod] = React.useState<string[]>(() => Array(6).fill(""));
  const [titre, setTitre] = React.useState(0);
  const [kalan, setKalan] = React.useState(0);
  const [hata, setHata] = React.useState<string | null>(null);
  const [bilgi, setBilgi] = React.useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = React.useState(false);

  React.useEffect(() => {
    if (kalan <= 0) return;
    const t = setTimeout(() => setKalan((k) => k - 1), 1000);
    return () => clearTimeout(t);
  }, [kalan]);

  const kodIste = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const v = eposta.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return setHata(t("hata.eposta"));
    setYukleniyor(true);
    setHata(null);
    try {
      const r = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: v, tur: "acente" }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) return setHata(d.error ?? t("hata.gonderilemedi"));
      setBilgi(d.devCode ? t("kod.gelistirme", { kod: d.devCode }) : null);
      setKod(Array(6).fill(""));
      setKalan(60);
      dogrulaniyor.current = false;
      setAdim("kod");
    } catch {
      setHata(t("hata.baglanti"));
    } finally {
      setYukleniyor(false);
    }
  };

  // Son hane kodu kendiliğinden gönderir; düğmeyle aynı anda ikinci istek
  // gitmesin (durum güncellemesi eşzamanlı değil, bayrak ref'te). Başarılı
  // girişte açık kalır; yeni kod istenince sıfırlanır.
  const dogrulaniyor = React.useRef(false);
  const kodDogrula = async (tam = kod.join("")) => {
    if (tam.length !== 6 || dogrulaniyor.current) return;
    dogrulaniyor.current = true;
    let tamam = false;
    setYukleniyor(true);
    setHata(null);
    try {
      const r = await signIn("acente-otp", { redirect: false, email: eposta.trim().toLowerCase(), code: tam });
      if (!r || r.error) {
        // authorize() mesajı (kilit, rol uyuşmazlığı, kapalı hesap) varsa onu göster.
        setHata(r?.error && r.error !== "CredentialsSignin" ? r.error : t("hata.kodHatali"));
        setTitre((x) => x + 1);
        setKod(Array(6).fill(""));
        return;
      }
      tamam = true;
      const rol = (await getSession())?.user?.role;
      const panel = rol === "ADMIN" ? "/admin" : "/agency/dashboard";
      // Hedef başka rolün alanındaysa (yönetici acente sayfasından geldi) kendi paneline.
      const hedef = guvenliHedef(ham);
      const uygun = hedef && !(rol === "ADMIN" && hedef.startsWith("/agency")) && !(rol !== "ADMIN" && hedef.startsWith("/admin"));
      router.push(uygun ? hedef : panel);
      router.refresh();
    } finally {
      setYukleniyor(false);
      if (!tamam) dogrulaniyor.current = false;
    }
  };

  return (
    <div className={`lb ${s.sayfa}`}>
      <header className={s.ust}>
        <Link href="/" className={s.marka}>
          <span className="lb-y">LookBeds</span>
          <small>Partner</small>
        </Link>
        <div className={s.ustSag}>
          <span>{t("acente.musteriMisin")}</span>
          <Link href="/">{t("acente.siteyeDon")}</Link>
        </div>
      </header>

      <main className={s.sahne}>
        <div className={s.izgara} aria-hidden="true">
          {IZGARA.map(([ad, zemin], i) => (
            <div key={i} className={s.poster} style={{ background: zemin, "--g": i } as React.CSSProperties}>
              <Nesne ad={ad} boyut={BOLGE.has(ad) ? 132 : 104} />
            </div>
          ))}
        </div>

        <div className={s.kart}>
          <div className={s.kartBas}>
            <Nesne ad="anahtar-karti" boyut={72} className={s.nesne} />
            <h1 className="lb-y">{t("acente.baslik")}</h1>
            <p>{adim === "eposta" ? t("acente.altBaslikEposta") : t("acente.altBaslikKod")}</p>
          </div>

          {adim === "eposta" ? (
            <form className={s.adim} onSubmit={kodIste} noValidate>
              <div className={s.alan} data-hatali={!!hata || undefined}>
                <label htmlFor="acente-eposta">{t("kod.eposta")}</label>
                <input
                  id="acente-eposta"
                  type="email"
                  inputMode="email"
                  autoComplete="username"
                  value={eposta}
                  onChange={(e) => {
                    setEposta(e.target.value);
                    setHata(null);
                  }}
                  autoFocus
                />
              </div>
              {hata && <Hata>{hata}</Hata>}
              <button type="submit" className={s.devam} disabled={yukleniyor}>{yukleniyor ? t("kod.gonderiliyor") : tk("devam")}</button>
              <p className={s.not}>{t("acente.sirketEpostasi")}</p>
            </form>
          ) : (
            <form className={s.adim} onSubmit={(e) => { e.preventDefault(); kodDogrula(); }} noValidate>
              <p className={s.aciklama}>
                {t.rich("acente.kodGonderildi", { eposta: eposta.trim(), b: (c) => <b>{c}</b> })}
              </p>
              {bilgi && <p className={s.bilgi}>{bilgi}</p>}
              <KodKutulari key={titre} deger={kod} titre={titre} onDegis={(y) => { setKod(y); setHata(null); }} onTamam={(k) => kodDogrula(k)} />
              {hata && <Hata>{hata}</Hata>}
              <div className={s.kodAlt}>
                {kalan > 0 ? (
                  <span>{t("kod.yeniKod", { kalan })}</span>
                ) : (
                  <button type="button" className={s.metin} onClick={() => kodIste()} disabled={yukleniyor}>{t("kod.yenidenGonder")}</button>
                )}
                <button type="button" className={s.metin} onClick={() => { setAdim("eposta"); setHata(null); }}>{t("kod.epostaDegistir")}</button>
              </div>
              <button type="submit" className={s.devam} disabled={kod.join("").length !== 6 || yukleniyor}>{yukleniyor ? t("kod.girisYapiliyor") : t("kod.girisYap")}</button>
            </form>
          )}
          <p className={s.not}>{t("acente.ilkKez")}</p>
        </div>
      </main>
    </div>
  );
}

function Hata({ children }: { children: React.ReactNode }) {
  return (
    <small className={s.hata} role="alert">
      <Ikon ad="warning" boyut={16} kalinlik={2.1} />
      {children}
    </small>
  );
}
