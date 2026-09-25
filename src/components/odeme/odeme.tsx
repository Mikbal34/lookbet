"use client";
/* eslint-disable @next/next/no-img-element -- otel görseli dış kaynaklı (tedarikçi) */

// Onay ve ödeme (Airbnb gibi): solda adım adım açılan kartlar (iletişim,
// misafirler, ödeme yöntemi, gözden geçir), sağda yapışık özet. Adım
// geçerken yalnız o adımın alanları doğrulanır; kurallar sunucuyla aynı
// şemadan (createBookingSchema) gelir. Onaylanınca /api/booking'e gider,
// başarıda onay sayfasına geçilir.

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { AltBilgi } from "@/components/lb/alt-bilgi";
import { Ikon } from "@/components/lb/ikon";
import { Nesne } from "@/components/lb/nesne";
import { Pencere } from "@/components/lb/pencere";
import { AYLAR, geceSayisi, gunEkle, isoOku } from "@/components/lb/arama/durum";
import { iptalOzeti, para } from "@/components/otel-detay/yardimci";
import { createBookingSchema, yasHesapla, type CreateBookingInput, type GuestInput } from "@/lib/validators/booking.schema";
import type { CancellationPolicy, HotelDetailResponse } from "@/lib/royal-api/types";
import { tarihGoster, useKayitliMisafirler, useProfil } from "@/components/hesap/veri";
import { KartLogolari } from "./kart-logolari";
import s from "./odeme.module.css";

const GUNLER = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
const ULKELER = ["+90", "+49", "+44", "+31", "+33", "+7", "+1", "+32", "+39", "+34", "+43", "+41"];

interface Iletisim { ad: string; soyad: string; eposta: string; ulke: string; telefon: string }
interface Misafir { ad: string; soyad: string; cins: "" | "Male" | "Female"; dogum: string; tip: "Adult" | "Child"; yas?: number }
type Hatalar = Record<string, string>;

const tarihYaz = (d: Date) => `${d.getDate()} ${AYLAR[d.getMonth()]} ${d.getFullYear()}`;
/** GG.AA.YYYY → YYYY-AA-GG (biçim tutmuyorsa boş). */
const isoDogum = (g: string) => {
  const m = g.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : "";
};
const dogumMaskesi = (v: string) => {
  const r = v.replace(/\D/g, "").slice(0, 8);
  return [r.slice(0, 2), r.slice(2, 4), r.slice(4)].filter(Boolean).join(".");
};
const ALAN_ADI: Record<string, string> = { name: "ad", surname: "soyad", email: "eposta", phone: "telefon", gender: "cins", birthDate: "dogum" };

export function Odeme() {
  const p = useSearchParams();
  if (!p.get("roomSearchId") || !p.get("priceCode")) return <Bos />;
  return <OdemeFormu key={p.get("priceCode")} p={p} />;
}

