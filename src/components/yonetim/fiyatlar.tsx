"use client";

// Yönetim › Fiyatlar: "Fiyat nasıl oluşuyor?" hesaplayıcısı, fiyat kuralları
// ve acentelere özel komisyonlar. Hesaplayıcı lib/pricing/engine ile aynı
// kuralı izler: etkin, tarihi tutan, kişiye (müşteri / tüm acenteler / tek
// acente), otele ve pansiyona uyan kurallardan önceliği en yüksek TEK kural
// uygulanır; acentede ardından acentenin indirim oranı düşülür. Komisyon
// (motordaki calculateCommission): uyan özel komisyon varsa o, yoksa
// acentenin anlaşma oranı; rezervasyonda o anki tutar saklanır.

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ikon } from "@/components/lb/ikon";
import { Pencere } from "@/components/lb/pencere";
import { Anahtar, Girdi, HataYazi, Secim, eur, getir, gonder, tarihKisa, useBildiri } from "./ortak";
import s from "./yonetim.module.css";

type Tur = "MARKUP" | "PERCENTAGE_DISCOUNT" | "FIXED_DISCOUNT";
type Hedef = "ALL_CUSTOMERS" | "ALL_AGENCIES" | "SPECIFIC_AGENCY";
interface Kural {
  id: string;
  name: string;
  type: Tur;
  value: number;
  appliesTo: Hedef;
  agencyId: string | null;
  agency: { id: string; companyName: string } | null;
  hotelCode: string | null;
  hotelName: string | null;
  boardType: string | null;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
  priority: number;
}
interface Komisyon {
  id: string;
  agencyId: string;
  agency: { id: string; companyName: string };
  type: "PERCENTAGE" | "FIXED";
  value: number;
  hotelCode: string | null;
  hotelName: string | null;
  boardType: string | null;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
}
interface Secenekler {
  pansiyonlar: { code: string; name: string }[];
  acenteler: { id: string; companyName: string; commission: number; discountRate: number }[];
}

const TUR_AD: Record<Tur, string> = { MARKUP: "Kâr payı", PERCENTAGE_DISCOUNT: "Yüzde indirim", FIXED_DISCOUNT: "Tutar indirimi" };
const HEDEF_AD: Record<Hedef, string> = { ALL_CUSTOMERS: "Tüm müşteriler", ALL_AGENCIES: "Tüm acenteler", SPECIFIC_AGENCY: "Tek acente" };
const degerYazi = (k: Pick<Kural, "type" | "value">) =>
  k.type === "MARKUP" ? `+%${k.value}` : k.type === "PERCENTAGE_DISCOUNT" ? `−%${k.value}` : `−${eur(k.value)}`;
const tarihAraligi = (b: string | null, e: string | null) =>
  !b && !e ? "Süresiz" : `${b ? tarihKisa(b) : "…"} – ${e ? tarihKisa(e) : "…"}`;
const suAn = (b: string | null, e: string | null, simdi: number) =>
  (!b || new Date(b).getTime() <= simdi) && (!e || new Date(e).getTime() >= simdi);

