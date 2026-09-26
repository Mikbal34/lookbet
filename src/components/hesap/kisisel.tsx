"use client";

// Kişisel bilgiler (Airbnb gibi satır satır): ad, e-posta (salt okunur),
// telefon, doğum tarihi, uyruk. Bir satır açıkken diğerleri soluklaşır.
// Altında kayıtlı misafirler: ödeme adımında tek dokunuşla eklenir.

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useLocale as useDil, useTranslations } from "next-intl";
import { Ikon } from "@/components/lb/ikon";
import { Nesne } from "@/components/lb/nesne";
import { NATIONALITIES } from "@/lib/constants/nationalities";
import { DESTEK } from "@/components/yardim/makaleler";
import { HesapKabugu } from "./kabuk";
import { tarihGoster, tarihMaskesi, tarihOku, useKayitliMisafirler, useProfil, type Profil } from "./veri";
import s from "./hesap.module.css";

type Alan = "ad" | "telefon" | "dogum" | "uyruk";
const ULKELER = ["+90", "+49", "+44", "+31", "+33", "+7", "+1"];

// Uyruk adları hesap.kisisel.uyruklar.* anahtarlarında (liste ortak:
// lib/constants/nationalities). Listeye ülke eklenirse burası derlemede uyarır.
type UyrukKodu = (typeof NATIONALITIES)[number]["code"];
const UYRUK_ANAHTARI = {
  TR: "turkiye",
  DE: "almanya",
  GB: "ingiltere",
  FR: "fransa",
  RU: "rusya",
  US: "amerika",
  NL: "hollanda",
  BE: "belcika",
  IT: "italya",
  ES: "ispanya",
} as const satisfies Record<UyrukKodu, string>;