function OdemeFormu({ p }: { p: URLSearchParams }) {
  const router = useRouter();
  const oturum = useSession();

  const hotelCode = p.get("hotelCode") ?? "";
  const hotelName = p.get("hotelName") || hotelCode;
  const roomName = p.get("roomName") ?? "";
  const boardType = p.get("boardType") ?? "";
  const boardTypeName = p.get("boardTypeName") || boardType;
  const checkIn = p.get("checkIn") ?? "";
  const checkOut = p.get("checkOut") ?? "";
  const yetiskin = parseInt(p.get("adults") ?? "2", 10) || 2;
  const cocukMetni = p.get("childAges") ?? "";
  const cocuklar = cocukMetni.split(",").filter(Boolean).map(Number);
  const uyruk = p.get("nationality") ?? "TR";
  const paraBirimi = p.get("currency") ?? "EUR";
  const toplam = parseFloat(p.get("totalPrice") ?? "0");
  const ilkFiyat = Math.max(toplam, parseFloat(p.get("originalPrice") ?? String(toplam)) || toplam);
  const kampanyaAd = p.get("kampanya");
  const kampanyaYuzde = p.get("kampanyaYuzde");
  const netFiyat = parseFloat(p.get("netPrice") ?? "") || undefined;
  const politikalar = React.useMemo<CancellationPolicy[] | undefined>(() => {
    try {
      return JSON.parse(p.get("cancellationPolicy") ?? "");
    } catch {
      return undefined;
    }
  }, [p]);
  const giris = isoOku(checkIn);
  const cikis = isoOku(checkOut);
  const gece = giris && cikis ? Math.max(1, geceSayisi(giris, cikis)) : 1;
  const ip = iptalOzeti(politikalar);
  const tl = (n: number) => para(n, paraBirimi);
  const otelAdresi = `/hotel/${hotelCode}?${new URLSearchParams({ checkIn, checkOut, adults: String(yetiskin), ...(cocukMetni ? { childAges: cocukMetni } : {}) })}`;

  const otelQ = useQuery({
    queryKey: ["otel-detay", hotelCode],
    queryFn: async (): Promise<Partial<HotelDetailResponse> & { location?: { name: string; parent?: { name: string } | null } | null }> => {
      const r = await fetch(`/api/hotels/${hotelCode}`);
      if (!r.ok) throw new Error("hata");
      return r.json();
    },
    staleTime: 10 * 60_000,
    enabled: !!hotelCode,
  });
  const otel = otelQ.data;
  const foto = otel?.images?.find((i) => i.isMain)?.url ?? otel?.images?.[0]?.url;
  const yer = [otel?.location?.name, otel?.location?.parent?.name].filter(Boolean).join(", ");

  /* ── Form durumu ── */
  const [adim, setAdim] = React.useState(1);
  const [tamam, setTamam] = React.useState<Set<number>>(() => new Set());
  const [iletisim, setIletisim] = React.useState<Iletisim>({ ad: "", soyad: "", eposta: "", ulke: "+90", telefon: "" });
  const [misafirler, setMisafirler] = React.useState<Misafir[]>(() => [
    ...Array.from({ length: yetiskin }, (): Misafir => ({ ad: "", soyad: "", cins: "", dogum: "", tip: "Adult" })),
    ...cocuklar.map((yas): Misafir => ({ ad: "", soyad: "", cins: "", dogum: "", tip: "Child", yas })),
  ]);
  const [benDe, setBenDe] = React.useState(true);
  const [istek, setIstek] = React.useState("");
  const [yontem, setYontem] = React.useState<"kart" | "havale">("kart");
  const [sozlesme, setSozlesme] = React.useState(false);
  const [hatalar, setHatalar] = React.useState<Hatalar>({});
  const [gonderiliyor, setGonderiliyor] = React.useState(false);
  const [sunucuHata, setSunucuHata] = React.useState<{ mesaj: string; odaYenile: boolean } | null>(null);
  /* Kupon: önizleme /api/kupon; kesin tutar rezervasyonda aynı kuralla. */
  const [kuponAcik, setKuponAcik] = React.useState(false);
  const [kuponKod, setKuponKod] = React.useState("");
  const [kuponMesaj, setKuponMesaj] = React.useState<{ metin: string; hata: boolean } | null>(null);
  const [kuponYukleniyor, setKuponYukleniyor] = React.useState(false);
  const [kupon, setKupon] = React.useState<{ kod: string; tutar: number; sonFiyat: number; oncekiFiyat: number; kampanya: { ad: string; yuzde: number; tutar: number } | null } | null>(null);
  const kuponUygula = async (e: React.FormEvent) => {
    e.preventDefault();
    const kod = kuponKod.trim().toUpperCase();
    if (!kod) return setKuponMesaj({ metin: "Kupon kodunu yaz", hata: true });
    setKuponYukleniyor(true);
    setKuponMesaj(null);
    try {
      const r = await fetch("/api/kupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kod, hotelCode, boardType: boardType || undefined, checkIn, checkOut, netPrice: netFiyat ?? toplam }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setKupon(null);
        return setKuponMesaj({ metin: d.mesaj ?? d.error ?? "Kupon uygulanamadı", hata: true });
      }
      if (d.durum === "uygulandi") {
        setKupon({ kod: d.kod, tutar: d.tutar, sonFiyat: d.sonFiyat, oncekiFiyat: d.oncekiFiyat, kampanya: d.kampanya });
        setKuponMesaj({ metin: d.mesaj, hata: false });
        setKuponAcik(false);
      } else {
        setKupon(null);
        setKuponMesaj({ metin: d.mesaj, hata: false });
      }
    } catch {
      setKuponMesaj({ metin: "Bağlantıda bir sorun oldu; tekrar dene.", hata: true });
    } finally {
      setKuponYukleniyor(false);
    }
  };
  // Gösterilen döküm: kupon uygulandıysa sunucunun hesabı (kupon kampanyanın
  // yerine geçmiş olabilir), değilse oda aramasındaki fiyatlar.
  const onceki = kupon ? Math.max(kupon.oncekiFiyat, kupon.sonFiyat) : ilkFiyat;
  const kampanyaSatiri = kupon
    ? kupon.kampanya && { ad: `${kupon.kampanya.ad} %${kupon.kampanya.yuzde}`, tutar: kupon.kampanya.tutar }
    : ilkFiyat - toplam >= 0.01 && { ad: kampanyaAd ? `${kampanyaAd}${kampanyaYuzde ? ` %${kampanyaYuzde}` : ""}` : "İndirim", tutar: Math.round((ilkFiyat - toplam) * 100) / 100 };
  const odenecek = kupon ? kupon.sonFiyat : toplam;
  const [pencere, setPencere] = React.useState<null | "iptal" | "dokum" | "bilgi">(null);
  const [mobilOzet, setMobilOzet] = React.useState(false);
  const adimRef = React.useRef<Record<number, HTMLElement | null>>({});

  // Giriş yapılmışsa iletişim bilgileri hesaptan dolsun (bir kez).
  const [doldu, setDoldu] = React.useState(false);
  const kullanici = oturum.data?.user;
  if (!doldu && kullanici) {
    setDoldu(true);
    const parca = (kullanici.name ?? "").trim().split(/\s+/);
    const soyad = parca.length > 1 ? parca.pop()! : "";
    const ad = parca.join(" ");
    setIletisim((i) => ({ ...i, ad: i.ad || ad, soyad: i.soyad || soyad, eposta: i.eposta || (kullanici.email ?? "") }));
    if (benDe) setMisafirler((m) => m.map((x, j) => (j === 0 ? { ...x, ad: x.ad || ad, soyad: x.soyad || soyad } : x)));
  }
  // Hesaptaki telefon ve doğum tarihi de (bir kez); kayıtlı misafirler çip olur.
  const profil = useProfil(!!kullanici && kullanici.role === "CUSTOMER");
  const kayitli = useKayitliMisafirler(!!kullanici && kullanici.role === "CUSTOMER").data ?? [];
  const [profilDoldu, setProfilDoldu] = React.useState(false);
  if (!profilDoldu && profil.data) {
    setProfilDoldu(true);
    const tel = profil.data.phone?.match(/^(\+\d{1,3})\s*(.*)$/);
    if (tel) setIletisim((i) => (i.telefon ? i : { ...i, ulke: tel[1], telefon: tel[2] }));
    const dogum = tarihGoster(profil.data.birthDate);
    if (dogum && benDe) setMisafirler((m) => m.map((x, j) => (j === 0 && !x.dogum ? { ...x, dogum } : x)));
  }

  const hataSil = (id: string) =>
    setHatalar((h) => {
      if (!(id in h)) return h;
      const y = { ...h };
      delete y[id];
      return y;
    });
  const iletisimDegis = (k: keyof Iletisim, v: string) => {
    setIletisim((i) => ({ ...i, [k]: v }));
    hataSil(`c-${k}`);
    if (benDe && (k === "ad" || k === "soyad")) {
      setMisafirler((m) => m.map((x, j) => (j === 0 ? { ...x, [k]: v } : x)));
      hataSil(`g0-${k}`);
    }
  };
  /** Kayıtlı misafiri ilk boş yere yaz (rezervasyonu yapan konaklıyorsa 1. yer onun). */
  /** Kayıtlı misafirin gireceği boş yer: 18 yaş altı çocuk yerine (önce yaşı tutan), büyükler yetişkin yerine. */
  const yerBul = (dogum: string) => {
    const yas = checkIn ? yasHesapla(dogum, checkIn) : 18;
    const bos = (m: Misafir, i: number) => !(benDe && i === 0) && !m.ad.trim() && !m.soyad.trim();
    if (yas >= 18) return misafirler.findIndex((m, i) => bos(m, i) && m.tip === "Adult");
    const tam = misafirler.findIndex((m, i) => bos(m, i) && m.tip === "Child" && m.yas === yas);
    return tam >= 0 ? tam : misafirler.findIndex((m, i) => bos(m, i) && m.tip === "Child");
  };
  const bosYer = misafirler.findIndex((m, i) => !(benDe && i === 0) && !m.ad.trim() && !m.soyad.trim());
  const kayitliEkle = (k: { name: string; surname: string; birthDate: string; gender: "Male" | "Female" | null }) => {
    const j = yerBul(k.birthDate);
    if (j < 0) return;
    setMisafirler((m) => m.map((x, i) => (i === j ? { ...x, ad: k.name, soyad: k.surname, dogum: tarihGoster(k.birthDate), cins: k.gender ?? x.cins } : x)));
    for (const a of ["ad", "soyad", "dogum", "cins"]) hataSil(`g${j}-${a}`);
  };
  const misafirDegis = (j: number, k: keyof Misafir, v: string) => {
    setMisafirler((m) => m.map((x, i) => (i === j ? { ...x, [k]: v } : x)));
    hataSil(`g${j}-${k}`);
    if (j === 0 && (k === "ad" || k === "soyad")) setBenDe(false);
  };

  const yuk = (): CreateBookingInput => ({
    roomSearchId: p.get("roomSearchId") ?? "",
    priceCode: p.get("priceCode") ?? "",
    hotelCode,
    hotelName: p.get("hotelName") || undefined,
    boardType: boardType || undefined,
    roomType: roomName || undefined,
    checkIn,
    checkOut,
    totalPrice: toplam,
    currency: paraBirimi,
    cancellationPolicy: politikalar,
    contact: { name: iletisim.ad.trim(), surname: iletisim.soyad.trim(), email: iletisim.eposta.trim(), phone: `${iletisim.ulke} ${iletisim.telefon.trim()}` },
    rooms: [
      {
        guests: misafirler.map((m) => ({
          name: m.ad.trim(),
          surname: m.soyad.trim(),
          type: m.tip,
          age: m.yas,
          gender: m.cins as GuestInput["gender"],
          nationality: uyruk,
          birthDate: isoDogum(m.dogum),
        })),
      },
    ],
    additionalInfo: istek.trim() || undefined,
    couponCode: kupon?.kod,
    netPrice: netFiyat,
  });

  /** Bir adımın hataları; anahtar alanın id'si. */
  const hatalariBul = (n: number): Hatalar => {
    const h: Hatalar = {};
    const r = createBookingSchema.safeParse(yuk());
    const issues = r.success ? [] : r.error.issues;
    if (n === 1) {
      for (const i of issues) {
        if (i.path[0] !== "contact") continue;
        const alan = ALAN_ADI[String(i.path[1])];
        h[`c-${alan}`] ??= { ad: "Adını yaz", soyad: "Soyadını yaz", eposta: "Geçerli bir e-posta yaz", telefon: "Telefon numaranı yaz" }[alan] ?? i.message;
      }
      const rakam = iletisim.telefon.replace(/\D/g, "").replace(/^0/, "");
      if (!h["c-telefon"] && (iletisim.ulke === "+90" ? rakam.length !== 10 : rakam.length < 7)) {
        h["c-telefon"] = iletisim.ulke === "+90" ? "10 haneli numara yaz (5XX XXX XX XX)" : "Telefon numarası eksik";
      }
    }
    if (n === 2) {
      for (const i of issues) {
        if (i.path[0] !== "rooms") continue;
        const j = Number(i.path[3]);
        const alan = ALAN_ADI[String(i.path[4])];
        const m = misafirler[j];
        let mesaj = i.message;
        if (i.code !== "custom") {
          if (alan === "ad") mesaj = "Misafirin adını yaz";
          else if (alan === "soyad") mesaj = "Misafirin soyadını yaz";
          else if (alan === "cins") mesaj = "Cinsiyet seç";
          else if (alan === "dogum") mesaj = m?.dogum ? "GG.AA.YYYY biçiminde yaz" : "Doğum tarihini yaz";
        }
        h[`g${j}-${alan}`] ??= mesaj;
      }
      // Şemanın yaş kuralı diğer alanlar geçerli olunca çalışıyor; aynı turda göstermek için burada da bak.
      misafirler.forEach((m, j) => {
        const d = isoDogum(m.dogum);
        if (!d || h[`g${j}-dogum`]) return;
        const yas = yasHesapla(d, checkIn);
        if (m.tip === "Adult" && yas < 18) h[`g${j}-dogum`] = "Yetişkin misafir girişte en az 18 yaşında olmalı";
        if (m.tip === "Child" && m.yas !== undefined && yas !== m.yas) h[`g${j}-dogum`] = `Girişte ${m.yas} yaşında olmalı (aramadaki yaş)`;
      });
    }
    return h;
  };

  const adimAc = (n: number) => {
    setAdim(n);
    const az = matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Önceki adım kapanırken (0,45 sn) yerler kayıyor; ölçümü kapanınca yap.
    setTimeout(() => {
      const e = adimRef.current[n];
      if (!e) return;
      const r = e.getBoundingClientRect();
      if (r.top < 0 || r.top > innerHeight * 0.4) scrollTo({ top: scrollY + r.top - 24, behavior: az ? "auto" : "smooth" });
      e.querySelector<HTMLElement>("input:not([type=radio]):not([type=checkbox])")?.focus({ preventScroll: true });
    }, az ? 0 : 470);
  };
  const devam = (n: number) => {
    const h = hatalariBul(n);
    if (Object.keys(h).length) {
      setHatalar(h);
      document.getElementById(Object.keys(h)[0])?.focus();
      return;
    }
    setTamam((t) => new Set(t).add(n));
    adimAc(n + 1);
  };

  const onayla = async () => {
    const eksik = [1, 2, 3].find((n) => !tamam.has(n));
    if (eksik) return adimAc(eksik);
    setGonderiliyor(true);
    setSunucuHata(null);
    try {
      const r = await fetch("/api/booking", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(yuk()) });
      // Oturum düşmüşse korumalı API giriş sayfasına yönlendiriyor (redirected).
      if (r.status === 401 || r.redirected) {
        router.push(`/login?callbackUrl=${encodeURIComponent(location.pathname + location.search)}`);
        return;
      }
      const d = await r.json().catch(() => ({}));
      if (!r.ok && d.alan === "kupon") {
        // Kupon bu arada geçersizleşti (süre, sınır); kuponsuz devam edilebilir.
        setKupon(null);
        setKuponMesaj({ metin: d.error, hata: true });
        setSunucuHata({ mesaj: `${d.error} Kupon kaldırıldı; onaylarsan kuponsuz fiyattan devam edilir.`, odaYenile: false });
        setGonderiliyor(false);
        return;
      }
      if (!r.ok) {
        setSunucuHata({ mesaj: d.error ?? "Rezervasyon oluşturulamadı", odaYenile: r.status === 409 || r.status === 422 });
        setGonderiliyor(false);
        return;
      }
      const no = d.reservation?.bookingNumber ?? d.bookingConfirmation?.bookingNumber ?? d.reservation?.id ?? "";
      router.push(`/booking/confirmation?${new URLSearchParams({ bookingNumber: no, hotelName, checkIn, checkOut })}`);
    } catch {
      setSunucuHata({ mesaj: "Bağlantıda bir sorun oldu; birazdan tekrar dene.", odaYenile: false });
      setGonderiliyor(false);
    }
  };

  const ozetler: Record<number, string> = {
    1: `${iletisim.ad} ${iletisim.soyad} · ${iletisim.eposta}`,
    2: misafirler.map((m) => `${m.ad} ${m.soyad}`).join(", "),
    3: yontem === "kart" ? "Kart ile ödeme" : "Havale / EFT",
  };
  const adimProps = (n: number) => ({
    no: n,
    aktif: adim === n,
    tamam: tamam.has(n),
    ozet: ozetler[n],
    onDuzenle: () => adimAc(n),
    kokRef: (e: HTMLElement | null) => {
      adimRef.current[n] = e;
    },
  });

  const geceler = giris ? Array.from({ length: gece }, (_, i) => gunEkle(giris, i)) : [];
  const misafirYazi = `${yetiskin} yetişkin${cocuklar.length ? `, ${cocuklar.length} çocuk` : ""} · 1 oda`;
  const iptalKisa = ip.ucretsiz ? (
    <span className={s.yesil}>
      <Ikon ad="check" boyut={16} kalinlik={2.2} /> {ip.ucretsiz.yonelme} kadar ücretsiz iptal
    </span>
  ) : ip.ceza ? (
    <span>Bu rezervasyon için iade yapılmaz</span>
  ) : (
    <span>İptal koşulları bilgisi alınamadı</span>
  );

  return (
    <div className={`lb ${s.sayfa}`}>
      <header className={s.ust}>
        <Link href="/" className={`lb-y ${s.logo}`}>LookBeds</Link>
        <span className={s.guvenli}>
          <Ikon ad="lock" boyut={18} />
          <span>Güvenli bağlantı</span>
        </span>
      </header>

      <main className={s.dis}>
        <div className={s.baslik}>
          <Link href={otelAdresi} className={s.geri} aria-label="Otel sayfasına dön">
            <Ikon ad="back" boyut={18} />
          </Link>
          <h1 className="lb-y">Onay ve ödeme</h1>
        </div>

        <div className={s.duzen}>
          <div className={s.adimlar}>
            <Adim {...adimProps(1)} baslik="İletişim bilgileri">
              {kullanici && (
                <div className={s.uye}>
                  <Nesne ad="anahtar-karti" boyut={44} />
                  <div>
                    <b>{kullanici.name ? `${kullanici.name} olarak giriş yaptın` : "Giriş yaptın"}</b>
                    <span>Rezervasyon hesabına kaydedilir; Rezervasyonlarım sayfasından takip edebilirsin.</span>
                  </div>
                </div>
              )}
              <div className={s.alanlar}>
                <Alan id="c-ad" etiket="Ad" hata={hatalar["c-ad"]} value={iletisim.ad} onChange={(v) => iletisimDegis("ad", v)} autoComplete="given-name" />
                <Alan id="c-soyad" etiket="Soyad" hata={hatalar["c-soyad"]} value={iletisim.soyad} onChange={(v) => iletisimDegis("soyad", v)} autoComplete="family-name" />
              </div>
              <Alan id="c-eposta" etiket="E-posta" type="email" hata={hatalar["c-eposta"]} value={iletisim.eposta} onChange={(v) => iletisimDegis("eposta", v)} autoComplete="email" not="Onay e-postası bu adrese gönderilir" />
              <div className={s.tel}>
                <div className={s.alan}>
                  <label htmlFor="c-ulke">Ülke kodu</label>
                  <select id="c-ulke" value={iletisim.ulke} onChange={(e) => iletisimDegis("ulke", e.target.value)}>
                    {ULKELER.map((u) => <option key={u}>{u}</option>)}
                  </select>
                  <Ikon ad="chevron-down" boyut={16} className={s.secOk} />
                </div>
                <Alan id="c-telefon" etiket="Telefon" type="tel" inputMode="tel" hata={hatalar["c-telefon"]} value={iletisim.telefon} onChange={(v) => iletisimDegis("telefon", v)} autoComplete="tel-national" placeholder={iletisim.ulke === "+90" ? "5XX XXX XX XX" : undefined} />
              </div>
              <div className={s.adimAlt}>
                <button type="button" className={s.dugme} onClick={() => devam(1)}>Devam et</button>
              </div>
            </Adim>

            <Adim {...adimProps(2)} baslik="Konaklayacak misafirler">
              <label className={s.onayKutu}>
                <input
                  type="checkbox"
                  checked={benDe}
                  onChange={(e) => {
                    setBenDe(e.target.checked);
                    if (e.target.checked) setMisafirler((m) => m.map((x, j) => (j === 0 ? { ...x, ad: iletisim.ad, soyad: iletisim.soyad } : x)));
                  }}
                />
                <span>Rezervasyonu yapan kişi de konaklıyor</span>
              </label>
              {kayitli.length > 0 && misafirler.length > (benDe ? 1 : 0) && (
                <div className={s.kayitli}>
                  <span>{bosYer < 0 ? "Kayıtlı misafirlerin · tüm yerler dolu" : "Kayıtlı misafirlerin · dokun, boş yere yazalım"}</span>
                  <div>
                    {kayitli.map((k) => {
                      const kullanildi = misafirler.some((m) => m.ad === k.name && m.soyad === k.surname);
                      return (
                        <button key={k.id} type="button" className={s.cipMisafir} disabled={kullanildi || yerBul(k.birthDate) < 0} aria-pressed={kullanildi} onClick={() => kayitliEkle(k)}>
                          {kullanildi && <Ikon ad="check" boyut={14} kalinlik={2.4} />}
                          {k.name} {k.surname}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {misafirler.map((m, j) => (
                <fieldset key={j} className={s.misafir}>
                  <legend>
                    {j + 1}. misafir · {m.tip === "Adult" ? "yetişkin" : `çocuk (${m.yas} yaş)`}
                  </legend>
                  <div className={s.alanlar}>
                    <Alan id={`g${j}-ad`} etiket="Ad" hata={hatalar[`g${j}-ad`]} value={m.ad} onChange={(v) => misafirDegis(j, "ad", v)} />
                    <Alan id={`g${j}-soyad`} etiket="Soyad" hata={hatalar[`g${j}-soyad`]} value={m.soyad} onChange={(v) => misafirDegis(j, "soyad", v)} />
                  </div>
                  <div className={s.alanlar}>
                    <div>
                      <div className={s.secimAlan} data-hatali={!!hatalar[`g${j}-cins`] || undefined}>
                        <span className={s.etiket} id={`g${j}-cins-e`}>Cinsiyet</span>
                        <div className={s.parca} role="radiogroup" aria-labelledby={`g${j}-cins-e`} id={`g${j}-cins`} tabIndex={-1}>
                          {(["Female", "Male"] as const).map((c) => (
                            <label key={c}>
                              <input type="radio" name={`g${j}-cins`} value={c} checked={m.cins === c} onChange={() => misafirDegis(j, "cins", c)} />
                              <span>{c === "Female" ? "Kadın" : "Erkek"}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      {hatalar[`g${j}-cins`] && <HataYazi>{hatalar[`g${j}-cins`]}</HataYazi>}
                    </div>
                    <Alan
                      id={`g${j}-dogum`}
                      etiket="Doğum tarihi"
                      placeholder="GG.AA.YYYY"
                      inputMode="numeric"
                      maxLength={10}
                      hata={hatalar[`g${j}-dogum`]}
                      value={m.dogum}
                      onChange={(v) => misafirDegis(j, "dogum", dogumMaskesi(v))}
                      autoComplete={j === 0 ? "bday" : "off"}
                    />
                  </div>
                </fieldset>
              ))}
              <div className={`${s.alan} ${s.genis}`}>
                <label htmlFor="istek">Özel istek (isteğe bağlı)</label>
                <textarea id="istek" maxLength={500} value={istek} onChange={(e) => setIstek(e.target.value)} placeholder="Örneğin yüksek kat, erken giriş, bebek yatağı" />
                <small className={s.not}>{istek.length} / 500 · Otele iletilir, garanti edilmez</small>
              </div>
              <div className={s.adimAlt}>
                <button type="button" className={s.dugme} onClick={() => devam(2)}>Devam et</button>
              </div>
            </Adim>

            <Adim {...adimProps(3)} baslik="Ödeme yöntemi">
              <div className={s.yontem} role="radiogroup" aria-label="Ödeme yöntemi">
                <label>
                  <input type="radio" name="yontem" checked={yontem === "kart"} onChange={() => setYontem("kart")} />
                  <span className={s.kutu}>
                    <Nesne ad="odeme-karti" boyut={40} />
                    <span>
                      <b>Kart ile öde</b>
                      <small>Kredi ya da banka kartı</small>
                    </span>
                  </span>
                </label>
                <label>
                  <input type="radio" name="yontem" checked={yontem === "havale"} onChange={() => setYontem("havale")} />
                  <span className={s.kutu}>
                    <Nesne ad="havale" boyut={40} />
                    <span>
                      <b>Havale / EFT</b>
                      <small>Banka hesabına</small>
                    </span>
                  </span>
                </label>
              </div>
              {yontem === "kart" ? (
                <div className={s.yontemBilgi}>
                  <KartLogolari />
                  <span>Kart bilgilerini onaydan sonra bankanın güvenli ödeme ekranında gireceksin. LookBeds kart bilgisi saklamaz.</span>
                </div>
              ) : (
                <div className={s.yontemBilgi}>
                  <b>Banka bilgileri onay e-postasıyla gelir</b>
                  <span>Açıklamaya rezervasyon numaranı yazman yeterli.</span>
                </div>
              )}
              <div className={s.adimAlt}>
                <button type="button" className={s.dugme} onClick={() => devam(3)}>Devam et</button>
              </div>
            </Adim>

            <Adim {...adimProps(4)} baslik="Rezervasyonunu gözden geçir">
              <ul className={s.gozden}>
                <li>
                  <Ikon ad="calendar" boyut={22} />
                  <span>
                    <b>İptal koşulları</b>
                    {ip.ucretsiz
                      ? `${ip.ucretsiz.yonelme} kadar (saat ${ip.ucretsiz.saat}) ücretsiz iptal${ip.ceza ? `; sonrasında ${tl(ip.ceza.tutar)} kesilir` : ""}.`
                      : ip.ceza
                        ? "Bu rezervasyon iade edilmez."
                        : "İptal koşulları bilgisi alınamadı; odayı otel sayfasından yeniden seçebilirsin."}
                  </span>
                </li>
                {otel?.policies?.checkInFrom && (
                  <li>
                    <Ikon ad="clock" boyut={22} />
                    <span>
                      <b>Giriş ve çıkış</b>
                      Giriş {otel.policies.checkInFrom} ve sonrası{otel.policies.checkOutUntil ? `, çıkış en geç ${otel.policies.checkOutUntil}` : ""}. Girişte kimlik istenir.
                    </span>
                  </li>
                )}
                {(otel?.policies?.importantInfo?.length ?? 0) > 0 && (
                  <li>
                    <Ikon ad="secure" boyut={22} />
                    <span>
                      <b>Otelin önemli notları</b>
                      <button type="button" className={s.metinDugme} onClick={() => setPencere("bilgi")}>Notları oku</button>
                    </span>
                  </li>
                )}
              </ul>
              <label className={s.onayKutu}>
                <input type="checkbox" checked={sozlesme} onChange={(e) => setSozlesme(e.target.checked)} />
                <span>
                  <button type="button" className={s.metinDugme} onClick={(e) => { e.preventDefault(); setPencere("dokum"); }}>Ön bilgilendirmeyi</button> okudum; otel kurallarını ve iptal koşullarını kabul ediyorum.
                </span>
              </label>
              {sunucuHata && (
                <div className={s.sunucuHata} role="alert">
                  <Ikon ad="warning" boyut={20} />
                  <div>
                    <b>Rezervasyon tamamlanamadı</b>
                    <span>{sunucuHata.mesaj}</span>
                    {sunucuHata.odaYenile && <Link href={otelAdresi} className={s.metinDugme}>Otel sayfasına dön, odayı yeniden seç</Link>}
                  </div>
                </div>
              )}
              <div className={`${s.adimAlt} ${s.solda}`}>
                <button type="button" className={`${s.dugme} ${s.onayla}`} onClick={onayla} disabled={!sozlesme || gonderiliyor}>
                  <Ikon ad={gonderiliyor ? "loading" : "lock"} boyut={18} className={gonderiliyor ? s.don : undefined} />
                  {gonderiliyor ? "Rezervasyon yapılıyor…" : `Rezervasyonu onayla · ${tl(odenecek)}`}
                </button>
              </div>
            </Adim>
          </div>

          <aside className={s.ozet} data-acik={mobilOzet || undefined} aria-label="Rezervasyon özeti">
            <button type="button" className={s.mobilOzet} aria-expanded={mobilOzet} onClick={() => setMobilOzet((a) => !a)}>
              <span>
                <b>Rezervasyon özeti</b>
                <span>{tl(odenecek)} · {giris && cikis ? `${giris.getDate()}–${tarihYaz(cikis)}` : ""}</span>
              </span>
              <Ikon ad="chevron-down" boyut={20} />
            </button>
            <div className={s.ozetKart}>
              <div className={s.ozetUst}>
                <span className={s.ozetFoto}>{foto ? <img src={foto} alt="" /> : <Nesne ad="zil" boyut={48} />}</span>
                <div>
                  <b>{hotelName}</b>
                  <span>{[roomName, boardTypeName].filter(Boolean).join(" · ")}</span>
                  {(otel?.stars || yer) && <span>{[otel?.stars ? `${otel.stars} yıldızlı` : null, yer || null].filter(Boolean).join(" · ")}</span>}
                </div>
              </div>
              <div className={`${s.satir} ${s.iptalSatir}`}>
                {iptalKisa}
                {(ip.ucretsiz || ip.ceza) && <button type="button" className={s.gri} onClick={() => setPencere("iptal")}>Ayrıntılar</button>}
              </div>
              <div className={s.satir}>
                <div>
                  <b>Tarihler</b>
                  <span>{giris && cikis ? `${tarihYaz(giris)} – ${tarihYaz(cikis)} · ${gece} gece` : "—"}</span>
                </div>
                <Link href={otelAdresi} className={s.gri}>Değiştir</Link>
              </div>
              <div className={s.satir}>
                <div>
                  <b>Misafirler</b>
                  <span>{misafirYazi}</span>
                </div>
                <Link href={otelAdresi} className={s.gri}>Değiştir</Link>
              </div>
              <div className={s.fiyat}>
                <h3>Fiyat ayrıntıları</h3>
                <div>
                  <span>{tl(onceki / gece)} × {gece} gece</span>
                  <span>{tl(onceki)}</span>
                </div>
                {kampanyaSatiri && (
                  <div className={s.indirim}>
                    <span>{kampanyaSatiri.ad}</span>
                    <span>−{tl(kampanyaSatiri.tutar)}</span>
                  </div>
                )}
                {kupon && (
                  <div className={s.indirim}>
                    <span>
                      Kupon {kupon.kod}{" "}
                      <button type="button" className={s.metinDugme} onClick={() => { setKupon(null); setKuponMesaj(null); }}>Kaldır</button>
                    </span>
                    <span>−{tl(kupon.tutar)}</span>
                  </div>
                )}
                <div>
                  <span>Vergiler ve ücretler</span>
                  <span>Dahil</span>
                </div>
              </div>
              <div className={s.toplam}>
                <b>
                  Toplam <small>{paraBirimi}</small>
                </b>
                <span className="lb-y">{tl(odenecek)}</span>
              </div>
              {!kupon && (
                <div className={s.kupon}>
                  {kuponAcik ? (
                    <form className={s.kuponForm} onSubmit={kuponUygula} noValidate>
                      <div className={s.alan}>
                        <label htmlFor="kupon">Kupon kodu</label>
                        <input
                          id="kupon"
                          value={kuponKod}
                          onChange={(e) => { setKuponKod(e.target.value); setKuponMesaj(null); }}
                          autoComplete="off"
                          autoCapitalize="characters"
                          spellCheck={false}
                          autoFocus
                        />
                      </div>
                      <button type="submit" className={s.kuponDugme} disabled={kuponYukleniyor}>{kuponYukleniyor ? "…" : "Uygula"}</button>
                    </form>
                  ) : (
                    <button type="button" className={s.metinDugme} onClick={() => setKuponAcik(true)}>Kupon ekle</button>
                  )}
                </div>
              )}
              {kuponMesaj && (
                <p className={s.kuponMesaj} data-hata={kuponMesaj.hata || undefined} role={kuponMesaj.hata ? "alert" : "status"}>{kuponMesaj.metin}</p>
              )}
              <button type="button" className={s.metinDugme} onClick={() => setPencere("dokum")}>Fiyat dökümü</button>
            </div>
            <div className={s.guven}>
              <Nesne ad="kilit" boyut={48} />
              <div>
                <b>Bilgilerin güvende</b>
                <span>Bağlantın şifreli. Bilgilerin yalnızca rezervasyon için otelle paylaşılır.</span>
              </div>
            </div>
          </aside>
        </div>
      </main>

      <AltBilgi />

      <Pencere acik={pencere === "iptal"} onKapat={() => setPencere(null)} baslik="İptal koşulları" genislik={560}>
        <div className={s.zaman}>
          {ip.ucretsiz && (
            <div>
              <b>{ip.ucretsiz.yonelme} kadar</b>
              <span>Saat {ip.ucretsiz.saat} öncesi ücretsiz iptal, tam iade</span>
            </div>
          )}
          {ip.ceza && (
            <div className={s.ceza}>
              <b>{ip.ucretsiz ? `${ip.ceza.gun}, saat ${ip.ceza.saat} ve sonrası` : "Rezervasyondan itibaren"}</b>
              <span>İptal ücreti {tl(ip.ceza.tutar)}{ip.ceza.tutar >= toplam ? " (toplam tutar)" : ""}</span>
            </div>
          )}
        </div>
        <p className={s.pencereNot}>Saatler Türkiye saatine göredir. İptal, Rezervasyonlarım sayfasından yapılır.</p>
      </Pencere>
      <Pencere acik={pencere === "dokum"} onKapat={() => setPencere(null)} baslik="Ön bilgilendirme ve fiyat dökümü" genislik={560}>
        <div className={s.dokum}>
          <div><span>Hizmet</span><span>Otel konaklaması</span></div>
          <div><span>Otel</span><span>{hotelName}</span></div>
          <div><span>Oda</span><span>{[roomName, boardTypeName].filter(Boolean).join(" · ")}</span></div>
          <div><span>Misafirler</span><span>{misafirYazi}</span></div>
          {geceler.map((d) => (
            <div key={d.getTime()}>
              <span>{d.getDate()} {AYLAR[d.getMonth()]} {GUNLER[d.getDay()]}</span>
              <span>{tl(onceki / gece)}</span>
            </div>
          ))}
          {kampanyaSatiri && <div><span>{kampanyaSatiri.ad}</span><span>−{tl(kampanyaSatiri.tutar)}</span></div>}
          {kupon && <div><span>Kupon {kupon.kod}</span><span>−{tl(kupon.tutar)}</span></div>}
          <div><b>Toplam ({paraBirimi}, vergiler dahil)</b><b>{tl(odenecek)}</b></div>
          <div>
            <span>İptal</span>
            <span>{ip.ucretsiz ? `${ip.ucretsiz.yonelme} kadar ücretsiz, sonrasında ${ip.ceza ? tl(ip.ceza.tutar) : "ücretli"}` : ip.ceza ? "İade edilmez" : "Bilgi yok"}</span>
          </div>
        </div>
      </Pencere>
      <Pencere acik={pencere === "bilgi"} onKapat={() => setPencere(null)} baslik="Otelin önemli notları">
        <div className={s.pencereMetin}>
          {(otel?.policies?.importantInfo ?? []).flatMap((m) => m.split(/(?<=\.)\s+(?=[A-ZÇĞİÖŞÜ])/)).map((x, i) => <p key={i}>{x}</p>)}
        </div>
      </Pencere>
    </div>
  );
}

function Adim({ no, baslik, aktif, tamam, ozet, onDuzenle, kokRef, children }: {
  no: number;
  baslik: string;
  aktif: boolean;
  tamam: boolean;
  ozet?: string;
  onDuzenle: () => void;
  kokRef: (e: HTMLElement | null) => void;
  children: React.ReactNode;
}) {
  const kapali = tamam && !aktif;
  return (
    <section ref={kokRef} className={s.adim} data-aktif={aktif || undefined} data-tamam={tamam || undefined} aria-labelledby={`adim-${no}`}>
      <header onClick={kapali ? onDuzenle : undefined}>
        <h2 id={`adim-${no}`}>
          <span className={s.no}>{tamam ? <Ikon ad="check" boyut={15} kalinlik={2.6} /> : no}</span>
          {baslik}
        </h2>
        {kapali && (
          <>
            {ozet && <span className={s.ozetMetin}>{ozet}</span>}
            <button type="button" className={s.gri} onClick={(e) => { e.stopPropagation(); onDuzenle(); }}>Düzenle</button>
          </>
        )}
      </header>
      <div className={s.sar}>
        <div className={s.ic} inert={!aktif}>
          <div>{children}</div>
        </div>
      </div>
    </section>
  );
}

function HataYazi({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <small className={s.hata} id={id}>
      <Ikon ad="error" boyut={14} kalinlik={2.2} />
      {children}
    </small>
  );
}

function Alan({ id, etiket, hata, not, onChange, ...girdi }: {
  id: string;
  etiket: string;
  hata?: string;
  not?: string;
  onChange: (v: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "id">) {
  return (
    <div className={s.alanKap}>
      <div className={s.alan} data-hatali={!!hata || undefined}>
        <label htmlFor={id}>{etiket}</label>
        <input id={id} aria-invalid={!!hata} aria-describedby={hata ? `${id}-hata` : undefined} onChange={(e) => onChange(e.target.value)} {...girdi} />
      </div>
      {hata ? <HataYazi id={`${id}-hata`}>{hata}</HataYazi> : not ? <small className={s.not}>{not}</small> : null}
    </div>
  );
}

function Bos() {
  return (
    <div className={`lb ${s.sayfa}`}>
      <header className={s.ust}>
        <Link href="/" className={`lb-y ${s.logo}`}>LookBeds</Link>
      </header>
      <div className={s.bos}>
        <Nesne ad="bavul" boyut={110} />
        <h1 className="lb-y">Rezervasyon bilgisi bulunamadı</h1>
        <p>Bu sayfaya bir oda seçtikten sonra ulaşabilirsin. Bekleyen bir seçimin süresi de dolmuş olabilir.</p>
        <Link href="/" className={s.siyah}>Otel aramaya dön</Link>
      </div>
      <AltBilgi />
    </div>
  );
}
