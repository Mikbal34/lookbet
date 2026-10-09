"use client";

// Yönetim › Fiyatlar: "Fiyat nasıl oluşuyor?" hesaplayıcısı, fiyat kuralları
// ve acentelere özel komisyonlar. Hesaplayıcı lib/pricing/engine ile aynı
// sırayı izler: etkin, tarihi tutan, kişiye (müşteri / tüm acenteler / tek
// acente), otele ve pansiyona uyan kurallardan önceliği en yüksek TEK kural;
// sonra koşulu tutan (kime, otel/bölge, giriş tarihi, gece) yüzdesi en yüksek
// TEK otomatik indirim (Kampanyalar); acentede ardından acentenin indirim
// oranı. Komisyon (motordaki calculateCommission): uyan özel komisyon varsa
// o, yoksa acentenin anlaşma oranı; rezervasyonda o anki tutar saklanır.
// Kupon ödeme adımında uygulanır; hesaplayıcıda yok.

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ikon } from "@/components/lb/ikon";
import { Pencere } from "@/components/lb/pencere";
import { katla } from "@/lib/katla";
import { AYK, Anahtar, Girdi, HataYazi, Secim, eur, getir, gonder, tarihGirdisi, tarihKisa, trGun, useBildiri } from "./ortak";
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
/** Otomatik indirim (Kampanyalar; /api/admin/discounts) — hesaplayıcının kullandığı alanlar. */
interface Kampanya {
  id: string;
  name: string;
  type: "EARLY_BOOKING" | "LAST_MINUTE" | "LONG_STAY" | "DATE_RANGE";
  percent: number;
  minDays: number | null;
  maxDays: number | null;
  minNights: number | null;
  stayStart: string | null;
  stayEnd: string | null;
  hotelCodes: string[];
  locationName: string | null;
  audience: "CUSTOMER" | "AGENCY" | "ALL";
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
}

const TUR_AD: Record<Tur, string> = { MARKUP: "Kâr payı", PERCENTAGE_DISCOUNT: "Yüzde indirim", FIXED_DISCOUNT: "Tutar indirimi" };
const HEDEF_AD: Record<Hedef, string> = { ALL_CUSTOMERS: "Tüm müşteriler", ALL_AGENCIES: "Tüm acenteler", SPECIFIC_AGENCY: "Tek acente" };
const degerYazi = (k: Pick<Kural, "type" | "value">) =>
  k.type === "MARKUP" ? `+%${k.value}` : k.type === "PERCENTAGE_DISCOUNT" ? `−%${k.value}` : `−${eur(k.value)}`;
const tarihAraligi = (b: string | null, e: string | null) =>
  !b && !e ? "Süresiz" : `${b ? tarihKisa(b) : "…"} – ${e ? tarihKisa(e) : "…"}`;
const suAn = (b: string | null, e: string | null, simdi: number) =>
  (!b || new Date(b).getTime() <= simdi) && (!e || new Date(e).getTime() >= simdi);
const KAMPANYA_TUR: Record<Kampanya["type"], string> = { EARLY_BOOKING: "Erken rezervasyon", LAST_MINUTE: "Son dakika", LONG_STAY: "Uzun konaklama", DATE_RANGE: "Belirli tarihler" };
/** İki YYYY-AA-GG arasındaki gün (motordaki gunFarki). */
const gunFarki = (a: string, b: string) => Math.round((Date.parse(a) - Date.parse(b)) / 864e5);
/** "2026-10-26" → "26 Eki" (saat dilimine bakmadan). */
const gunYazi = (v: string) => {
  const [, ay, gun] = v.split("-").map(Number);
  return ay && gun ? `${gun} ${AYK[ay - 1]}` : v;
};

/**
 * Motordaki uyanIndirim'in aynısı: yayında, kişiye uyan, otel/bölge kapsamı
 * ve koşulu tutan indirimler. Bölge kapsamında otelin gerçek konumu burada
 * bilinmez; hesaplayıcıda seçilen bölgeyle eşleşir (tahmini).
 */