export function Fiyatlar() {
  const kurallar = useQuery({ queryKey: ["yonetim", "kurallar"], queryFn: () => getir<{ priceRules: Kural[] }>("/api/admin/price-rules") });
  const komisyonlar = useQuery({ queryKey: ["yonetim", "komisyonlar"], queryFn: () => getir<{ commissions: Komisyon[] }>("/api/admin/commissions") });
  const secenek = useQuery({ queryKey: ["yonetim", "secenekler"], queryFn: () => getir<Secenekler>("/api/admin/secenekler"), staleTime: 5 * 60_000 });
  const [kuralForm, setKuralForm] = React.useState<Kural | "yeni" | null>(null);
  const [komForm, setKomForm] = React.useState<Komisyon | "yeni" | null>(null);
  const pansiyonAdi = (kod: string | null) => (kod ? secenek.data?.pansiyonlar.find((p) => p.code === kod)?.name ?? kod : null);

  return (
    <div className={s.dis}>
      <div className={s.sayfaBas}>
        <h1 className="lb-y">Fiyatlar</h1>
        <button type="button" className={`${s.dugme} ${s.siyah}`} onClick={() => setKuralForm("yeni")}>
          <Ikon ad="plus" boyut={16} kalinlik={2.2} />
          Yeni kural
        </button>
      </div>

      <Hesaplayici kurallar={kurallar.data?.priceRules ?? []} komisyonlar={komisyonlar.data?.commissions ?? []} secenek={secenek.data} />

      <div className={s.bolumBas}>
        <h2>Fiyat kuralları</h2>
        <span className={s.soluk}>Öncelik sırasıyla</span>
      </div>
      {kurallar.isPending ? (
        <div className={s.iskelet} aria-busy="true" />
      ) : kurallar.isError ? (
        <div className={s.bos}><b>Kurallar alınamadı</b><button type="button" className={`${s.dugme} ${s.siyah}`} onClick={() => kurallar.refetch()}>Tekrar dene</button></div>
      ) : kurallar.data.priceRules.length ? (
        <div className={s.tabloKap}>
          <table className={s.tablo}>
            <thead>
              <tr><th>Kural</th><th className={s.sagHiz}>Değer</th><th>Kime</th><th>Kapsam ve tarih</th><th className={s.sagHiz}>Öncelik</th><th>Etkin</th><th /></tr>
            </thead>
            <tbody>
              {kurallar.data.priceRules.map((k) => (
                <KuralSatiri key={k.id} k={k} pansiyon={pansiyonAdi(k.boardType)} onDuzenle={() => setKuralForm(k)} />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={s.bos}>
          <b>Fiyat kuralı yok</b>
          <span>Kural yokken müşteri ve acente Etscore&apos;un net fiyatını görür. Kâr payı ya da indirimi &quot;Yeni kural&quot;la ekle.</span>
        </div>
      )}

      <div className={s.bolumBas}>
        <h2>Özel komisyonlar</h2>
        <button type="button" className={`${s.dugme} ${s.cerceve}`} onClick={() => setKomForm("yeni")}>
          <Ikon ad="plus" boyut={16} kalinlik={2.2} />
          Komisyon ekle
        </button>
      </div>
      <p className={`${s.soluk} ${s.dar}`}>
        Acentenin genel komisyonu anlaşmasında (Acenteler sayfası). Belirli otel, pansiyon ya da dönem için farklı oran buradan verilir; uyan özel komisyon varsa anlaşma oranı yerine o uygulanır. Rezervasyonda o anki tutar saklanır, oran sonradan değişse de geçmiş komisyon değişmez.
      </p>
      {komisyonlar.isPending ? (
        <div className={`${s.iskelet} ${s.iskeletKisa}`} aria-busy="true" />
      ) : komisyonlar.data?.commissions.length ? (
        <div className={s.tabloKap}>
          <table className={s.tablo}>
            <thead>
              <tr><th>Acente</th><th className={s.sagHiz}>Değer</th><th>Otel ve pansiyon</th><th>Tarih</th><th>Etkin</th><th /></tr>
            </thead>
            <tbody>
              {komisyonlar.data.commissions.map((k) => (
                <KomisyonSatiri key={k.id} k={k} pansiyon={pansiyonAdi(k.boardType)} onDuzenle={() => setKomForm(k)} />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={s.bos}><b>Özel komisyon yok</b><span>Tüm acentelerde anlaşmadaki oran geçerli.</span></div>
      )}

      <KuralPenceresi k={kuralForm} secenek={secenek.data} onKapat={() => setKuralForm(null)} />
      <KomisyonPenceresi k={komForm} secenek={secenek.data} onKapat={() => setKomForm(null)} />
    </div>
  );
}

/* ── Hesaplayıcı ── */
function Hesaplayici({ kurallar, komisyonlar, secenek }: { kurallar: Kural[]; komisyonlar: Komisyon[]; secenek?: Secenekler }) {
  const [net, setNet] = React.useState("500");
  const [kim, setKim] = React.useState("");
  const [otel, setOtel] = React.useState("");
  const [pansiyon, setPansiyon] = React.useState("");
  const [simdi] = React.useState(() => Date.now());

  // Seçilebilir oteller/pansiyonlar: kurallarda ve komisyonlarda geçenler.
  const oteller = [...new Map([...kurallar, ...komisyonlar].filter((k) => k.hotelCode).map((k) => [k.hotelCode!, k.hotelName ?? k.hotelCode!])).entries()];
  const pansiyonlar = [...new Set([...kurallar, ...komisyonlar].map((k) => k.boardType).filter((b): b is string => !!b))];
  const acente = secenek?.acenteler.find((a) => a.id === kim);

  const n = Math.max(0, Number(net) || 0);
  const uyan = kurallar
    .filter(
      (k) =>
        k.isActive &&
        suAn(k.startDate, k.endDate, simdi) &&
        (kim ? k.appliesTo === "ALL_AGENCIES" || (k.appliesTo === "SPECIFIC_AGENCY" && k.agencyId === kim) : k.appliesTo === "ALL_CUSTOMERS") &&
        (!k.hotelCode || k.hotelCode === otel) &&
        (!k.boardType || k.boardType === pansiyon)
    )
    .sort((a, b) => b.priority - a.priority);
  const kural = uyan[0];
  let f = n;
  let fark = 0;
  if (kural) {
    fark = kural.type === "MARKUP" ? (n * kural.value) / 100 : kural.type === "PERCENTAGE_DISCOUNT" ? (-n * kural.value) / 100 : -kural.value;
    f = n + fark;
  }
  const indirim = acente && acente.discountRate > 0 ? (f * acente.discountRate) / 100 : 0;
  f = Math.max(0, f - indirim);

  const ozelKom = acente
    ? komisyonlar
        .filter((c) => c.isActive && c.agencyId === acente.id && suAn(c.startDate, c.endDate, simdi) && (!c.hotelCode || c.hotelCode === otel) && (!c.boardType || c.boardType === pansiyon))
        .sort((a, b) => Number(!!b.hotelCode) * 2 + Number(!!b.boardType) - (Number(!!a.hotelCode) * 2 + Number(!!a.boardType)))[0]
    : undefined;
  const komisyon = acente ? (ozelKom ? (ozelKom.type === "PERCENTAGE" ? (f * ozelKom.value) / 100 : ozelKom.value) : (f * acente.commission) / 100) : 0;

  let no = 1;
  return (
    <section className={s.hesap} aria-labelledby="hesap-baslik">
      <div>
        <h2 id="hesap-baslik">Fiyat nasıl oluşuyor?</h2>
        <p>
          Etscore&apos;un net fiyatına eşleşen <b>önceliği en yüksek tek kural</b> uygulanır. Acentede ardından acentenin indirim oranı düşülür;
          komisyon satış fiyatından hesaplanır. Kural yoksa satış fiyatı net fiyattır.
        </p>
        <div className={s.hesapGirdi}>
          <Girdi id="h-net" etiket="Net fiyat (€)" type="number" min={0} inputMode="decimal" value={net} onDegis={setNet} />
          <Secim id="h-kim" etiket="Kim için" deger={kim} onDegis={setKim}>
            <option value="">Müşteri</option>
            {secenek?.acenteler.map((a) => <option key={a.id} value={a.id}>{a.companyName}</option>)}
          </Secim>
          <Secim id="h-otel" etiket="Otel" deger={otel} onDegis={setOtel}>
            <option value="">Diğer oteller</option>
            {oteller.map(([kod, ad]) => <option key={kod} value={kod}>{ad}</option>)}
          </Secim>
          {pansiyonlar.length > 0 && (
            <Secim id="h-pansiyon" etiket="Pansiyon" deger={pansiyon} onDegis={setPansiyon}>
              <option value="">Diğer</option>
              {pansiyonlar.map((p) => <option key={p} value={p}>{secenek?.pansiyonlar.find((x) => x.code === p)?.name ?? p}</option>)}
            </Secim>
          )}
        </div>
      </div>
      <ol className={s.adimlar} aria-live="polite">
        <li><i>{no++}</i><span>Etscore net fiyatı<small>Tedarikçinin maliyet fiyatı</small></span><b>{eur(n, true)}</b></li>
        {kural ? (
          <li>
            <i>{no++}</i>
            <span>{kural.name}<small>{TUR_AD[kural.type]} · öncelik {kural.priority}{uyan.length > 1 ? ` · ${uyan.length - 1} kural daha uydu, önceliği düşük` : ""}</small></span>
            <b>{fark >= 0 ? "+" : "−"}{eur(Math.abs(fark), true)}</b>
          </li>
        ) : (
          <li data-tur="yok"><i>{no++}</i><span>Uyan kural yok<small>Satış fiyatı net fiyat olur</small></span><b>{eur(0, true)}</b></li>
        )}
        {indirim > 0 && acente && (
          <li><i>{no++}</i><span>Acente indirimi %{acente.discountRate}<small>{acente.companyName} anlaşması</small></span><b>−{eur(indirim, true)}</b></li>
        )}
        <li data-tur="toplam"><i>{no++}</i><span>{acente ? "Acentenin göreceği fiyat" : "Müşterinin göreceği fiyat"}</span><b className="lb-y">{eur(f, true)}</b></li>
        {acente && (
          <li data-tur="kom">
            <i>{no++}</i>
            <span>
              Acente komisyonu {ozelKom ? (ozelKom.type === "PERCENTAGE" ? `%${ozelKom.value}` : eur(ozelKom.value)) : `%${acente.commission}`}
              <small>{ozelKom ? "Özel komisyon" : "Anlaşmadaki oran"} · acentenin kazancı</small>
            </span>
            <b>{eur(komisyon, true)}</b>
          </li>
        )}
      </ol>
    </section>
  );
}

/* ── Satırlar ── */
function useSil(adres: string, mesaj: string) {
  const istemci = useQueryClient();
  const bildiri = useBildiri();
  return useMutation({
    mutationFn: () => gonder(adres, "DELETE"),
    onSuccess: () => {
      istemci.invalidateQueries({ queryKey: ["yonetim"] });
      bildiri(mesaj);
    },
    onError: (e: Error) => bildiri(e.message),
  });
}
function useAcKapa(adres: string) {
  const istemci = useQueryClient();
  const bildiri = useBildiri();
  return useMutation({
    mutationFn: (isActive: boolean) => gonder(adres, "PATCH", { isActive }),
    onSuccess: (_, v) => {
      istemci.invalidateQueries({ queryKey: ["yonetim"] });
      bildiri(v ? "Etkin" : "Durduruldu");
    },
    onError: (e: Error) => bildiri(e.message),
  });
}
function SatirIslem({ onDuzenle, sil }: { onDuzenle: () => void; sil: ReturnType<typeof useSil> }) {
  const [emin, setEmin] = React.useState(false);
  return (
    <div className={s.islemler}>
      {emin ? (
        <>
          <button type="button" className={`${s.metinDugme} ${s.tehlike}`} disabled={sil.isPending} onClick={() => sil.mutate()}>Evet, sil</button>
          <button type="button" className={s.metinDugme} onClick={() => setEmin(false)}>Vazgeç</button>
        </>
      ) : (
        <>
          <button type="button" className={s.metinDugme} onClick={onDuzenle}>Düzenle</button>
          <button type="button" className={s.metinDugme} onClick={() => setEmin(true)}>Sil</button>
        </>
      )}
    </div>
  );
}
function KuralSatiri({ k, pansiyon, onDuzenle }: { k: Kural; pansiyon: string | null; onDuzenle: () => void }) {
  const ac = useAcKapa(`/api/admin/price-rules/${k.id}`);
  const sil = useSil(`/api/admin/price-rules/${k.id}`, "Kural silindi");
  const aktif = ac.isPending ? !!ac.variables : k.isActive;
  return (
    <tr data-kapali={!aktif || undefined}>
      <td><b>{k.name}</b><span className={s.alt}>{TUR_AD[k.type]}</span></td>
      <td className={`${s.sagHiz} ${s.deger}`} data-indirim={k.type !== "MARKUP" || undefined}>{degerYazi(k)}</td>
      <td>{k.appliesTo === "SPECIFIC_AGENCY" ? k.agency?.companyName ?? "Tek acente" : HEDEF_AD[k.appliesTo]}</td>
      <td>
        {[k.hotelCode ? k.hotelName ?? k.hotelCode : "Tüm oteller", pansiyon].filter(Boolean).join(" · ")}
        <span className={s.alt}>{tarihAraligi(k.startDate, k.endDate)}</span>
      </td>
      <td className={s.sagHiz}>{k.priority}</td>
      <td><Anahtar acik={aktif} etiket={`${k.name} etkin`} pasif={ac.isPending} onDegis={(v) => ac.mutate(v)} /></td>
      <td><SatirIslem onDuzenle={onDuzenle} sil={sil} /></td>
    </tr>
  );
}
function KomisyonSatiri({ k, pansiyon, onDuzenle }: { k: Komisyon; pansiyon: string | null; onDuzenle: () => void }) {
  const ac = useAcKapa(`/api/admin/commissions/${k.id}`);
  const sil = useSil(`/api/admin/commissions/${k.id}`, "Komisyon silindi");
  const aktif = ac.isPending ? !!ac.variables : k.isActive;
  return (
    <tr data-kapali={!aktif || undefined}>
      <td><b>{k.agency.companyName}</b></td>
      <td className={`${s.sagHiz} ${s.deger}`}>{k.type === "PERCENTAGE" ? `%${k.value}` : eur(k.value)}</td>
      <td>{[k.hotelCode ? k.hotelName ?? k.hotelCode : "Tüm oteller", pansiyon ?? "Tüm pansiyonlar"].join(" · ")}</td>
      <td>{tarihAraligi(k.startDate, k.endDate)}</td>
      <td><Anahtar acik={aktif} etiket={`${k.agency.companyName} komisyonu etkin`} pasif={ac.isPending} onDegis={(v) => ac.mutate(v)} /></td>
      <td><SatirIslem onDuzenle={onDuzenle} sil={sil} /></td>
    </tr>
  );
}

/* ── Otel seçici ── */
function OtelSecici({ kod, ad, onSec }: { kod: string; ad: string | null; onSec: (kod: string, ad: string | null) => void }) {
  const [q, setQ] = React.useState(ad ?? kod);
  const [acik, setAcik] = React.useState(false);
  const [aranan, setAranan] = React.useState("");
  React.useEffect(() => {
    const t = setTimeout(() => setAranan(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);
  const sonuc = useQuery({
    queryKey: ["yonetim", "otel-ara", aranan],
    queryFn: () => getir<{ oteller: { kod: string; ad: string; yer: string | null }[] }>(`/api/admin/secenekler?otel=${encodeURIComponent(aranan)}`),
    enabled: acik && aranan.length >= 2,
  });
  return (
    <div style={{ position: "relative" }}>
      <Girdi
        id="f-otel"
        etiket="Otel (boşsa tüm oteller)"
        value={q}
        placeholder="Otel adı ya da kodu"
        autoComplete="off"
        onFocus={() => setAcik(true)}
        onBlur={() => setTimeout(() => setAcik(false), 150)}
        onDegis={(v) => {
          setQ(v);
          if (!v.trim()) onSec("", null);
        }}
      />
      {acik && aranan.length >= 2 && !!sonuc.data?.oteller.length && (
        <div className={s.acilir} data-acik style={{ left: 0, right: 0, width: "auto", top: "calc(100% + 6px)" }}>
          {sonuc.data.oteller.map((o) => (
            <button key={o.kod} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { onSec(o.kod, o.ad); setQ(o.ad); setAcik(false); }}>
              <span><b>{o.ad}</b><span className={s.alt}>{[o.yer, o.kod].filter(Boolean).join(" · ")}</span></span>
            </button>
          ))}
        </div>
      )}
      {kod && <p className={s.not} style={{ marginTop: 4 }}>Seçili: {ad ?? kod} · {kod}</p>}
    </div>
  );
}

/* ── Kural formu ── */
const tarihGirdi = (iso: string | null) => (iso ? iso.slice(0, 10) : "");
function KuralPenceresi({ k, secenek, onKapat }: { k: Kural | "yeni" | null; secenek?: Secenekler; onKapat: () => void }) {
  const [son, setSon] = React.useState(k);
  if (k && k !== son) setSon(k);
  const x = k ?? son;
  return (
    <Pencere acik={!!k} onKapat={onKapat} baslik={x === "yeni" ? "Yeni fiyat kuralı" : "Kuralı düzenle"} genislik={620}>
      {x && <KuralFormu key={x === "yeni" ? "yeni" : x.id} k={x === "yeni" ? null : x} secenek={secenek} onKapat={onKapat} />}
    </Pencere>
  );
}
function KuralFormu({ k, secenek, onKapat }: { k: Kural | null; secenek?: Secenekler; onKapat: () => void }) {
  const istemci = useQueryClient();
  const bildiri = useBildiri();
  const [ad, setAd] = React.useState(k?.name ?? "");
  const [tur, setTur] = React.useState<Tur>(k?.type ?? "MARKUP");
  const [deger, setDeger] = React.useState(k ? String(k.value) : "10");
  const [hedef, setHedef] = React.useState<Hedef>(k?.appliesTo ?? "ALL_CUSTOMERS");
  const [acente, setAcente] = React.useState(k?.agencyId ?? "");
  const [oncelik, setOncelik] = React.useState(k ? String(k.priority) : "10");
  const [otel, setOtel] = React.useState({ kod: k?.hotelCode ?? "", ad: k?.hotelName ?? null });
  const [pansiyon, setPansiyon] = React.useState(k?.boardType ?? "");
  const [bas, setBas] = React.useState(tarihGirdi(k?.startDate ?? null));
  const [bit, setBit] = React.useState(tarihGirdi(k?.endDate ?? null));
  const [hata, setHata] = React.useState<string | null>(null);

  const kaydet = useMutation({
    mutationFn: (govde: Record<string, unknown>) => (k ? gonder(`/api/admin/price-rules/${k.id}`, "PATCH", govde) : gonder("/api/admin/price-rules", "POST", govde)),
    onSuccess: () => {
      istemci.invalidateQueries({ queryKey: ["yonetim"] });
      bildiri(k ? "Kural güncellendi" : "Kural oluşturuldu");
      onKapat();
    },
    onError: (e: Error) => setHata(e.message),
  });
  const d = Number(deger) || 0;
  const ornek = tur === "MARKUP" ? 500 * (1 + d / 100) : tur === "PERCENTAGE_DISCOUNT" ? 500 * (1 - d / 100) : 500 - d;
  const tamam = (e: React.FormEvent) => {
    e.preventDefault();
    setHata(null);
    if (ad.trim().length < 2) return setHata("Kurala bir ad ver");
    if (!(d > 0) || (tur !== "FIXED_DISCOUNT" && d > 100)) return setHata(tur === "FIXED_DISCOUNT" ? "Tutar sıfırdan büyük olmalı" : "Yüzde 0 ile 100 arasında olmalı");
    if (hedef === "SPECIFIC_AGENCY" && !acente) return setHata("Acente seç");
    if (bas && bit && bas > bit) return setHata("Bitiş başlangıçtan önce olamaz");
    kaydet.mutate({
      name: ad.trim(),
      type: tur,
      value: d,
      appliesTo: hedef,
      agencyId: hedef === "SPECIFIC_AGENCY" ? acente : k ? null : undefined,
      hotelCode: otel.kod || (k ? null : undefined),
      boardType: pansiyon || (k ? null : undefined),
      startDate: bas || (k ? null : undefined),
      endDate: bit || (k ? null : undefined),
      priority: Math.round(Number(oncelik) || 0),
      ...(k ? {} : { isActive: true }),
    });
  };
  return (
    <form className={s.form} onSubmit={tamam} noValidate>
      <Girdi id="f-ad" etiket="Kural adı" value={ad} onDegis={setAd} placeholder="Örn. Müşteri kâr payı" />
      <div className={s.ikiAlan}>
        <Secim id="f-tur" etiket="Tür" deger={tur} onDegis={(v) => setTur(v as Tur)}>
          <option value="MARKUP">Kâr payı (%)</option>
          <option value="PERCENTAGE_DISCOUNT">Yüzde indirim (%)</option>
          <option value="FIXED_DISCOUNT">Tutar indirimi (€)</option>
        </Secim>
        <Girdi id="f-deger" etiket={tur === "FIXED_DISCOUNT" ? "Tutar (€)" : "Yüzde"} type="number" min={0} inputMode="decimal" value={deger} onDegis={setDeger} />
      </div>
      <div className={s.ikiAlan}>
        <Secim id="f-hedef" etiket="Kime" deger={hedef} onDegis={(v) => setHedef(v as Hedef)}>
          <option value="ALL_CUSTOMERS">Tüm müşteriler</option>
          <option value="ALL_AGENCIES">Tüm acenteler</option>
          <option value="SPECIFIC_AGENCY">Tek acente</option>
        </Secim>
        <Girdi id="f-oncelik" etiket="Öncelik (büyük olan uygulanır)" type="number" value={oncelik} onDegis={setOncelik} />
      </div>
      {hedef === "SPECIFIC_AGENCY" && (
        <Secim id="f-acente" etiket="Acente" deger={acente} onDegis={setAcente}>
          <option value="">Seç</option>
          {secenek?.acenteler.map((a) => <option key={a.id} value={a.id}>{a.companyName}</option>)}
        </Secim>
      )}
      <OtelSecici kod={otel.kod} ad={otel.ad} onSec={(kod, ad) => setOtel({ kod, ad })} />
      <Secim id="f-pansiyon" etiket="Pansiyon" deger={pansiyon} onDegis={setPansiyon}>
        <option value="">Tümü</option>
        {secenek?.pansiyonlar.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
      </Secim>
      <div className={s.ikiAlan}>
        <Girdi id="f-bas" etiket="Başlangıç (boşsa hemen)" type="date" value={bas} onDegis={setBas} />
        <Girdi id="f-bit" etiket="Bitiş (boşsa süresiz)" type="date" value={bit} onDegis={setBit} />
      </div>
      <p className={s.not}>Örnek: €500 net fiyat {eur(Math.max(0, ornek), true)} olur. Aynı kişiye birden çok kural uyarsa yalnız önceliği en yüksek olan uygulanır.</p>
      {hata && <HataYazi>{hata}</HataYazi>}
      <div className={s.pAlt}>
        <button type="button" className={`${s.dugme} ${s.cerceve}`} onClick={onKapat}>Vazgeç</button>
        <button type="submit" className={`${s.dugme} ${s.siyah}`} disabled={kaydet.isPending}>{kaydet.isPending ? "Kaydediliyor…" : k ? "Kaydet" : "Kuralı oluştur"}</button>
      </div>
    </form>
  );
}

/* ── Komisyon formu ── */
function KomisyonPenceresi({ k, secenek, onKapat }: { k: Komisyon | "yeni" | null; secenek?: Secenekler; onKapat: () => void }) {
  const [son, setSon] = React.useState(k);
  if (k && k !== son) setSon(k);
  const x = k ?? son;
  return (
    <Pencere acik={!!k} onKapat={onKapat} baslik={x === "yeni" ? "Özel komisyon" : "Komisyonu düzenle"} genislik={560}>
      {x && <KomisyonFormu key={x === "yeni" ? "yeni" : x.id} k={x === "yeni" ? null : x} secenek={secenek} onKapat={onKapat} />}
    </Pencere>
  );
}
function KomisyonFormu({ k, secenek, onKapat }: { k: Komisyon | null; secenek?: Secenekler; onKapat: () => void }) {
  const istemci = useQueryClient();
  const bildiri = useBildiri();
  const [acente, setAcente] = React.useState(k?.agencyId ?? "");
  const [tur, setTur] = React.useState<"PERCENTAGE" | "FIXED">(k?.type ?? "PERCENTAGE");
  const [deger, setDeger] = React.useState(k ? String(k.value) : "10");
  const [otel, setOtel] = React.useState({ kod: k?.hotelCode ?? "", ad: k?.hotelName ?? null });
  const [pansiyon, setPansiyon] = React.useState(k?.boardType ?? "");
  const [bas, setBas] = React.useState(tarihGirdi(k?.startDate ?? null));
  const [bit, setBit] = React.useState(tarihGirdi(k?.endDate ?? null));
  const [hata, setHata] = React.useState<string | null>(null);
  const kaydet = useMutation({
    mutationFn: (govde: Record<string, unknown>) => (k ? gonder(`/api/admin/commissions/${k.id}`, "PATCH", govde) : gonder("/api/admin/commissions", "POST", govde)),
    onSuccess: () => {
      istemci.invalidateQueries({ queryKey: ["yonetim"] });
      bildiri(k ? "Komisyon güncellendi" : "Komisyon eklendi");
      onKapat();
    },
    onError: (e: Error) => setHata(e.message),
  });
  const d = Number(deger) || 0;
  const tamam = (e: React.FormEvent) => {
    e.preventDefault();
    setHata(null);
    if (!acente) return setHata("Acente seç");
    if (!(d > 0) || (tur === "PERCENTAGE" && d > 100)) return setHata(tur === "PERCENTAGE" ? "Yüzde 0 ile 100 arasında olmalı" : "Tutar sıfırdan büyük olmalı");
    if (bas && bit && bas > bit) return setHata("Bitiş başlangıçtan önce olamaz");
    kaydet.mutate({
      agencyId: acente,
      type: tur,
      value: d,
      hotelCode: otel.kod || (k ? null : undefined),
      boardType: pansiyon || (k ? null : undefined),
      startDate: bas || (k ? null : undefined),
      endDate: bit || (k ? null : undefined),
      ...(k ? {} : { isActive: true }),
    });
  };
  return (
    <form className={s.form} onSubmit={tamam} noValidate>
      <Secim id="c-acente" etiket="Acente" deger={acente} onDegis={setAcente}>
        <option value="">Seç</option>
        {secenek?.acenteler.map((a) => <option key={a.id} value={a.id}>{a.companyName} (anlaşma %{a.commission})</option>)}
      </Secim>
      <div className={s.ikiAlan}>
        <Secim id="c-tur" etiket="Tür" deger={tur} onDegis={(v) => setTur(v as "PERCENTAGE" | "FIXED")}>
          <option value="PERCENTAGE">Yüzde</option>
          <option value="FIXED">Rezervasyon başına tutar (€)</option>
        </Secim>
        <Girdi id="c-deger" etiket={tur === "PERCENTAGE" ? "Yüzde" : "Tutar (€)"} type="number" min={0} inputMode="decimal" value={deger} onDegis={setDeger} />
      </div>
      <OtelSecici kod={otel.kod} ad={otel.ad} onSec={(kod, ad) => setOtel({ kod, ad })} />
      <Secim id="c-pansiyon" etiket="Pansiyon" deger={pansiyon} onDegis={setPansiyon}>
        <option value="">Tümü</option>
        {secenek?.pansiyonlar.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
      </Secim>
      <div className={s.ikiAlan}>
        <Girdi id="c-bas" etiket="Başlangıç (boşsa hemen)" type="date" value={bas} onDegis={setBas} />
        <Girdi id="c-bit" etiket="Bitiş (boşsa süresiz)" type="date" value={bit} onDegis={setBit} />
      </div>
      {hata && <HataYazi>{hata}</HataYazi>}
      <div className={s.pAlt}>
        <button type="button" className={`${s.dugme} ${s.cerceve}`} onClick={onKapat}>Vazgeç</button>
        <button type="submit" className={`${s.dugme} ${s.siyah}`} disabled={kaydet.isPending}>{kaydet.isPending ? "Kaydediliyor…" : k ? "Kaydet" : "Komisyonu ekle"}</button>
      </div>
    </form>
  );
}
