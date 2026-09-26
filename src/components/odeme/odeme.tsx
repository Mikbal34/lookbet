"use client";
/* eslint-disable @next/next/no-img-element -- otel görseli dış kaynaklı (tedarikçi) */

// Onay ve ödeme (Airbnb gibi): solda adım adım açılan kartlar (iletişim,
// misafirler, ödeme yöntemi, gözden geçir), sağda yapışık özet. Adım
// geçerken yalnız o adımın alanları doğrulanır; kurallar sunucuyla aynı
// şemadan (createBookingSchema) gelir. Onaylanınca /api/booking'e gider,
// başarıda onay sayfasına geçilir.

import { useFiyat } from "@/components/lb/fiyat";
import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { AltBilgi } from "@/components/lb/alt-bilgi";
import { Ikon } from "@/components/lb/ikon";
import { Nesne } from "@/components/lb/nesne";
import { Pencere } from "@/components/lb/pencere";
import { Bekleme, DonenMetin } from "@/components/lb/bekleme";
import { geceSayisi, gunEkle, isoOku } from "@/components/lb/arama/durum";
import { createBookingSchema, yasHesapla, type CreateBookingInput, type GuestInput } from "@/lib/validators/booking.schema";
import type { CancellationPolicy, HotelDetailResponse } from "@/lib/royal-api/types";
import { tarihGoster, useKayitliMisafirler, useProfil } from "@/components/hesap/veri";
import type { Bicimleyici } from "@/i18n/bicim";
import { useBicim } from "@/i18n/use-bicim";
import { KartLogolari } from "./kart-logolari";
import s from "./odeme.module.css";

const ULKELER = ["+90", "+49", "+44", "+31", "+33", "+7", "+1", "+32", "+39", "+34", "+43", "+41"];

interface Iletisim { ad: string; soyad: string; eposta: string; ulke: string; telefon: string }
interface Misafir { ad: string; soyad: string; cins: "" | "Male" | "Female"; dogum: string; tip: "Adult" | "Child"; yas?: number }
type Hatalar = Record<string, string>;

/**
 * İptal koşullarının özeti (otel-detay/yardimci iptalOzeti ile aynı seçim),
 * geçerli dilin biçimiyle. Ücretsiz iptalin son günü {gun} {ay} olarak verilir;
 * Türkçe metin ayın adına göre yönelme eki alır (Eylül'e, Ocak'a). Saatler
 * Türkiye saatiyle.
 */