function uyanKampanyalar(
  liste: Kampanya[],
  g: { acente: boolean; otel: string; bolge: string; giris: string; gece: number | null; bugun: string; simdi: number }
) {
  const gunKala = g.giris ? gunFarki(g.giris, g.bugun) : null;
  return liste.filter((d) => {
    if (!d.isActive || !suAn(d.startsAt, d.endsAt, g.simdi)) return false;
    if (d.audience === "CUSTOMER" && g.acente) return false;
    if (d.audience === "AGENCY" && !g.acente) return false;
    if (d.hotelCodes.length) {
      if (!g.otel || !d.hotelCodes.includes(g.otel)) return false;
    } else if (d.locationName) {
      if (!g.bolge || katla(g.bolge) !== katla(d.locationName)) return false;
    }
    if (d.type === "EARLY_BOOKING") return gunKala !== null && gunKala >= (d.minDays ?? 0);
    if (d.type === "LAST_MINUTE") return gunKala !== null && gunKala >= 0 && gunKala <= (d.maxDays ?? 0);
    if (d.type === "LONG_STAY") return g.gece !== null && g.gece >= (d.minNights ?? 1);
    // DATE_RANGE: konaklama aralığı UTC gece yarısı saklanır; motor da ISO'nun gününe bakar.
    const bas = d.stayStart?.slice(0, 10);
    const son = d.stayEnd?.slice(0, 10);
    return !!g.giris && !(bas && g.giris < bas) && !(son && g.giris > son);
  });
}