async function kaydet(veri: Record<string, string>, yedekHata: string) {
  const r = await fetch("/api/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(veri) });
  if (!r.ok) {
    const d = await r.json().catch(() => ({}));
    const ilk = d.details?.fieldErrors ? Object.values(d.details.fieldErrors).flat()[0] : null;
    throw new Error((ilk as string) || yedekHata);
  }
}

export function KisiselBilgiler() {
  const t = useTranslations("hesap");
  const { status } = useSession();
  const profil = useProfil(status === "authenticated");
  return (
    <HesapKabugu kirinti={t("kisisel.baslik")}>
      <h1 className={`lb-y ${s.altBaslik}`}>{t("kisisel.baslik")}</h1>
      <div className={s.altDuzen}>
        <div>
          {profil.data ? <Satirlar p={profil.data} /> : <div className={s.iskelet} aria-busy="true" />}
          <KayitliMisafirler />
        </div>
        <aside className={s.bilgiKart}>
          <div>
            <Nesne ad="kilit" boyut={48} />
            <b>{t("kisisel.paylasimBaslik")}</b>
            <span>{t("kisisel.paylasimMetin")}</span>
          </div>
          <div>
            <Nesne ad="pasaport" boyut={48} />
            <b>{t("kisisel.dogumBaslik")}</b>
            <span>{t("kisisel.dogumMetin")}</span>
          </div>
        </aside>
      </div>
    </HesapKabugu>
  );
}

function Satirlar({ p }: { p: Profil }) {
  const t = useTranslations("hesap");
  const tk = useTranslations("ortak");
  const istemci = useQueryClient();
  const { update } = useSession();
  const [acik, setAcik] = React.useState<Alan | null>(null);
  const [hata, setHata] = React.useState<string | null>(null);
  const [kayit, setKayit] = React.useState(false);
  const [bildiri, setBildiri] = React.useState<string | null>(null);

  const parca = p.name.trim().split(/\s+/);
  const [ad, setAd] = React.useState(parca.length > 1 ? parca.slice(0, -1).join(" ") : parca[0] ?? "");
  const [soyad, setSoyad] = React.useState(parca.length > 1 ? parca[parca.length - 1] : "");
  const telParca = (p.phone ?? "").match(/^(\+\d{1,3})\s*(.*)$/);
  const [ulke, setUlke] = React.useState(telParca?.[1] ?? "+90");
  const [tel, setTel] = React.useState(telParca?.[2] ?? p.phone ?? "");
  const [dogum, setDogum] = React.useState(tarihGoster(p.birthDate));
  const [uyruk, setUyruk] = React.useState(p.nationality ?? "TR");

  const ac = (a: Alan) => {
    setHata(null);
    setAcik((x) => (x === a ? null : a));
  };
  const gonder = async (e: React.FormEvent, veri: Record<string, string>, adDegisti?: string) => {
    e.preventDefault();
    setKayit(true);
    setHata(null);
    try {
      await kaydet(veri, t("kisisel.kaydedilemedi"));
      if (adDegisti) await update({ name: adDegisti });
      await istemci.invalidateQueries({ queryKey: ["profil"] });
      setAcik(null);
      setBildiri(t("kisisel.kaydedildi"));
      setTimeout(() => setBildiri(null), 2000);
    } catch (x) {
      setHata((x as Error).message);
    } finally {
      setKayit(false);
    }
  };

  const ulkeAdi = (kod: UyrukKodu) => t(`kisisel.uyruklar.${UYRUK_ANAHTARI[kod]}`);
  const kayitliUyruk = NATIONALITIES.find((n) => n.code === p.nationality)?.code;
  const uyrukAdi = kayitliUyruk ? ulkeAdi(kayitliUyruk) : undefined;
  const satir = (a: Alan | null, baslik: React.ReactNode, deger: React.ReactNode, dugme: string | null, form?: React.ReactNode) => (
    <div className={s.satir} data-acik={(a && acik === a) || undefined}>
      <div className={s.satirUst}>
        <div>
          <b>{baslik}</b>
          <span>{deger}</span>
        </div>
        {a && dugme && (
          <button type="button" className={s.metinDugme} onClick={() => ac(a)}>{acik === a ? tk("iptal") : dugme}</button>
        )}
      </div>
      {a && acik === a && form}
    </div>
  );
  const hataYazi = hata && (
    <small className={s.hata} role="alert"><Ikon ad="warning" boyut={16} kalinlik={2.1} />{hata}</small>
  );

  return (
    <div className={s.satirlar} data-duzenleniyor={acik || undefined}>
      {satir("ad", t("kisisel.adSoyad"), p.name, t("kisisel.duzenle"),
        <form className={s.satirForm} onSubmit={(e) => {
          if (ad.trim().length < 2 || soyad.trim().length < 2) { e.preventDefault(); return setHata(t("kisisel.adSoyadHata")); }
          const isim = `${ad.trim()} ${soyad.trim()}`;
          gonder(e, { name: isim }, isim);
        }}>
          <p className={s.not}>{t("kisisel.kimlikNotu")}</p>
          <div className={s.iki}>
            <Girdi id="k-ad" etiket={t("kisisel.ad")} value={ad} onChange={setAd} autoComplete="given-name" />
            <Girdi id="k-soyad" etiket={t("kisisel.soyad")} value={soyad} onChange={setSoyad} autoComplete="family-name" />
          </div>
          {hataYazi}
          <div><button type="submit" className={`${s.dugme} ${s.siyah}`} disabled={kayit}>{kayit ? t("kisisel.kaydediliyor") : tk("kaydet")}</button></div>
        </form>
      )}
      {satir(null, <>{t("kisisel.eposta")} <span className={s.rozet}><Ikon ad="check" boyut={12} kalinlik={2.6} />{t("kisisel.dogrulandi")}</span></>,
        <>{p.email} · <a href={`mailto:${DESTEK.eposta}`}>{t("kisisel.epostaDegistir")}</a></>, null)}
      {satir("telefon", t("kisisel.telefon"), p.phone ?? t("kisisel.telefonYok"), p.phone ? t("kisisel.duzenle") : t("kisisel.ekle"),
        <form className={s.satirForm} onSubmit={(e) => {
          const rakam = tel.replace(/\D/g, "");
          if (rakam && rakam.length < 7) { e.preventDefault(); return setHata(t("kisisel.telefonHata")); }
          gonder(e, { phone: rakam ? `${ulke} ${tel.trim()}` : "" });
        }}>
          <div className={s.tel}>
            <div className={s.alan}>
              <label htmlFor="k-ulke">{t("kisisel.ulkeKodu")}</label>
              <select id="k-ulke" value={ulke} onChange={(e) => setUlke(e.target.value)}>
                {ULKELER.map((u) => <option key={u}>{u}</option>)}
              </select>
              <Ikon ad="chevron-down" boyut={16} className={s.secOk} />
            </div>
            <Girdi id="k-tel" etiket={t("kisisel.telefon")} value={tel} onChange={setTel} type="tel" inputMode="tel" autoComplete="tel-national" placeholder={ulke === "+90" ? "5XX XXX XX XX" : undefined} />
          </div>
          {hataYazi}
          <div className={s.satirAlt}>
            <button type="submit" className={`${s.dugme} ${s.siyah}`} disabled={kayit}>{kayit ? t("kisisel.kaydediliyor") : tk("kaydet")}</button>
            {p.phone && <button type="button" className={s.metinDugme} onClick={(e) => gonder(e as unknown as React.FormEvent, { phone: "" })}>{t("kisisel.telefonKaldir")}</button>}
          </div>
        </form>
      )}
      {satir("dogum", t("kisisel.dogumTarihi"), p.birthDate ? tarihGoster(p.birthDate) : t("kisisel.eklenmedi"), p.birthDate ? t("kisisel.duzenle") : t("kisisel.ekle"),
        <form className={s.satirForm} onSubmit={(e) => {
          const iso = tarihOku(dogum);
          if (!iso) { e.preventDefault(); return setHata(t("kisisel.dogumHata")); }
          gonder(e, { birthDate: iso });
        }}>
          <Girdi id="k-dogum" etiket={t("kisisel.dogumEtiket")} value={dogum} onChange={(v) => setDogum(tarihMaskesi(v))} inputMode="numeric" maxLength={10} autoComplete="bday" />
          {hataYazi}
          <div><button type="submit" className={`${s.dugme} ${s.siyah}`} disabled={kayit}>{kayit ? t("kisisel.kaydediliyor") : tk("kaydet")}</button></div>
        </form>
      )}
      {satir("uyruk", t("kisisel.uyruk"), uyrukAdi ?? t("kisisel.eklenmedi"), uyrukAdi ? t("kisisel.duzenle") : t("kisisel.ekle"),
        <form className={s.satirForm} onSubmit={(e) => gonder(e, { nationality: uyruk })}>
          <p className={s.not}>{t("kisisel.uyrukNotu")}</p>
          <div className={s.alan}>
            <label htmlFor="k-uyruk">{t("kisisel.uyruk")}</label>
            <select id="k-uyruk" value={uyruk} onChange={(e) => setUyruk(e.target.value)}>
              {NATIONALITIES.map((n) => <option key={n.code} value={n.code}>{ulkeAdi(n.code)}</option>)}
            </select>
            <Ikon ad="chevron-down" boyut={16} className={s.secOk} />
          </div>
          {hataYazi}
          <div><button type="submit" className={`${s.dugme} ${s.siyah}`} disabled={kayit}>{kayit ? t("kisisel.kaydediliyor") : tk("kaydet")}</button></div>
        </form>
      )}
      {bildiri && <div className={s.bildiri} role="status">{bildiri}</div>}
    </div>
  );
}

function KayitliMisafirler() {
  const dil = useDil();
  const t = useTranslations("hesap");
  const tk = useTranslations("ortak");
  const { status } = useSession();
  const istemci = useQueryClient();
  const q = useKayitliMisafirler(status === "authenticated");
  const [form, setForm] = React.useState(false);
  const [ad, setAd] = React.useState("");
  const [soyad, setSoyad] = React.useState("");
  const [cins, setCins] = React.useState<"" | "Male" | "Female">("");
  const [dogum, setDogum] = React.useState("");
  const [hata, setHata] = React.useState<string | null>(null);
  const [kayit, setKayit] = React.useState(false);

  const ekle = async (e: React.FormEvent) => {
    e.preventDefault();
    const iso = tarihOku(dogum);
    if (ad.trim().length < 2 || soyad.trim().length < 2) return setHata(t("misafirler.adSoyadHata"));
    if (!iso) return setHata(t("misafirler.dogumHata"));
    setKayit(true);
    setHata(null);
    try {
      const r = await fetch("/api/profile/misafirler", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: ad.trim(), surname: soyad.trim(), birthDate: iso, ...(cins ? { gender: cins } : {}) }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) return setHata(d.error ?? t("misafirler.kaydedilemedi"));
      await istemci.invalidateQueries({ queryKey: ["kayitli-misafirler"] });
      setForm(false);
      setAd("");
      setSoyad("");
      setCins("");
      setDogum("");
    } finally {
      setKayit(false);
    }
  };
  const sil = async (id: string) => {
    const r = await fetch(`/api/profile/misafirler/${id}`, { method: "DELETE" });
    if (r.ok) istemci.invalidateQueries({ queryKey: ["kayitli-misafirler"] });
  };

  return (
    <section aria-labelledby="kayitli-baslik">
      <h2 id="kayitli-baslik" className={s.bolumBaslik}>{t("misafirler.baslik")}</h2>
      <p className={s.bolumAlt}>{t("misafirler.aciklama")}</p>
      <div className={s.misafirler}>
        {(q.data ?? []).map((m) => (
          <div key={m.id} className={s.misafir}>
            <span className={s.kucukAvatar}>{m.name[0]?.toLocaleUpperCase(dil)}</span>
            <div>
              <b>{m.name} {m.surname}</b>
              <span>{tarihGoster(m.birthDate)}{m.gender ? ` · ${m.gender === "Female" ? t("misafirler.kadin") : t("misafirler.erkek")}` : ""}</span>
            </div>
            <button type="button" className={s.metinDugme} onClick={() => sil(m.id)}>{t("misafirler.kaldir")}</button>
          </div>
        ))}
        {form ? (
          <form className={s.misafirForm} onSubmit={ekle}>
            <div className={s.iki}>
              <Girdi id="m-ad" etiket={t("kisisel.ad")} value={ad} onChange={(v) => { setAd(v); setHata(null); }} />
              <Girdi id="m-soyad" etiket={t("kisisel.soyad")} value={soyad} onChange={(v) => { setSoyad(v); setHata(null); }} />
            </div>
            <div className={s.iki}>
              <div className={s.parcaKap}>
                <span className={s.parcaEtiket} id="m-cins">{t("misafirler.cinsiyet")}</span>
                <div className={s.parca} role="radiogroup" aria-labelledby="m-cins">
                  {(["Female", "Male"] as const).map((c) => (
                    <label key={c}>
                      <input type="radio" name="m-cins" checked={cins === c} onChange={() => setCins(c)} />
                      <span>{c === "Female" ? t("misafirler.kadin") : t("misafirler.erkek")}</span>
                    </label>
                  ))}
                </div>
              </div>
              <Girdi id="m-dogum" etiket={t("kisisel.dogumTarihi")} placeholder={t("misafirler.tarihBicimi")} value={dogum} onChange={(v) => { setDogum(tarihMaskesi(v)); setHata(null); }} inputMode="numeric" maxLength={10} />
            </div>
            {hata && <small className={s.hata} role="alert"><Ikon ad="warning" boyut={16} kalinlik={2.1} />{hata}</small>}
            <div className={s.satirAlt}>
              <button type="submit" className={`${s.dugme} ${s.siyah}`} disabled={kayit}>{kayit ? t("kisisel.kaydediliyor") : t("misafirler.kaydet")}</button>
              <button type="button" className={s.metinDugme} onClick={() => { setForm(false); setHata(null); }}>{tk("iptal")}</button>
            </div>
          </form>
        ) : (
          <button type="button" className={s.ekle} onClick={() => setForm(true)}>
            <Ikon ad="plus" boyut={16} kalinlik={2.2} />
            {t("misafirler.ekle")}
          </button>
        )}
      </div>
    </section>
  );
}

function Girdi({ id, etiket, onChange, ...girdi }: {
  id: string;
  etiket: string;
  onChange: (v: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "id">) {
  return (
    <div className={s.alan}>
      <label htmlFor={id}>{etiket}</label>
      <input id={id} onChange={(e) => onChange(e.target.value)} {...girdi} />
    </div>
  );
}