function iptalBilgisi(politikalar: CancellationPolicy[] | undefined, b: Bicimleyici) {
  const p = politikalar ?? [];
  const bedava = p.find((x) => x.penalty === 0);
  const ceza = p.find((x) => x.penalty > 0);
  const saat = (d: Date) => d.toLocaleTimeString(b.yerel, { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" });
  const son = bedava ? new Date(bedava.toDate) : null;
  const bas = ceza ? new Date(ceza.fromDate) : null;
  return {
    ucretsiz: son ? { gun: son.getDate(), ay: b.ayAdlari[son.getMonth()], saat: saat(son) } : null,
    ceza: ceza && bas ? { tarih: b.gunAyUzun(bas), saat: saat(bas), tutar: ceza.penalty } : null,
  };
}

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

/** `acik`: rezervasyonlar açık mı (REZERVASYON_ACIK); kapalıyken yalnız yönetici test edebilir. */
export function Odeme({ acik = true }: { acik?: boolean }) {
  const p = useSearchParams();
  if (!p.get("roomSearchId") || !p.get("priceCode")) return <Bos />;
  return <OdemeFormu key={p.get("priceCode")} p={p} acik={acik} />;
}

function OdemeFormu({ p, acik }: { p: URLSearchParams; acik: boolean }) {
  const t = useTranslations("odeme");
  const tk = useTranslations("ortak");
  const bicim = useBicim();
  const router = useRouter();
  const oturum = useSession();
  // Ödeme altyapısı gelene kadar rezervasyon kapalı; yönetici test için yapabilir.
  const kapali = !acik && oturum.data?.user?.role !== "ADMIN";

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
  const ip = iptalBilgisi(politikalar, bicim);
  // Seçilen para biriminde gösterim (TCMB kuruyla yaklaşık); ödeme EUR.
  const fiyatGoster = useFiyat();
  const tl = (n: number) => fiyatGoster.yaz(n, paraBirimi);
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
  const [onaylandi, setOnaylandi] = React.useState<null | "onay" | "alindi">(null);
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
    if (!kod) return setKuponMesaj({ metin: t("kupon.kodYaz"), hata: true });
    setKuponYukleniyor(true);
    setKuponMesaj(null);
    try {
      const r = await fetch("/api/kupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kod, priceCode: p.get("priceCode") ?? "" }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setKupon(null);
        return setKuponMesaj({ metin: d.mesaj ?? d.error ?? t("kupon.uygulanamadi"), hata: true });
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
      setKuponMesaj({ metin: tk("baglantiHatasi"), hata: true });
    } finally {
      setKuponYukleniyor(false);
    }
  };
  // Gösterilen döküm: kupon uygulandıysa sunucunun hesabı (kupon kampanyanın
  // yerine geçmiş olabilir), değilse oda aramasındaki fiyatlar.
  const onceki = kupon ? Math.max(kupon.oncekiFiyat, kupon.sonFiyat) : ilkFiyat;
  const kampanyaSatiri = kupon
    ? kupon.kampanya && { ad: t("fiyat.kampanya", { ad: kupon.kampanya.ad, yuzde: kupon.kampanya.yuzde }), tutar: kupon.kampanya.tutar }
    : ilkFiyat - toplam >= 0.01 && {
        ad: kampanyaAd ? (kampanyaYuzde ? t("fiyat.kampanya", { ad: kampanyaAd, yuzde: kampanyaYuzde }) : kampanyaAd) : t("fiyat.indirim"),
        tutar: Math.round((ilkFiyat - toplam) * 100) / 100,
      };
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
    // Müşterinin onayladığı ödenecek tutar (kupon dahil); sunucu kendi hesabıyla karşılaştırır.
    totalPrice: odenecek,
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
  });

  /** Bir adımın hataları; anahtar alanın id'si. Şemanın (Türkçe) mesajları yerine kendi metinlerimiz. */
  const hatalariBul = (n: number): Hatalar => {
    const h: Hatalar = {};
    const r = createBookingSchema.safeParse(yuk());
    const issues = r.success ? [] : r.error.issues;
    if (n === 1) {
      const iletisimHatasi: Record<string, string> = { ad: t("hata.ad"), soyad: t("hata.soyad"), eposta: t("hata.eposta"), telefon: t("hata.telefon") };
      for (const i of issues) {
        if (i.path[0] !== "contact") continue;
        const alan = ALAN_ADI[String(i.path[1])];
        h[`c-${alan}`] ??= iletisimHatasi[alan] ?? t("hata.alan");
      }
      const rakam = iletisim.telefon.replace(/\D/g, "").replace(/^0/, "");
      if (!h["c-telefon"] && (iletisim.ulke === "+90" ? rakam.length !== 10 : rakam.length < 7)) {
        h["c-telefon"] = iletisim.ulke === "+90" ? t("hata.telefonTr") : t("hata.telefonEksik");
      }
    }
    if (n === 2) {
      // Şemanın yaş kuralları (custom): yetişkin girişte 18 altı, çocuk aramadaki yaşta değil.
      const yasHatasi = (m: Misafir) => (m.tip === "Adult" ? t("hata.yetiskinYasi") : t("hata.cocukYasi", { yas: m.yas ?? 0 }));
      for (const i of issues) {
        if (i.path[0] !== "rooms") continue;
        const j = Number(i.path[3]);
        const alan = ALAN_ADI[String(i.path[4])];
        const m = misafirler[j];
        let mesaj = i.code === "custom" && m ? yasHatasi(m) : t("hata.alan");
        if (i.code !== "custom") {
          if (alan === "ad") mesaj = t("hata.misafirAd");
          else if (alan === "soyad") mesaj = t("hata.misafirSoyad");
          else if (alan === "cins") mesaj = t("hata.cinsiyet");
          else if (alan === "dogum") mesaj = m?.dogum ? t("hata.dogumBicim") : t("hata.dogum");
        }
        h[`g${j}-${alan}`] ??= mesaj;
      }
      // Şemanın yaş kuralı diğer alanlar geçerli olunca çalışıyor; aynı turda göstermek için burada da bak.
      misafirler.forEach((m, j) => {
        const d = isoDogum(m.dogum);
        if (!d || h[`g${j}-dogum`]) return;
        const yas = yasHesapla(d, checkIn);
        if (m.tip === "Adult" && yas < 18) h[`g${j}-dogum`] = t("hata.yetiskinYasi");
        if (m.tip === "Child" && m.yas !== undefined && yas !== m.yas) h[`g${j}-dogum`] = t("hata.cocukYasi", { yas: m.yas });
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
        setSunucuHata({ mesaj: t("hata.kuponKaldirildi", { hata: d.error }), odaYenile: false });
        setGonderiliyor(false);
        return;
      }
      if (!r.ok) {
        setSunucuHata({ mesaj: d.error ?? t("hata.olusturulamadi"), odaYenile: r.status === 409 || r.status === 422 });
        setGonderiliyor(false);
        return;
      }
      // Rezervasyon numarası yalnız otelden onay gelince var; yoksa (onay
      // bekleniyor, tedarikçi yanıtı gecikti) numara gösterilmez.
      const no = d.reservation?.bookingNumber ?? d.bookingConfirmation?.bookingNumber ?? "";
      const onayli = d.reservation?.status === "CONFIRMED" && !d.belirsiz;
      // Kart okutma katmanı yeşile dönsün, bir an görünsün, sonra onay sayfası.
      setOnaylandi(onayli ? "onay" : "alindi");
      const qs = new URLSearchParams({ hotelName, checkIn, checkOut, durum: onayli ? "onay" : "bekliyor", ...(no ? { bookingNumber: no } : {}) });
      setTimeout(() => router.push(`/booking/confirmation?${qs}`), 1300);
    } catch {
      setSunucuHata({ mesaj: t("hata.baglanti"), odaYenile: false });
      setGonderiliyor(false);
    }
  };

  const ozetler: Record<number, string> = {
    1: `${iletisim.ad} ${iletisim.soyad} · ${iletisim.eposta}`,
    2: misafirler.map((m) => `${m.ad} ${m.soyad}`).join(", "),
    3: yontem === "kart" ? t("yontem.ozetKart") : t("yontem.ozetHavale"),
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
  const misafirYazi = t("ozet.misafirOzeti", { yetiskin, cocuk: cocuklar.length });
  const iptalKisa = ip.ucretsiz ? (
    <span className={s.yesil}>
      <Ikon ad="check" boyut={16} kalinlik={2.2} /> {t("ozet.iptalUcretsiz", ip.ucretsiz)}
    </span>
  ) : ip.ceza ? (
    <span>{t("ozet.iadeYapilmaz")}</span>
  ) : (
    <span>{t("ozet.iptalBilgiYok")}</span>
  );

  return (
    <div className={`lb ${s.sayfa}`}>
      <header className={s.ust}>
        <Link href="/" className={`lb-y ${s.logo}`}>LookBeds</Link>
        <span className={s.guvenli}>
          <Ikon ad="lock" boyut={18} />
          <span>{t("ust.guvenliBaglanti")}</span>
        </span>
      </header>

      <main className={s.dis}>
        <div className={s.baslik}>
          <Link href={otelAdresi} className={s.geri} aria-label={t("ust.oteleDon")}>
            <Ikon ad="back" boyut={18} />
          </Link>
          <h1 className="lb-y">{t("ust.baslik")}</h1>
        </div>
        {kapali && (
          <div className={`${s.kapaliNot} ${s.kapaliUst}`} role="status">
            <Ikon ad="lock" boyut={20} />
            <div>
              <b>{t("kapali.baslik")}</b>
              <span>{t("kapali.gozdenGecir")}</span>
            </div>
          </div>
        )}

        <div className={s.duzen}>
          <div className={s.adimlar}>
            <Adim {...adimProps(1)} baslik={t("adim.iletisim")}>
              {kullanici && (
                <div className={s.uye}>
                  <Nesne ad="anahtar-karti" boyut={44} />
                  <div>
                    <b>{kullanici.name ? t("iletisim.girisYaptinAdli", { ad: kullanici.name }) : t("iletisim.girisYaptin")}</b>
                    <span>{t("iletisim.hesabaKaydedilir")}</span>
                  </div>
                </div>
              )}
              <div className={s.alanlar}>
                <Alan id="c-ad" etiket={t("alan.ad")} hata={hatalar["c-ad"]} value={iletisim.ad} onChange={(v) => iletisimDegis("ad", v)} autoComplete="given-name" />
                <Alan id="c-soyad" etiket={t("alan.soyad")} hata={hatalar["c-soyad"]} value={iletisim.soyad} onChange={(v) => iletisimDegis("soyad", v)} autoComplete="family-name" />
              </div>
              <Alan id="c-eposta" etiket={t("alan.eposta")} type="email" hata={hatalar["c-eposta"]} value={iletisim.eposta} onChange={(v) => iletisimDegis("eposta", v)} autoComplete="email" not={t("iletisim.epostaNot")} />
              <div className={s.tel}>
                <div className={s.alan}>
                  <label htmlFor="c-ulke">{t("iletisim.ulkeKodu")}</label>
                  <select id="c-ulke" value={iletisim.ulke} onChange={(e) => iletisimDegis("ulke", e.target.value)}>
                    {ULKELER.map((u) => <option key={u}>{u}</option>)}
                  </select>
                  <Ikon ad="chevron-down" boyut={16} className={s.secOk} />
                </div>
                <Alan id="c-telefon" etiket={t("alan.telefon")} type="tel" inputMode="tel" hata={hatalar["c-telefon"]} value={iletisim.telefon} onChange={(v) => iletisimDegis("telefon", v)} autoComplete="tel-national" placeholder={iletisim.ulke === "+90" ? "5XX XXX XX XX" : undefined} />
              </div>
              <div className={s.adimAlt}>
                <button type="button" className={s.dugme} onClick={() => devam(1)}>{tk("devam")}</button>
              </div>
            </Adim>

            <Adim {...adimProps(2)} baslik={t("adim.misafirler")}>
              <label className={s.onayKutu}>
                <input
                  type="checkbox"
                  checked={benDe}
                  onChange={(e) => {
                    setBenDe(e.target.checked);
                    if (e.target.checked) setMisafirler((m) => m.map((x, j) => (j === 0 ? { ...x, ad: iletisim.ad, soyad: iletisim.soyad } : x)));
                  }}
                />
                <span>{t("misafir.benDe")}</span>
              </label>
              {kayitli.length > 0 && misafirler.length > (benDe ? 1 : 0) && (
                <div className={s.kayitli}>
                  <span>{bosYer < 0 ? t("misafir.kayitliDolu") : t("misafir.kayitliSec")}</span>
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
                    {m.tip === "Adult" ? t("misafir.yetiskinBaslik", { sira: j + 1 }) : t("misafir.cocukBaslik", { sira: j + 1, yas: m.yas ?? 0 })}
                  </legend>
                  <div className={s.alanlar}>
                    <Alan id={`g${j}-ad`} etiket={t("alan.ad")} hata={hatalar[`g${j}-ad`]} value={m.ad} onChange={(v) => misafirDegis(j, "ad", v)} />
                    <Alan id={`g${j}-soyad`} etiket={t("alan.soyad")} hata={hatalar[`g${j}-soyad`]} value={m.soyad} onChange={(v) => misafirDegis(j, "soyad", v)} />
                  </div>
                  <div className={s.alanlar}>
                    <div>
                      <div className={s.secimAlan} data-hatali={!!hatalar[`g${j}-cins`] || undefined}>
                        <span className={s.etiket} id={`g${j}-cins-e`}>{t("alan.cinsiyet")}</span>
                        <div className={s.parca} role="radiogroup" aria-labelledby={`g${j}-cins-e`} id={`g${j}-cins`} tabIndex={-1}>
                          {(["Female", "Male"] as const).map((c) => (
                            <label key={c}>
                              <input type="radio" name={`g${j}-cins`} value={c} checked={m.cins === c} onChange={() => misafirDegis(j, "cins", c)} />
                              <span>{c === "Female" ? t("alan.kadin") : t("alan.erkek")}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      {hatalar[`g${j}-cins`] && <HataYazi>{hatalar[`g${j}-cins`]}</HataYazi>}
                    </div>
                    <Alan
                      id={`g${j}-dogum`}
                      etiket={t("alan.dogum")}
                      placeholder={t("alan.dogumOrnek")}
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
                <label htmlFor="istek">{t("misafir.istek")}</label>
                <textarea id="istek" maxLength={500} value={istek} onChange={(e) => setIstek(e.target.value)} placeholder={t("misafir.istekOrnek")} />
                <small className={s.not}>{t("misafir.istekNot", { sayi: istek.length })}</small>
              </div>
              <div className={s.adimAlt}>
                <button type="button" className={s.dugme} onClick={() => devam(2)}>{tk("devam")}</button>
              </div>
            </Adim>

            <Adim {...adimProps(3)} baslik={t("adim.yontem")}>
              <div className={s.yontem} role="radiogroup" aria-label={t("adim.yontem")}>
                <label>
                  <input type="radio" name="yontem" checked={yontem === "kart"} onChange={() => setYontem("kart")} />
                  <span className={s.kutu}>
                    <Nesne ad="odeme-karti" boyut={40} />
                    <span>
                      <b>{t("yontem.kart")}</b>
                      <small>{t("yontem.kartAlt")}</small>
                    </span>
                  </span>
                </label>
                <label>
                  <input type="radio" name="yontem" checked={yontem === "havale"} onChange={() => setYontem("havale")} />
                  <span className={s.kutu}>
                    <Nesne ad="havale" boyut={40} />
                    <span>
                      <b>{t("yontem.havale")}</b>
                      <small>{t("yontem.havaleAlt")}</small>
                    </span>
                  </span>
                </label>
              </div>
              {yontem === "kart" ? (
                <div className={s.yontemBilgi}>
                  <KartLogolari />
                  <span>{t("yontem.kartBilgi")}</span>
                </div>
              ) : (
                <div className={s.yontemBilgi}>
                  <b>{t("yontem.havaleBaslik")}</b>
                  <span>{t("yontem.havaleBilgi")}</span>
                </div>
              )}
              <div className={s.adimAlt}>
                <button type="button" className={s.dugme} onClick={() => devam(3)}>{tk("devam")}</button>
              </div>
            </Adim>

            <Adim {...adimProps(4)} baslik={t("adim.gozden")}>
              <ul className={s.gozden}>
                <li>
                  <Ikon ad="calendar" boyut={22} />
                  <span>
                    <b>{t("iptal.baslik")}</b>
                    {ip.ucretsiz
                      ? ip.ceza
                        ? t("gozden.iptalUcretsizCezali", { ...ip.ucretsiz, ceza: tl(ip.ceza.tutar) })
                        : t("gozden.iptalUcretsiz", ip.ucretsiz)
                      : ip.ceza
                        ? t("gozden.iadeEdilmez")
                        : t("gozden.iptalBilgiYok")}
                  </span>
                </li>
                {otel?.policies?.checkInFrom && (
                  <li>
                    <Ikon ad="clock" boyut={22} />
                    <span>
                      <b>{t("gozden.girisCikisBaslik")}</b>
                      {otel.policies.checkOutUntil
                        ? t("gozden.girisCikis", { giris: otel.policies.checkInFrom, cikis: otel.policies.checkOutUntil })
                        : t("gozden.girisSaati", { giris: otel.policies.checkInFrom })}
                    </span>
                  </li>
                )}
                {(otel?.policies?.importantInfo?.length ?? 0) > 0 && (
                  <li>
                    <Ikon ad="secure" boyut={22} />
                    <span>
                      <b>{t("gozden.notlarBaslik")}</b>
                      <button type="button" className={s.metinDugme} onClick={() => setPencere("bilgi")}>{t("gozden.notlariOku")}</button>
                    </span>
                  </li>
                )}
              </ul>
              <label className={s.onayKutu}>
                <input type="checkbox" checked={sozlesme} onChange={(e) => setSozlesme(e.target.checked)} />
                <span>
                  {t.rich("gozden.sozlesme", {
                    dugme: (c) => (
                      <button type="button" className={s.metinDugme} onClick={(e) => { e.preventDefault(); setPencere("dokum"); }}>{c}</button>
                    ),
                  })}
                </span>
              </label>
              {sunucuHata && (
                <div className={s.sunucuHata} role="alert">
                  <Ikon ad="warning" boyut={20} />
                  <div>
                    <b>{t("gozden.tamamlanamadi")}</b>
                    <span>{sunucuHata.mesaj}</span>
                    {sunucuHata.odaYenile && <Link href={otelAdresi} className={s.metinDugme}>{t("gozden.odayiYenidenSec")}</Link>}
                  </div>
                </div>
              )}
              {kapali && (
                <div className={s.kapaliNot} role="status">
                  <Ikon ad="lock" boyut={20} />
                  <div>
                    <b>{t("kapali.baslik")}</b>
                    <span>{t("kapali.yakinda")}</span>
                  </div>
                </div>
              )}
              <div className={`${s.adimAlt} ${s.solda}`}>
                <button type="button" className={`${s.dugme} ${s.onayla}`} onClick={onayla} disabled={kapali || !sozlesme || gonderiliyor}>
                  <Ikon ad={gonderiliyor ? "loading" : "lock"} boyut={18} className={gonderiliyor ? s.don : undefined} />
                  {gonderiliyor ? t("gozden.yapiliyor") : t("gozden.onayla", { tutar: tl(odenecek) })}
                </button>
              </div>
            </Adim>
          </div>

          <aside className={s.ozet} data-acik={mobilOzet || undefined} aria-label={t("ozet.etiket")}>
            <button type="button" className={s.mobilOzet} aria-expanded={mobilOzet} onClick={() => setMobilOzet((a) => !a)}>
              <span>
                <b>{t("ozet.etiket")}</b>
                <span>{tl(odenecek)} · {giris && cikis ? `${giris.getDate()}–${bicim.gunAyYil(cikis)}` : ""}</span>
              </span>
              <Ikon ad="chevron-down" boyut={20} />
            </button>
            <div className={s.ozetKart}>
              <div className={s.ozetUst}>
                <span className={s.ozetFoto}>{foto ? <img src={foto} alt="" /> : <Nesne ad="zil" boyut={48} />}</span>
                <div>
                  <b>{hotelName}</b>
                  <span>{[roomName, boardTypeName].filter(Boolean).join(" · ")}</span>
                  {(otel?.stars || yer) && <span>{[otel?.stars ? tk("yildizli", { sayi: otel.stars }) : null, yer || null].filter(Boolean).join(" · ")}</span>}
                </div>
              </div>
              <div className={`${s.satir} ${s.iptalSatir}`}>
                {iptalKisa}
                {(ip.ucretsiz || ip.ceza) && <button type="button" className={s.gri} onClick={() => setPencere("iptal")}>{t("ozet.ayrintilar")}</button>}
              </div>
              <div className={s.satir}>
                <div>
                  <b>{t("ozet.tarihler")}</b>
                  <span>{giris && cikis ? t("ozet.tarihAraligi", { giris: bicim.gunAyYil(giris), cikis: bicim.gunAyYil(cikis), gece }) : "—"}</span>
                </div>
                <Link href={otelAdresi} className={s.gri}>{t("ozet.degistir")}</Link>
              </div>
              <div className={s.satir}>
                <div>
                  <b>{t("ozet.misafirler")}</b>
                  <span>{misafirYazi}</span>
                </div>
                <Link href={otelAdresi} className={s.gri}>{t("ozet.degistir")}</Link>
              </div>
              <div className={s.fiyat}>
                <h3>{t("fiyat.baslik")}</h3>
                <div>
                  <span>{t("fiyat.geceBasi", { fiyat: tl(onceki / gece), gece })}</span>
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
                      {t("fiyat.kupon", { kod: kupon.kod })}{" "}
                      <button type="button" className={s.metinDugme} onClick={() => { setKupon(null); setKuponMesaj(null); }}>{t("fiyat.kaldir")}</button>
                    </span>
                    <span>−{tl(kupon.tutar)}</span>
                  </div>
                )}
                <div>
                  <span>{t("fiyat.vergiler")}</span>
                  <span>{t("fiyat.dahil")}</span>
                </div>
              </div>
              <div className={s.toplam}>
                <b>
                  {t.rich("fiyat.toplam", { birim: fiyatGoster.birim, kucuk: (c) => <small>{c}</small> })}
                </b>
                <span className="lb-y">{tl(odenecek)}</span>
              </div>
              {fiyatGoster.cevrildi && (
                <p className={s.kurNotu}>
                  {t.rich(fiyatGoster.kurTarihi ? "fiyat.kurNotuTarihli" : "fiyat.kurNotu", {
                    para: paraBirimi,
                    tutar: fiyatGoster.asil(odenecek, paraBirimi),
                    birim: fiyatGoster.birim,
                    tarih: fiyatGoster.kurTarihi ?? "",
                    b: (c) => <b>{c}</b>,
                  })}
                </p>
              )}
              {!kupon && (
                <div className={s.kupon}>
                  {kuponAcik ? (
                    <form className={s.kuponForm} onSubmit={kuponUygula} noValidate>
                      <div className={s.alan}>
                        <label htmlFor="kupon">{t("kupon.kod")}</label>
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
                      <button type="submit" className={s.kuponDugme} disabled={kuponYukleniyor}>{kuponYukleniyor ? "…" : t("kupon.uygula")}</button>
                    </form>
                  ) : (
                    <button type="button" className={s.metinDugme} onClick={() => setKuponAcik(true)}>{t("kupon.ekle")}</button>
                  )}
                </div>
              )}
              {kuponMesaj && (
                <p className={s.kuponMesaj} data-hata={kuponMesaj.hata || undefined} role={kuponMesaj.hata ? "alert" : "status"}>{kuponMesaj.metin}</p>
              )}
              <button type="button" className={s.metinDugme} onClick={() => setPencere("dokum")}>{t("fiyat.dokum")}</button>
            </div>
            <div className={s.guven}>
              <Nesne ad="kilit" boyut={48} />
              <div>
                <b>{t("ozet.guvendeBaslik")}</b>
                <span>{t("ozet.guvendeMetin")}</span>
              </div>
            </div>
          </aside>
        </div>
      </main>

      <AltBilgi />

      <Pencere acik={pencere === "iptal"} onKapat={() => setPencere(null)} baslik={t("iptal.baslik")} genislik={560}>
        <div className={s.zaman}>
          {ip.ucretsiz && (
            <div>
              <b>{t("iptal.kadar", ip.ucretsiz)}</b>
              <span>{t("iptal.ucretsizTamIade", { saat: ip.ucretsiz.saat })}</span>
            </div>
          )}
          {ip.ceza && (
            <div className={s.ceza}>
              <b>{ip.ucretsiz ? t("iptal.cezaBaslangic", { tarih: ip.ceza.tarih, saat: ip.ceza.saat }) : t("iptal.rezervasyondan")}</b>
              <span>{t(ip.ceza.tutar >= toplam ? "iptal.ucretToplam" : "iptal.ucret", { tutar: tl(ip.ceza.tutar) })}</span>
            </div>
          )}
        </div>
        <p className={s.pencereNot}>{t("iptal.not")}</p>
      </Pencere>
      <Pencere acik={pencere === "dokum"} onKapat={() => setPencere(null)} baslik={t("dokum.baslik")} genislik={560}>
        <div className={s.dokum}>
          <div><span>{t("dokum.hizmet")}</span><span>{t("dokum.otelKonaklamasi")}</span></div>
          <div><span>{t("dokum.otel")}</span><span>{hotelName}</span></div>
          <div><span>{t("dokum.oda")}</span><span>{[roomName, boardTypeName].filter(Boolean).join(" · ")}</span></div>
          <div><span>{t("dokum.misafirler")}</span><span>{misafirYazi}</span></div>
          {geceler.map((d) => (
            <div key={d.getTime()}>
              <span>{bicim.haftaGunuUzun(d)}</span>
              <span>{tl(onceki / gece)}</span>
            </div>
          ))}
          {kampanyaSatiri && <div><span>{kampanyaSatiri.ad}</span><span>−{tl(kampanyaSatiri.tutar)}</span></div>}
          {kupon && <div><span>{t("fiyat.kupon", { kod: kupon.kod })}</span><span>−{tl(kupon.tutar)}</span></div>}
          <div><b>{t("dokum.toplam", { birim: fiyatGoster.birim })}</b><b>{tl(odenecek)}</b></div>
          {fiyatGoster.cevrildi && <div><span>{t("dokum.odenecek", { para: paraBirimi })}</span><span>{fiyatGoster.asil(odenecek, paraBirimi)}</span></div>}
          <div>
            <span>{t("dokum.iptal")}</span>
            <span>
              {ip.ucretsiz
                ? ip.ceza
                  ? t("dokum.ucretsizCezali", { ...ip.ucretsiz, tutar: tl(ip.ceza.tutar) })
                  : t("dokum.ucretsizUcretli", ip.ucretsiz)
                : ip.ceza
                  ? t("dokum.iadeEdilmez")
                  : t("dokum.bilgiYok")}
            </span>
          </div>
        </div>
      </Pencere>
      {gonderiliyor && (
        <div className={s.onayKatman} role="alertdialog" aria-modal="true" aria-labelledby="onay-baslik" aria-live="polite">
          <div>
            <Bekleme tur="kart" boyut={150} bitti={!!onaylandi} etiket={null} />
            <h2 id="onay-baslik" className="lb-y">
              {onaylandi === "onay" ? t("katman.onaylandi") : onaylandi === "alindi" ? t("katman.alindi") : t("katman.yapiliyor")}
            </h2>
            {onaylandi ? (
              <p>{t("katman.yonlendiriliyor")}</p>
            ) : (
              <>
                <DonenMetin metinler={[t("katman.iletiliyor"), t("katman.ayirtiliyor"), t("katman.bekleniyor")]} aralik={3500} className={s.onayMetin} />
                <small>{t("katman.sayfayiKapatma")}</small>
              </>
            )}
          </div>
        </div>
      )}
      <Pencere acik={pencere === "bilgi"} onKapat={() => setPencere(null)} baslik={t("gozden.notlarBaslik")}>
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
  const t = useTranslations("odeme");
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
            <button type="button" className={s.gri} onClick={(e) => { e.stopPropagation(); onDuzenle(); }}>{t("adim.duzenle")}</button>
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
  const t = useTranslations("odeme");
  return (
    <div className={`lb ${s.sayfa}`}>
      <header className={s.ust}>
        <Link href="/" className={`lb-y ${s.logo}`}>LookBeds</Link>
      </header>
      <div className={s.bos}>
        <Nesne ad="bavul" boyut={110} />
        <h1 className="lb-y">{t("bos.baslik")}</h1>
        <p>{t("bos.metin")}</p>
        <Link href="/" className={s.siyah}>{t("bos.aramayaDon")}</Link>
      </div>
      <AltBilgi />
    </div>
  );
}