export function Fiyatlar() {
  const kurallar = useQuery({ queryKey: ["yonetim", "kurallar"], queryFn: () => getir<{ priceRules: Kural[] }>("/api/admin/price-rules") });
  const komisyonlar = useQuery({ queryKey: ["yonetim", "komisyonlar"], queryFn: () => getir<{ commissions: Komisyon[] }>("/api/admin/commissions") });
  // Kampanyalar sayfasıyla aynı sorgu (önbellek paylaşılır).
  const indirimler = useQuery({ queryKey: ["yonetim", "indirimler"], queryFn: () => getir<{ indirimler: Kampanya[] }>("/api/admin/discounts") });
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

      <Hesaplayici
        kurallar={kurallar.data?.priceRules ?? []}
        komisyonlar={komisyonlar.data?.commissions ?? []}
        indirimler={indirimler.data?.indirimler ?? []}
        indirimHata={indirimler.isError}
        eksik={kurallar.isError || komisyonlar.isError}
        secenek={secenek.data}
      />

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
      ) : komisyonlar.isError ? (
        <div className={s.bos}><b>Komisyonlar alınamadı</b><button type="button" className={`${s.dugme} ${s.siyah}`} onClick={() => komisyonlar.refetch()}>Tekrar dene</button></div>
      ) : komisyonlar.data.commissions.length ? (
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
function Hesaplayici({ kurallar, komisyonlar, indirimler, indirimHata, eksik, secenek }: {
  kurallar: Kural[];
  komisyonlar: Komisyon[];
  indirimler: Kampanya[];
  /** İndirimler alınamadı: kampanya adımı hesaba katılamaz. */
  indirimHata: boolean;
  /** Kurallar ya da komisyonlar alınamadı. */
  eksik: boolean;
  secenek?: Secenekler;
}) {
  const [net, setNet] = React.useState("500");
  const [kim, setKim] = React.useState("");
  const [otel, setOtel] = React.useState("");
  const [pansiyon, setPansiyon] = React.useState("");
  const [bolge, setBolge] = React.useState("");
  const [simdi] = React.useState(() => Date.now());
  // Otomatik indirim koşulları için örnek konaklama: 30 gün sonra, 3 gece.
  const [giris, setGiris] = React.useState(() => trGun(simdi + 30 * 864e5));
  const [gece, setGece] = React.useState("3");

  // Yayındaki otomatik indirimler (kişiden bağımsız; seçenekler bunlardan).
  const yayinda = indirimler.filter((d) => d.isActive && suAn(d.startsAt, d.endsAt, simdi));
  // Seçilebilir oteller/pansiyonlar: kurallarda, komisyonlarda ve otele özel indirimlerde geçenler.
  const otelAdlari = new Map([...kurallar, ...komisyonlar].filter((k) => k.hotelCode).map((k) => [k.hotelCode!, k.hotelName ?? k.hotelCode!]));
  for (const d of yayinda) for (const kod of d.hotelCodes) if (!otelAdlari.has(kod)) otelAdlari.set(kod, `Otel ${kod}`);
  const oteller = [...otelAdlari.entries()];
  const pansiyonlar = [...new Set([...kurallar, ...komisyonlar].map((k) => k.boardType).filter((b): b is string => !!b))];
  // Bölgeye özel indirim varsa bölge seçilir (otelin konumu burada bilinmez).
  const bolgeler = [...new Map(yayinda.filter((d) => !d.hotelCodes.length && d.locationName).map((d) => [katla(d.locationName!), d.locationName!])).values()];
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
    f = Math.max(0, n + fark);
  }
  // Otomatik indirim: kural sonrası fiyattan, uyanlardan yüzdesi en yüksek tek indirim.
  const geceSayi = Math.round(Number(gece));
  const kampanyalar = uyanKampanyalar(yayinda, {
    acente: !!acente,
    otel,
    bolge,
    giris,
    gece: geceSayi >= 1 ? geceSayi : null,
    bugun: trGun(simdi),
    simdi,
  });
  const kampanya = kampanyalar.reduce<Kampanya | null>((en, d) => (!en || d.percent > en.percent ? d : en), null);
  let kampanyaTutari = kampanya && f > 0 ? (f * kampanya.percent) / 100 : 0;
  f -= kampanyaTutari;
  let indirim = acente && acente.discountRate > 0 ? (f * acente.discountRate) / 100 : 0;
  f = Math.max(0, f - indirim);

  const ozelKom = acente
    ? komisyonlar
        .filter((c) => c.isActive && c.agencyId === acente.id && suAn(c.startDate, c.endDate, simdi) && (!c.hotelCode || c.hotelCode === otel) && (!c.boardType || c.boardType === pansiyon))
        .sort((a, b) => Number(!!b.hotelCode) * 2 + Number(!!b.boardType) - (Number(!!a.hotelCode) * 2 + Number(!!a.boardType)))[0]
    : undefined;
  // Maliyet tabanı (motordaki tabanFiyat): komisyon düşülünce net fiyat kalmalı.
  // Önce acente indirimi, sonra kampanya kısılır; yetmezse fiyat tabana çıkar.
  // (Sunucuda MIN_KAR_ORANI tanımlıysa taban o kadar yukarıdadır.)
  const komOran = acente ? (ozelKom ? (ozelKom.type === "PERCENTAGE" ? ozelKom.value : null) : acente.commission) : 0;
  const taban = ozelKom?.type === "FIXED" ? n + ozelKom.value : komOran ? n / (1 - Math.min(komOran, 90) / 100) : n;
  let tabanFarki = 0;
  const kisildi = f < taban - 0.004;
  if (kisildi) {
    let eksik = taban - f;
    const a = Math.min(indirim, eksik);
    indirim -= a;
    eksik -= a;
    const c = Math.min(kampanyaTutari, eksik);
    kampanyaTutari -= c;
    eksik -= c;
    tabanFarki = eksik;
    f = taban;
  }
  const komisyon = acente ? (ozelKom ? (ozelKom.type === "PERCENTAGE" ? (f * ozelKom.value) / 100 : ozelKom.value) : (f * acente.commission) / 100) : 0;

  let no = 1;
  return (
    <section className={s.hesap} aria-labelledby="hesap-baslik">
      <div>
        <h2 id="hesap-baslik">Fiyat nasıl oluşuyor?</h2>
        <p>
          Etscore&apos;un net fiyatına eşleşen <b>önceliği en yüksek tek kural</b> uygulanır; ardından koşulu tutan <b>yüzdesi en yüksek tek
          otomatik indirim</b> düşülür. Acentede sonra acentenin indirim oranı düşülür; komisyon bu fiyattan hesaplanır. Kupon ödeme adımında
          uygulanır, burada yok.
        </p>
        {eksik && (
          <div className={s.hata} role="alert" style={{ marginBottom: 12 }}>
            <Ikon ad="warning" boyut={16} kalinlik={2.1} />
            Kurallar ya da komisyonlar alınamadı; hesap eksik olabilir.
          </div>
        )}
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
          <Girdi id="h-giris" etiket="Giriş tarihi" type="date" value={giris} onDegis={setGiris} />
          <Girdi id="h-gece" etiket="Gece" type="number" min={1} inputMode="numeric" value={gece} onDegis={setGece} />
          {bolgeler.length > 0 && (
            <Secim id="h-bolge" etiket="Otelin bölgesi" deger={bolge} onDegis={setBolge}>
              <option value="">Diğer bölgeler</option>
              {bolgeler.map((b) => <option key={b} value={b}>{b}</option>)}
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
        {indirimHata ? (
          <li data-tur="yok"><i>{no++}</i><span>Otomatik indirimler alınamadı<small>Hesaba katılmadı; fiyat tahminidir</small></span><b>—</b></li>
        ) : kampanya ? (
          <li>
            <i>{no++}</i>
            <span>
              {kampanya.name}
              <small>
                Otomatik indirim %{kampanya.percent} · {KAMPANYA_TUR[kampanya.type]}
                {!kampanya.hotelCodes.length && kampanya.locationName ? " · bölge seçimine göre, tahmini" : ""}
                {kampanyalar.length > 1 ? ` · ${kampanyalar.length - 1} indirim daha uydu, yüzdesi düşük` : ""}
              </small>
            </span>
            <b>−{eur(kampanyaTutari, true)}</b>
          </li>
        ) : (
          <li data-tur="yok">
            <i>{no++}</i>
            <span>Uyan otomatik indirim yok<small>{giris ? `Giriş ${gunYazi(giris)}, ${geceSayi >= 1 ? geceSayi : "?"} gece için` : "Giriş tarihi seçilmedi"}</small></span>
            <b>{eur(0, true)}</b>
          </li>
        )}
        {indirim > 0 && acente && (
          <li><i>{no++}</i><span>Acente indirimi %{acente.discountRate}<small>{acente.companyName} anlaşması</small></span><b>−{eur(indirim, true)}</b></li>
        )}
        {kisildi && (
          <li>
            <i>{no++}</i>
            <span>Maliyet tabanı<small>İndirimler kısıldı: satış, komisyon düşülünce net fiyatın altına inmez</small></span>
            <b>{tabanFarki > 0.004 ? `+${eur(tabanFarki, true)}` : "—"}</b>
          </li>
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
// Tarih girdisi Türkiye gününe göre: başlangıç İstanbul'da günün başı (UTC'de
// önceki gün) saklanır; ISO'yu kesmek her kayıtta bir gün geri kaydırırdı.
const tarihGirdi = tarihGirdisi;
/** Düzenlenen kaydın acentesi seçicide yoksa (kapatılmış ya da onayı kalkmış) yine de görünsün. */
function EskiAcente({ agency, secenek }: { agency: { id: string; companyName: string } | null | undefined; secenek?: Secenekler }) {
  if (!agency || !secenek || secenek.acenteler.some((a) => a.id === agency.id)) return null;
  return <option value={agency.id}>{agency.companyName} (kapalı)</option>;
}
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
    // Sınırlar sunucuyla aynı (admin.schema): indirim %100, kâr payı %500.
    const ust = tur === "MARKUP" ? 500 : 100;
    if (!(d > 0) || (tur !== "FIXED_DISCOUNT" && d > ust)) return setHata(tur === "FIXED_DISCOUNT" ? "Tutar sıfırdan büyük olmalı" : `Yüzde 0 ile ${ust} arasında olmalı`);
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
          <EskiAcente agency={k?.agency} secenek={secenek} />
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
    if (!(d > 0) || (tur === "PERCENTAGE" && d > 90)) return setHata(tur === "PERCENTAGE" ? "Yüzde 0 ile 90 arasında olmalı" : "Tutar sıfırdan büyük olmalı");
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
        <EskiAcente agency={k?.agency} secenek={secenek} />
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
