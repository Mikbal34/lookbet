"use client";

// Müşteri girişi (Airbnb gibi): bulunduğun sayfanın üstünde açılan pencere.
// Şifresiz: e-posta → 6 haneli kod (hesap yoksa aynı adımda açılır) ya da
// Google / Apple. Yeni hesapta "Hesabını tamamla" adımı adı ister.
// Acente ve yönetici girişi ayrı sayfada (/agency/login).

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getProviders, getSession, signIn, useSession } from "next-auth/react";
import { Ikon } from "@/components/lb/ikon";
import { Nesne } from "@/components/lb/nesne";
import { useKatman } from "@/components/lb/pencere";
import { KodKutulari } from "./kod-kutulari";
import s from "./giris.module.css";

type Adim = "eposta" | "kod" | "tamamla";
const SIRA: Adim[] = ["eposta", "kod", "tamamla"];
const ULKELER = ["+90", "+49", "+44", "+31", "+33", "+7", "+1"];

export function GirisPenceresi({ acik, hedef, onKapat }: {
  acik: boolean;
  /** Giriş bitince gidilecek adres; yoksa bulunulan sayfada kalınır. */
  hedef?: string | null;
  onKapat: () => void;
}) {
  const router = useRouter();
  const { update } = useSession();
  const [adim, setAdim] = React.useState<Adim>("eposta");
  const [geri, setGeri] = React.useState(false);
  const [eposta, setEposta] = React.useState("");
  const [kod, setKod] = React.useState<string[]>(() => Array(6).fill(""));
  const [ad, setAd] = React.useState("");
  const [soyad, setSoyad] = React.useState("");
  const [ulke, setUlke] = React.useState("+90");
  const [telefon, setTelefon] = React.useState("");
  const [hata, setHata] = React.useState<string | null>(null);
  const [bilgi, setBilgi] = React.useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = React.useState(false);
  const [titre, setTitre] = React.useState(0);
  const [kalan, setKalan] = React.useState(0);
  const [sosyal, setSosyal] = React.useState<{ google: boolean; apple: boolean }>({ google: false, apple: false });
  const epostaRef = React.useRef<HTMLInputElement>(null);
  useKatman(acik, onKapat, epostaRef);

  // Her açılışta baştan başla.
  const [onceki, setOnceki] = React.useState(acik);
  if (acik !== onceki) {
    setOnceki(acik);
    if (acik) {
      setAdim("eposta");
      setHata(null);
      setBilgi(null);
      setKod(Array(6).fill(""));
    }
  }

  React.useEffect(() => {
    if (!acik) return;
    let iptal = false;
    getProviders().then((p) => !iptal && setSosyal({ google: !!p?.google, apple: !!p?.apple })).catch(() => {});
    return () => {
      iptal = true;
    };
  }, [acik]);

  React.useEffect(() => {
    if (kalan <= 0) return;
    const t = setTimeout(() => setKalan((k) => k - 1), 1000);
    return () => clearTimeout(t);
  }, [kalan]);

  const git = (y: Adim) => {
    setGeri(SIRA.indexOf(y) < SIRA.indexOf(adim));
    setAdim(y);
    setHata(null);
  };

  const bitir = async () => {
    const oturum = await getSession();
    const rol = oturum?.user?.role;
    onKapat();
    if (rol === "ADMIN") return router.push("/admin");
    if (rol === "AGENCY") return router.push("/agency/dashboard");
    if (hedef) router.push(hedef);
    else router.refresh();
  };

  const kodIste = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const v = eposta.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return setHata("Geçerli bir e-posta yaz");
    setYukleniyor(true);
    setHata(null);
    try {
      const r = await fetch("/api/auth/otp/request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: v }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) return setHata(d.error ?? "Kod gönderilemedi, birazdan tekrar dene");
      setBilgi(d.devCode ? `Geliştirme modu, kod: ${d.devCode}` : null);
      setKod(Array(6).fill(""));
      setKalan(60);
      if (adim !== "kod") git("kod");
    } catch {
      setHata("Kod gönderilemedi, bağlantını kontrol et");
    } finally {
      setYukleniyor(false);
    }
  };

  const kodDogrula = async (tam = kod.join("")) => {
    if (tam.length !== 6 || yukleniyor) return;
    setYukleniyor(true);
    setHata(null);
    try {
      const r = await signIn("email-otp", { redirect: false, email: eposta.trim().toLowerCase(), code: tam });
      if (!r || r.error) {
        // authorize() mesajı (kilit, rol uyuşmazlığı, kapalı hesap) varsa onu göster.
        setHata(r?.error && r.error !== "CredentialsSignin" ? r.error : "Kod hatalı ya da süresi doldu");
        setTitre((t) => t + 1);
        setKod(Array(6).fill(""));
        return;
      }
      const oturum = await getSession();
      // Kodla ilk kez gelen hesabın adı e-postanın baş kısmı: adını soralım.
      const yerel = eposta.trim().toLowerCase().split("@")[0];
      if (oturum?.user?.role === "CUSTOMER" && (oturum.user.name ?? "") === yerel) {
        git("tamamla");
        return;
      }
      await bitir();
    } finally {
      setYukleniyor(false);
    }
  };

  const tamamla = async (e: React.FormEvent) => {
    e.preventDefault();
    if (ad.trim().length < 2 || soyad.trim().length < 2) return setHata("Adını ve soyadını yaz");
    const rakam = telefon.replace(/\D/g, "");
    if (rakam && rakam.length < 7) return setHata("Telefon numarası eksik");
    setYukleniyor(true);
    setHata(null);
    const isim = `${ad.trim()} ${soyad.trim()}`;
    try {
      const r = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: isim, ...(rakam ? { phone: `${ulke} ${telefon.trim()}` } : {}) }),
      });
      if (!r.ok) return setHata("Bilgiler kaydedilemedi, tekrar dene");
      await update({ name: isim });
      await bitir();
    } finally {
      setYukleniyor(false);
    }
  };

  const baslik = adim === "tamamla" ? "Üyeliği tamamla" : "Giriş yap ya da üye ol";
  return (
    <div className={s.perde} data-acik={acik || undefined} onClick={(e) => e.target === e.currentTarget && onKapat()} aria-hidden={!acik}>
      <div className={s.pencere} role="dialog" aria-modal="true" aria-labelledby="giris-baslik">
        <div className={s.ust}>
          {adim === "kod" ? (
            <button type="button" className={s.yuvarlak} onClick={() => git("eposta")} aria-label="Geri" tabIndex={acik ? 0 : -1}>
              <Ikon ad="back" boyut={18} />
            </button>
          ) : (
            <span />
          )}
          <h2 id="giris-baslik">{baslik}</h2>
          <button type="button" className={s.yuvarlak} onClick={onKapat} aria-label="Kapat" tabIndex={acik ? 0 : -1}>
            <Ikon ad="close" boyut={18} />
          </button>
        </div>
        {acik && (
          <div className={s.ic}>
            {adim === "eposta" && (
              <form key="eposta" className={s.adim} data-geri={geri || undefined} onSubmit={kodIste} noValidate>
                <div className={s.karsilama}>
                  <Nesne ad="kapi" boyut={56} />
                  <h3 className="lb-y">LookBeds&apos;e hoş geldin</h3>
                </div>
                <p className={s.soluk}>Şifre yok: e-postana 6 haneli bir kod gönderiyoruz. Hesabın yoksa aynı adımda açılır.</p>
                <div className={s.alan} data-hatali={!!hata || undefined}>
                  <label htmlFor="giris-eposta">E-posta</label>
                  <input
                    ref={epostaRef}
                    id="giris-eposta"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={eposta}
                    onChange={(e) => {
                      setEposta(e.target.value);
                      setHata(null);
                    }}
                  />
                </div>
                {hata && <Hata>{hata}</Hata>}
                <button type="submit" className={s.turuncu} disabled={yukleniyor}>{yukleniyor ? "Kod gönderiliyor…" : "Devam et"}</button>
                {(sosyal.google || sosyal.apple) && (
                  <>
                    <div className={s.ayrac}>veya</div>
                    <div className={s.sosyal}>
                      {sosyal.google && (
                        <button type="button" onClick={() => signIn("google", { callbackUrl: hedef || location.href })}>
                          <GoogleLogo />
                          Google ile devam et
                        </button>
                      )}
                      {sosyal.apple && (
                        <button type="button" onClick={() => signIn("apple", { callbackUrl: hedef || location.href })}>
                          <AppleLogo />
                          Apple ile devam et
                        </button>
                      )}
                    </div>
                  </>
                )}
                <Link href="/agency/login" className={s.acente} onClick={onKapat}>
                  <Nesne ad="anahtar-karti" boyut={44} />
                  <span>
                    <b>Acente misin?</b>
                    <span>Acente girişi ayrı sayfada</span>
                  </span>
                  <Ikon ad="chevron-right" boyut={16} kalinlik={2.1} />
                </Link>
              </form>
            )}

            {adim === "kod" && (
              <form key="kod" className={s.adim} data-geri={geri || undefined} onSubmit={(e) => { e.preventDefault(); kodDogrula(); }} noValidate>
                <h3 className="lb-y">Kodu gir</h3>
                <p className={s.soluk}>
                  <b className={s.koyu}>{eposta.trim()}</b> adresine 6 haneli bir kod gönderdik. Gelmediyse gereksiz klasörüne bak.
                </p>
                {bilgi && <p className={s.bilgi}>{bilgi}</p>}
                <KodKutulari key={titre} deger={kod} titre={titre} onDegis={(y) => { setKod(y); setHata(null); }} onTamam={(k) => kodDogrula(k)} />
                {hata && <Hata>{hata}</Hata>}
                <div className={s.kodAlt}>
                  {kalan > 0 ? (
                    <span className={s.soluk}>Yeni kod {kalan} sn sonra</span>
                  ) : (
                    <button type="button" className={s.metinDugme} onClick={() => kodIste()} disabled={yukleniyor}>Kodu yeniden gönder</button>
                  )}
                  <button type="button" className={s.metinDugme} onClick={() => git("eposta")}>E-postayı değiştir</button>
                </div>
                <button type="submit" className={s.turuncu} disabled={kod.join("").length !== 6 || yukleniyor}>{yukleniyor ? "Giriş yapılıyor…" : "Giriş yap"}</button>
              </form>
            )}

            {adim === "tamamla" && (
              <form key="tamamla" className={s.adim} onSubmit={tamamla} noValidate>
                <h3 className="lb-y">Hesabını tamamla</h3>
                <p className={s.soluk}>Rezervasyonlarda ve otelde görünecek adını yaz. Ödeme adımında bilgilerin hazır gelir.</p>
                <div className={s.iki}>
                  <div className={s.alan}>
                    <label htmlFor="giris-ad">Ad</label>
                    <input id="giris-ad" autoComplete="given-name" value={ad} onChange={(e) => { setAd(e.target.value); setHata(null); }} autoFocus />
                  </div>
                  <div className={s.alan}>
                    <label htmlFor="giris-soyad">Soyad</label>
                    <input id="giris-soyad" autoComplete="family-name" value={soyad} onChange={(e) => { setSoyad(e.target.value); setHata(null); }} />
                  </div>
                </div>
                <small className={s.not}>Kimlikteki adınla aynı olsun; otel girişte kimlik ister.</small>
                <div className={s.tel}>
                  <div className={s.alan}>
                    <label htmlFor="giris-ulke">Ülke kodu</label>
                    <select id="giris-ulke" value={ulke} onChange={(e) => setUlke(e.target.value)}>
                      {ULKELER.map((u) => <option key={u}>{u}</option>)}
                    </select>
                    <Ikon ad="chevron-down" boyut={16} className={s.secOk} />
                  </div>
                  <div className={s.alan}>
                    <label htmlFor="giris-tel">Telefon (isteğe bağlı)</label>
                    <input id="giris-tel" type="tel" inputMode="tel" autoComplete="tel-national" placeholder={ulke === "+90" ? "5XX XXX XX XX" : undefined} value={telefon} onChange={(e) => { setTelefon(e.target.value); setHata(null); }} />
                  </div>
                </div>
                {hata && <Hata>{hata}</Hata>}
                <p className={s.not}>
                  &quot;Kabul et ve devam et&quot;e basarak <Link href="/yardim">Kullanım koşullarını</Link> kabul ediyor, <Link href="/yardim">Aydınlatma metnini</Link> okuduğunu onaylıyorsun.
                </p>
                <button type="submit" className={s.turuncu} disabled={yukleniyor}>{yukleniyor ? "Kaydediliyor…" : "Kabul et ve devam et"}</button>
              </form>
            )}
          </div>
        )}
      </div>
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

function GoogleLogo() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={s.marka}>
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.7z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z" />
    </svg>
  );
}

function AppleLogo() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={s.marka}>
      <path fill="#141414" d="M16.4 12.7c0-2.6 2.1-3.8 2.2-3.9a4.8 4.8 0 0 0-3.8-2c-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.3-.9a5 5 0 0 0-4.2 2.5c-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8 1.6 0 2 .8 3.3.8 1.4 0 2.3-1.3 3.1-2.5a11 11 0 0 0 1.4-2.9 4.4 4.4 0 0 1-2.6-4zM13.9 5.1c.7-.8 1.2-2 1-3.1-1 0-2.2.7-2.9 1.5-.6.7-1.2 1.9-1 3 1.1.1 2.2-.6 2.9-1.4z" />
    </svg>
  );
}
