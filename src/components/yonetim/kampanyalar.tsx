"use client";

// Yönetim › Kampanyalar: kodsuz otomatik indirimler (erken rezervasyon, son
// dakika, uzun konaklama, belirli tarihler) ve kuponlar. İndirim kâr payı
// kuralından sonra satış fiyatından düşer; bir rezervasyona birden çok indirim
// uyarsa en yüksek olanı uygulanır (bkz. lib/pricing/engine). Kâr payını aşan
// indirim motorun maliyet tabanında kısılır (net fiyatın altına satılmaz);
// kartta ve formda uyarılır.

import * as React from "react";
import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { Ikon, type IkonAdi } from "@/components/lb/ikon";
import { Nesne, type NesneAdi } from "@/components/lb/nesne";
import { Pencere } from "@/components/lb/pencere";
import { katla } from "@/lib/katla";
import { Anahtar, Girdi, HataYazi, Secim, eur, getir, gonder, sayi, simdiAl, tarihGirdisi, tarihUzun, useBildiri } from "./ortak";
import s from "./yonetim.module.css";

type Tur = "EARLY_BOOKING" | "LAST_MINUTE" | "LONG_STAY" | "DATE_RANGE";
type Kime = "CUSTOMER" | "AGENCY" | "ALL";
interface Indirim {
  id: string;
  name: string;
  type: Tur;
  percent: number;
  minDays: number | null;
  maxDays: number | null;
  minNights: number | null;
  stayStart: string | null;
  stayEnd: string | null;
  hotelCodes: string[];
  locationName: string | null;
  audience: Kime;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  showcase: boolean;
  description: string | null;
  /** adet/tutar: onaylı rezervasyonlar; bagli: her durumdan bağlı rezervasyon (varsa silinemez). */
  kullanim: { adet: number; tutar: number; bagli: number };
}
interface Kupon {
  id: string;
  code: string;
  type: "PERCENTAGE" | "FIXED";
  value: number;
  minAmount: number | null;
  usageLimit: number | null;
  usedCount: number;
  perUserOnce: boolean;
  audience: "CUSTOMER" | "NEW_CUSTOMER" | "AGENCY";
  expiresAt: string | null;
  stacks: boolean;
  isActive: boolean;
  note: string | null;
  toplamIndirim: number;
  /** Bağlı rezervasyon (iptal edilenler dahil); varsa silinemez. */
  bagli: number;
}

const TUR: Record<Tur, { ad: string; aciklama: string; nesne: NesneAdi; ikon: IkonAdi }> = {
  EARLY_BOOKING: { ad: "Erken rezervasyon", aciklama: "Girişe en az N gün varsa", nesne: "kartpostal", ikon: "calendar" },
  LAST_MINUTE: { ad: "Son dakika", aciklama: "Girişe en fazla N gün kaldıysa", nesne: "bavul", ikon: "clock" },
  LONG_STAY: { ad: "Uzun konaklama", aciklama: "En az N gece kalınırsa", nesne: "anahtar-karti", ikon: "key" },
  DATE_RANGE: { ad: "Belirli tarihler", aciklama: "Giriş bu tarihlerdeyse", nesne: "indirim", ikon: "discount" },
};
const KIME: Record<Kime, string> = { CUSTOMER: "Müşteriler", AGENCY: "Acenteler", ALL: "Müşteriler ve acenteler" };
const BOLGE_NESNE: Record<string, NesneAdi> = { bodrum: "bodrum", antalya: "antalya", kapadokya: "kapadokya" };
const bolgeNesnesi = (ad: string | null): NesneAdi | null => (ad ? BOLGE_NESNE[katla(ad)] ?? null : null);
// Tarih girdileri Türkiye gününe göre (yayın başlangıcı İstanbul'da 00:00 =
// UTC'de önceki gün; ISO'yu kesmek her kayıtta bir gün geri kaydırırdı).
const gun = tarihGirdisi;
const kisaTarih = (iso: string) => tarihUzun(iso).replace(/ \d{4}$/, "");

function durum(d: Pick<Indirim, "isActive" | "startsAt" | "endsAt">, simdi: number): { ad: string; renk: string; kod: string } {
  if (d.endsAt && new Date(d.endsAt).getTime() < simdi) return { ad: "Bitti", renk: "gri", kod: "bitti" };
  if (!d.isActive) return { ad: "Durduruldu", renk: "gri", kod: "durdu" };
  if (d.startsAt && new Date(d.startsAt).getTime() > simdi) return { ad: "Planlandı", renk: "sari", kod: "planli" };
  return { ad: "Yayında", renk: "yesil", kod: "yayinda" };
}
function kosulYazi(d: Indirim) {
  if (d.type === "EARLY_BOOKING") return `Girişe ${d.minDays} gün ve fazlası`;
  if (d.type === "LAST_MINUTE") return `Girişe ${d.maxDays} gün ve daha az`;
  if (d.type === "LONG_STAY") return `${d.minNights} gece ve fazlası`;
  return d.stayStart && d.stayEnd ? `Giriş ${kisaTarih(d.stayStart)} – ${kisaTarih(d.stayEnd)}` : "Tarih aralığı";
}
function yayinYazi(d: Pick<Indirim, "startsAt" | "endsAt">) {
  if (!d.startsAt && !d.endsAt) return "Süresiz";
  if (d.startsAt && d.endsAt) return `${kisaTarih(d.startsAt)} – ${kisaTarih(d.endsAt)}`;
  return d.endsAt ? `${kisaTarih(d.endsAt)}'e kadar` : `${kisaTarih(d.startsAt!)}'den itibaren`;
}
const kapsamYazi = (d: Pick<Indirim, "hotelCodes" | "locationName">) =>
  d.hotelCodes.length ? `${d.hotelCodes.length} seçili otel` : d.locationName ? `${d.locationName} otelleri` : "Tüm oteller";

export function Kampanyalar() {
  const [sekme, setSekme] = React.useState<"indirim" | "kupon">("indirim");
  const [filtre, setFiltre] = React.useState("");
  const [simdi] = React.useState(simdiAl);
  const [indirimForm, setIndirimForm] = React.useState<Indirim | "yeni" | null>(null);
  const [kuponForm, setKuponForm] = React.useState<Kupon | "yeni" | null>(null);
  const indirimler = useQuery({
    queryKey: ["yonetim", "indirimler"],
    queryFn: () => getir<{ indirimler: Indirim[]; karPayi: { yuzde: number; ad: string } | null }>("/api/admin/discounts"),
  });
  const kuponlar = useQuery({ queryKey: ["yonetim", "kuponlar"], queryFn: () => getir<{ kuponlar: Kupon[] }>("/api/admin/coupons") });
  const kar = indirimler.data?.karPayi ?? null;
  const liste = indirimler.data?.indirimler ?? [];
  const durumlu = liste.map((d) => ({ d, du: durum(d, simdi) }));
  const say = (k: string) => durumlu.filter((x) => x.du.kod === k).length;
  // Kâr payını aşan (ya da kural yokken) yayındaki/planlı müşteri indirimleri.
  const asanlar = durumlu.filter(({ d, du }) => (du.kod === "yayinda" || du.kod === "planli") && d.audience !== "AGENCY" && (!kar || d.percent > kar.yuzde));

  return (
    <div className={s.dis}>
      <div className={s.sayfaBas}>
        <h1 className="lb-y">Kampanyalar</h1>
        <button type="button" className={`${s.dugme} ${s.siyah}`} onClick={() => (sekme === "indirim" ? setIndirimForm("yeni") : setKuponForm("yeni"))}>
          <Ikon ad="plus" boyut={16} kalinlik={2.2} />
          {sekme === "indirim" ? "Yeni indirim" : "Yeni kupon"}
        </button>
      </div>
      <div className={s.altSekmeler} role="tablist" aria-label="Kampanyalar">
        <button role="tab" type="button" aria-selected={sekme === "indirim"} onClick={() => setSekme("indirim")}>
          İndirimler {indirimler.data && <i className={say("yayinda") ? s.say : undefined}>{say("yayinda")}</i>}
        </button>
        <button role="tab" type="button" aria-selected={sekme === "kupon"} onClick={() => setSekme("kupon")}>
          Kuponlar {kuponlar.data && <i>{kuponlar.data.kuponlar.length}</i>}
        </button>
      </div>

      {sekme === "indirim" ? (
        <>
          <div className={s.aciklamaSerit}>
            <Nesne ad="indirim" boyut={44} />
            <p>
              <b>İndirimler kodsuz.</b> Koşulu tutan rezervasyona kendiliğinden uygulanır; aramada ve otel sayfasında üstü çizili fiyatla görünür.
              Bir rezervasyona birden çok indirim uyarsa <b>en yüksek olanı</b> uygulanır, indirimler birleşmez. İndirim kâr payı eklenmiş satış
              fiyatından düşer.
            </p>
          </div>
          {indirimler.data && asanlar.length > 0 && (
            <div className={s.uyariSerit} role="alert">
              <Ikon ad="warning" boyut={20} />
              <span>
                {kar ? (
                  <>
                    <b>{asanlar.map((x) => x.d.name).join(", ")}</b> müşteri kâr payından (%{kar.yuzde}) büyük. Satış net fiyatın altına inmez: indirim, kâr payı kadarıyla sınırlı kalır.
                  </>
                ) : (
                  <>
                    <b>Müşterilere kâr payı kuralı yok.</b> Satış fiyatı net fiyat olduğu için indirimler uygulanamaz (fiyat maliyetin altına inmez). Önce Fiyatlar&apos;dan kâr payı ekle.
                  </>
                )}
              </span>
            </div>
          )}
          {indirimler.isPending ? (
            <div className={s.iskelet} aria-busy="true" />
          ) : indirimler.isError ? (
            <div className={s.bos}><b>İndirimler alınamadı</b><button type="button" className={`${s.dugme} ${s.siyah}`} onClick={() => indirimler.refetch()}>Tekrar dene</button></div>
          ) : liste.length ? (
            <>
              <div className={s.cipler} role="group" aria-label="Durum" style={{ margin: "18px 0 14px" }}>
                <button type="button" className={s.cip} aria-pressed={!filtre} onClick={() => setFiltre("")}>Tümü <i>{liste.length}</i></button>
                {[["yayinda", "Yayında"], ["planli", "Planlandı"], ["durdu", "Durduruldu"], ["bitti", "Bitti"]].map(([k, ad]) =>
                  say(k) ? (
                    <button key={k} type="button" className={s.cip} aria-pressed={filtre === k} onClick={() => setFiltre(k)}>{ad} <i>{say(k)}</i></button>
                  ) : null
                )}
              </div>
              <div className={s.dkartlar}>
                {durumlu
                  .filter((x) => !filtre || x.du.kod === filtre)
                  .map(({ d, du }) => (
                    <IndirimKarti key={d.id} d={d} du={du} asiyor={asanlar.some((x) => x.d.id === d.id)} onDuzenle={() => setIndirimForm(d)} />
                  ))}
              </div>
            </>
          ) : (
            <div className={s.bos} style={{ marginTop: 18 }}>
              <Nesne ad="indirim" boyut={72} />
              <b>Henüz indirim yok</b>
              <span>Erken rezervasyon, son dakika, uzun konaklama ya da belirli tarihler için indirim tanımla; fiyatlara kendiliğinden yansır.</span>
            </div>
          )}
        </>
      ) : (
        <Kuponlar q={kuponlar} onDuzenle={setKuponForm} />
      )}

      <IndirimPenceresi d={indirimForm} kar={kar} onKapat={() => setIndirimForm(null)} />
      <KuponPenceresi k={kuponForm} kar={kar} onKapat={() => setKuponForm(null)} />
    </div>
  );
}

function IndirimKarti({ d, du, asiyor, onDuzenle }: { d: Indirim; du: { ad: string; renk: string; kod: string }; asiyor: boolean; onDuzenle: () => void }) {
  const istemci = useQueryClient();
  const bildiri = useBildiri();
  const [emin, setEmin] = React.useState(false);
  const ac = useMutation({
    mutationFn: (isActive: boolean) => gonder(`/api/admin/discounts/${d.id}`, "PATCH", { isActive }),
    onSuccess: (_, v) => {
      istemci.invalidateQueries({ queryKey: ["yonetim"] });
      bildiri(v ? "İndirim yayında; fiyatlara hemen yansır" : "İndirim durduruldu");
    },
    onError: (e: Error) => bildiri(e.message),
  });
  const sil = useMutation({
    mutationFn: () => gonder(`/api/admin/discounts/${d.id}`, "DELETE"),
    onSuccess: () => {
      istemci.invalidateQueries({ queryKey: ["yonetim"] });
      bildiri("İndirim silindi");
    },
    onError: (e: Error) => {
      setEmin(false);
      bildiri(e.message);
    },
  });
  const aktif = ac.isPending ? !!ac.variables : d.isActive;
  return (
    <article className={s.dkart} data-soluk={du.kod === "bitti" || du.kod === "durdu" || undefined}>
      <div className={s.dkartUst}>
        <Nesne ad={bolgeNesnesi(d.locationName) ?? TUR[d.type].nesne} boyut={56} />
        <div><span className={s.rozet} data-renk={du.renk}>{du.ad}</span></div>
        <Anahtar acik={aktif} etiket={`${d.name} etkin`} pasif={ac.isPending || du.kod === "bitti"} onDegis={(v) => ac.mutate(v)} />
      </div>
      <div className={s.dkartIc}>
        <span className={s.tur}><Ikon ad={TUR[d.type].ikon} boyut={14} kalinlik={2.1} />{TUR[d.type].ad}</span>
        <h3>{d.name}</h3>
        <b className={`lb-y ${s.oran}`}>%{d.percent.toLocaleString("tr-TR")}</b>
        <ul className={s.kosullar}>
          <li>{kosulYazi(d)}</li>
          <li>{kapsamYazi(d)}</li>
          <li>{KIME[d.audience]}</li>
          <li>{yayinYazi(d)}</li>
        </ul>
        {asiyor && <span className={s.uyari}><Ikon ad="warning" boyut={14} kalinlik={2.2} />Kâr payını aşıyor, kısılır</span>}
      </div>
      <div className={s.dkartAlt}>
        <span>
          {d.kullanim.adet
            ? `${sayi(d.kullanim.adet)} rezervasyon · ${eur(d.kullanim.tutar)} indirim`
            : d.kullanim.bagli
              ? `Onaylı rezervasyon yok · ${sayi(d.kullanim.bagli)} rezervasyona bağlı`
              : "Henüz kullanılmadı"}
        </span>
        {d.showcase && <span className={s.vitrinRozet}><Ikon ad="eye" boyut={13} kalinlik={2.2} />Vitrinde</span>}
      </div>
      <div className={s.islemler} style={{ justifyContent: "flex-start", marginTop: 10 }}>
        {emin ? (
          <>
            <button type="button" className={`${s.metinDugme} ${s.tehlike}`} disabled={sil.isPending} onClick={() => sil.mutate()}>Evet, sil</button>
            <button type="button" className={s.metinDugme} onClick={() => setEmin(false)}>Vazgeç</button>
          </>
        ) : (
          <>
            <button type="button" className={s.metinDugme} onClick={onDuzenle}>Düzenle</button>
            {/* Bekleyen, iptal ya da başarısız rezervasyona bağlı indirim de silinmez (API 409); durdurulur. */}
            {!d.kullanim.bagli && <button type="button" className={s.metinDugme} onClick={() => setEmin(true)}>Sil</button>}
          </>
        )}
      </div>
    </article>
  );
}

/* ── İndirim formu ── */
function IndirimPenceresi({ d, kar, onKapat }: { d: Indirim | "yeni" | null; kar: { yuzde: number } | null; onKapat: () => void }) {
  const [son, setSon] = React.useState(d);
  if (d && d !== son) setSon(d);
  const x = d ?? son;
  return (
    <Pencere acik={!!d} onKapat={onKapat} baslik={x === "yeni" ? "Yeni indirim" : "İndirimi düzenle"} genislik={820}>
      {x && <IndirimFormu key={x === "yeni" ? "yeni" : x.id} d={x === "yeni" ? null : x} kar={kar} onKapat={onKapat} />}
    </Pencere>
  );
}

type Kapsam = "tum" | "bolge" | "otel";
function IndirimFormu({ d, kar, onKapat }: { d: Indirim | null; kar: { yuzde: number } | null; onKapat: () => void }) {
  const istemci = useQueryClient();
  const bildiri = useBildiri();
  const [tur, setTur] = React.useState<Tur>(d?.type ?? "EARLY_BOOKING");
  const [yuzde, setYuzde] = React.useState(d ? String(d.percent) : "10");
  const [gunSayi, setGunSayi] = React.useState(String(d?.minDays ?? d?.maxDays ?? d?.minNights ?? 60));
  const [konBas, setKonBas] = React.useState(gun(d?.stayStart ?? null));
  const [konSon, setKonSon] = React.useState(gun(d?.stayEnd ?? null));
  const [kapsam, setKapsam] = React.useState<Kapsam>(d?.hotelCodes.length ? "otel" : d?.locationName ? "bolge" : "tum");
  const [bolge, setBolge] = React.useState(d?.locationName ?? "");
  const [oteller, setOteller] = React.useState<{ kod: string; ad: string }[]>(d?.hotelCodes.map((k) => ({ kod: k, ad: k })) ?? []);
  const [kime, setKime] = React.useState<Kime>(d?.audience ?? "CUSTOMER");
  const [bas, setBas] = React.useState(gun(d?.startsAt ?? null));
  const [bit, setBit] = React.useState(gun(d?.endsAt ?? null));
  const [ad, setAd] = React.useState(d?.name ?? "");
  const [aciklama, setAciklama] = React.useState(d?.description ?? "");
  const [vitrin, setVitrin] = React.useState(d?.showcase ?? true);
  const [hata, setHata] = React.useState<string | null>(null);

  // Tür değişince varsayılan gün/gece.
  const turSec = (t: Tur) => {
    setTur(t);
    if (!d) setGunSayi(t === "EARLY_BOOKING" ? "60" : t === "LAST_MINUTE" ? "3" : "7");
  };
  const kaydet = useMutation({
    mutationFn: (g: Record<string, unknown>) => (d ? gonder(`/api/admin/discounts/${d.id}`, "PATCH", g) : gonder("/api/admin/discounts", "POST", g)),
    onSuccess: () => {
      istemci.invalidateQueries({ queryKey: ["yonetim"] });
      bildiri(d ? "İndirim güncellendi" : "İndirim kaydedildi; yayın tarihinde fiyatlara yansır");
      onKapat();
    },
    onError: (e: Error) => setHata(e.message),
  });

  const oran = Math.max(0, Math.min(90, Number(yuzde) || 0));
  const net = 500;
  const satis = net * (1 + (kar?.yuzde ?? 0) / 100);
  const indirim = (satis * oran) / 100;
  const odenen = satis - indirim;
  const fark = odenen - net;
  const acentede = kime === "AGENCY";

  const tamam = (e: React.FormEvent) => {
    e.preventDefault();
    setHata(null);
    const n = Math.round(Number(gunSayi));
    if (!(oran > 0)) return setHata("İndirim yüzdesini yaz (1–90)");
    if (Number(yuzde) > 90) return setHata("İndirim en fazla %90 olabilir");
    if (tur !== "DATE_RANGE" && !(n >= (tur === "LAST_MINUTE" ? 0 : 1))) return setHata("Gün ya da gece sayısını yaz");
    if (tur === "DATE_RANGE" && (!konBas || !konSon)) return setHata("Konaklama tarih aralığını seç");
    if (kapsam === "bolge" && !bolge.trim()) return setHata("Bölge seç");
    if (kapsam === "otel" && !oteller.length) return setHata("En az bir otel seç");
    if (bas && bit && bas > bit) return setHata("Yayın bitişi başlangıçtan önce olamaz");
    const isim = ad.trim() || `${TUR[tur].ad}${kapsam === "bolge" && bolge ? ` · ${bolge}` : ""}`;
    kaydet.mutate({
      name: isim,
      type: tur,
      percent: oran,
      minDays: tur === "EARLY_BOOKING" ? n : null,
      maxDays: tur === "LAST_MINUTE" ? n : null,
      minNights: tur === "LONG_STAY" ? n : null,
      stayStart: tur === "DATE_RANGE" ? konBas : null,
      stayEnd: tur === "DATE_RANGE" ? konSon : null,
      hotelCodes: kapsam === "otel" ? oteller.map((o) => o.kod) : [],
      locationName: kapsam === "bolge" ? bolge.trim() : null,
      audience: kime,
      startsAt: bas || null,
      endsAt: bit || null,
      showcase: vitrin,
      description: aciklama.trim() || null,
    });
  };

  return (
    <form className={s.form} onSubmit={tamam} noValidate>
      <span className={s.pEtiket}>Tür</span>
      <div className={s.turSec} role="radiogroup" aria-label="İndirim türü">
        {(Object.keys(TUR) as Tur[]).map((t) => (
          <label key={t}>
            <input type="radio" name="d-tur" checked={tur === t} onChange={() => turSec(t)} />
            <Nesne ad={TUR[t].nesne} boyut={40} />
            <span><b>{TUR[t].ad}</b><span>{TUR[t].aciklama}</span></span>
          </label>
        ))}
      </div>
      <div className={s.ikiAlan}>
        <Girdi id="d-oran" etiket="İndirim (%)" type="number" min={1} max={90} inputMode="decimal" value={yuzde} onDegis={setYuzde} />
        {tur === "DATE_RANGE" ? (
          <div className={s.ikiAlan}>
            <Girdi id="d-kbas" etiket="Giriş, en erken" type="date" value={konBas} onDegis={setKonBas} />
            <Girdi id="d-kson" etiket="Giriş, en geç" type="date" value={konSon} onDegis={setKonSon} />
          </div>
        ) : (
          <Girdi
            id="d-gun"
            etiket={tur === "EARLY_BOOKING" ? "Girişe en az (gün)" : tur === "LAST_MINUTE" ? "Girişe en fazla (gün)" : "En az (gece)"}
            type="number"
            min={0}
            inputMode="numeric"
            value={gunSayi}
            onDegis={setGunSayi}
          />
        )}
      </div>
      <div className={s.ikiAlan}>
        <Secim id="d-kapsam" etiket="Nerede" deger={kapsam} onDegis={(v) => setKapsam(v as Kapsam)}>
          <option value="tum">Tüm oteller</option>
          <option value="bolge">Bir bölgedeki oteller</option>
          <option value="otel">Seçili oteller</option>
        </Secim>
        <Secim id="d-kime" etiket="Kime" deger={kime} onDegis={(v) => setKime(v as Kime)}>
          <option value="CUSTOMER">Müşteriler</option>
          <option value="AGENCY">Acenteler</option>
          <option value="ALL">Müşteriler ve acenteler</option>
        </Secim>
      </div>
      {kapsam === "bolge" && <BolgeSecici deger={bolge} onSec={setBolge} />}
      {kapsam === "otel" && <OtelCokluSecici secili={oteller} onDegis={setOteller} />}
      <div className={s.ikiAlan}>
        <Girdi id="d-bas" etiket="Yayın başlangıcı (boşsa hemen)" type="date" value={bas} onDegis={setBas} />
        <Girdi id="d-bit" etiket="Yayın bitişi (boşsa süresiz)" type="date" value={bit} onDegis={setBit} />
      </div>
      <Girdi id="d-ad" etiket="Ad (vitrinde başlık)" value={ad} onDegis={setAd} placeholder={`Örn. ${TUR[tur].ad}${kapsam === "bolge" && bolge ? ` · ${bolge}` : ""}`} maxLength={120} />
      <label className={s.onayKutu}>
        <input type="checkbox" checked={vitrin} onChange={(e) => setVitrin(e.target.checked)} />
        <span>/kampanyalar vitrininde göster</span>
      </label>
      {vitrin && (
        <div className={s.alan}>
          <label htmlFor="d-aciklama">Vitrin açıklaması (isteğe bağlı)</label>
          <textarea id="d-aciklama" rows={2} maxLength={400} value={aciklama} onChange={(e) => setAciklama(e.target.value)} placeholder="Boşsa koşuldan yazılır" />
        </div>
      )}
      <div className={s.onizleme} aria-live="polite">
        <ol>
          <li><span>Etscore net fiyatı (örnek)</span><b>{eur(net, true)}</b></li>
          <li><span>{acentede ? "Kâr payı (acente kuralı)" : `Müşteri kâr payı ${kar ? `+%${kar.yuzde}` : "(kural yok)"}`}</span><b>+{eur(satis - net, true)}</b></li>
          <li><span>İndirim −%{oran}</span><b>−{eur(indirim, true)}</b></li>
          <li data-tur="toplam"><span>Müşterinin ödediği</span><b>{eur(odenen, true)}</b></li>
          {!acentede && (
            <li data-tur={fark < 0 ? "zarar" : "kar"}>
              <span>{fark < 0 ? "Net fiyatın altında (zarar)" : "Sende kalan kâr"}</span>
              <b>{fark < 0 ? "−" : ""}{eur(Math.abs(fark), true)}</b>
            </li>
          )}
        </ol>
      </div>
      {hata && <HataYazi>{hata}</HataYazi>}
      <div className={s.pAlt}>
        <button type="button" className={`${s.dugme} ${s.cerceve}`} onClick={onKapat}>Vazgeç</button>
        <button type="submit" className={`${s.dugme} ${s.siyah}`} disabled={kaydet.isPending}>{kaydet.isPending ? "Kaydediliyor…" : d ? "Kaydet" : "Kaydet ve yayına al"}</button>
      </div>
    </form>
  );
}

function BolgeSecici({ deger, onSec }: { deger: string; onSec: (v: string) => void }) {
  const [q, setQ] = React.useState(deger);
  const [acik, setAcik] = React.useState(false);
  const [aranan, setAranan] = React.useState("");
  React.useEffect(() => {
    const t = setTimeout(() => setAranan(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);
  const sonuc = useQuery({
    queryKey: ["yonetim", "konum-ara", aranan],
    queryFn: () => getir<{ oneriler: { id: string; ad: string; ust: string | null; otel: number }[] }>(`/api/konum/oneri?q=${encodeURIComponent(aranan)}`),
    enabled: acik && aranan.length >= 2,
  });
  return (
    <div style={{ position: "relative" }}>
      <Girdi
        id="d-bolge"
        etiket="Bölge (il, ilçe ya da tatil yeri)"
        value={q}
        autoComplete="off"
        placeholder="Örn. Bodrum"
        onFocus={() => setAcik(true)}
        onBlur={() => setTimeout(() => setAcik(false), 150)}
        onDegis={(v) => { setQ(v); onSec(""); }}
      />
      {acik && !!sonuc.data?.oneriler.length && (
        <div className={s.acilir} data-acik style={{ left: 0, right: 0, width: "auto", top: "calc(100% + 6px)" }}>
          {sonuc.data.oneriler.map((o) => (
            <button key={o.id} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { onSec(o.ad); setQ(o.ad); setAcik(false); }}>
              <span><b>{o.ad}</b><span className={s.alt}>{[o.ust, `${o.otel} otel`].filter(Boolean).join(" · ")}</span></span>
            </button>
          ))}
        </div>
      )}
      <p className={s.not} style={{ marginTop: 4 }}>
        {deger ? `Adı "${deger}" olan tüm konumlardaki oteller kapsanır (aramadaki gibi).` : "Listeden bir bölge seç."}
      </p>
    </div>
  );
}

function OtelCokluSecici({ secili, onDegis }: { secili: { kod: string; ad: string }[]; onDegis: (v: { kod: string; ad: string }[]) => void }) {
  const [q, setQ] = React.useState("");
  const [aranan, setAranan] = React.useState("");
  React.useEffect(() => {
    const t = setTimeout(() => setAranan(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);
  const sonuc = useQuery({
    queryKey: ["yonetim", "otel-ara", aranan],
    queryFn: () => getir<{ oteller: { kod: string; ad: string; yer: string | null }[] }>(`/api/admin/secenekler?otel=${encodeURIComponent(aranan)}`),
    enabled: aranan.length >= 2,
  });
  // Düzenlemede yalnız kodlar gelir; adlarını tamamla.
  const adsiz = secili.filter((o) => o.ad === o.kod).map((o) => o.kod);
  const adlar = useQuery({
    queryKey: ["yonetim", "otel-adlari", adsiz.join(",")],
    queryFn: async () => {
      const cikti: Record<string, string> = {};
      for (const k of adsiz) {
        const r = await getir<{ oteller: { kod: string; ad: string }[] }>(`/api/admin/secenekler?otel=${encodeURIComponent(k)}`);
        const o = r.oteller.find((x) => x.kod === k);
        if (o) cikti[k] = o.ad;
      }
      return cikti;
    },
    enabled: adsiz.length > 0,
  });
  return (
    <div className={s.form}>
      <div style={{ position: "relative" }}>
        <Girdi id="d-otel" etiket="Otel ekle" value={q} placeholder="Otel adı ya da kodu" autoComplete="off" onDegis={setQ} />
        {aranan.length >= 2 && !!sonuc.data?.oteller.length && (
          <div className={s.acilir} data-acik style={{ left: 0, right: 0, width: "auto", top: "calc(100% + 6px)" }}>
            {sonuc.data.oteller.map((o) => (
              <button
                key={o.kod}
                type="button"
                disabled={secili.some((x) => x.kod === o.kod)}
                onClick={() => { onDegis([...secili, { kod: o.kod, ad: o.ad }]); setQ(""); }}
              >
                <span><b>{o.ad}</b><span className={s.alt}>{[o.yer, o.kod].filter(Boolean).join(" · ")}</span></span>
              </button>
            ))}
          </div>
        )}
      </div>
      {secili.length > 0 && (
        <div className={s.cipler}>
          {secili.map((o) => (
            <button key={o.kod} type="button" className={s.cip} onClick={() => onDegis(secili.filter((x) => x.kod !== o.kod))} aria-label={`${o.ad} kaldır`}>
              {adlar.data?.[o.kod] ?? o.ad} <Ikon ad="close" boyut={14} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Kuponlar ── */
const KUPON_KIME = { CUSTOMER: "Müşteriler", NEW_CUSTOMER: "Yeni müşteriler (ilk rezervasyon)", AGENCY: "Acenteler" } as const;
function Kuponlar({ q, onDuzenle }: { q: UseQueryResult<{ kuponlar: Kupon[] }>; onDuzenle: (k: Kupon) => void }) {
  const bildiri = useBildiri();
  return (
    <>
      <div className={s.aciklamaSerit}>
        <Nesne ad="odeme-karti" boyut={44} />
        <p>
          <b>Kuponlar kodla çalışır.</b> Müşteri ödeme adımında &quot;Kupon ekle&quot;ye yazar. Instagram, e-posta ya da özel müşteri için dağıtırsın;
          herkese açık listede görünmez. Otomatik indirimle birleşip birleşmeyeceğini kuponda seçersin; birleşmiyorsa müşteriye avantajlı olan uygulanır.
        </p>
      </div>
      <div style={{ height: 16 }} />
      {q.isPending ? (
        <div className={s.iskelet} aria-busy="true" />
      ) : q.isError || !q.data ? (
        <div className={s.bos}><b>Kuponlar alınamadı</b><button type="button" className={`${s.dugme} ${s.siyah}`} onClick={() => q.refetch()}>Tekrar dene</button></div>
      ) : q.data.kuponlar.length ? (
        <div className={s.tabloKap}>
          <table className={s.tablo}>
            <thead>
              <tr><th>Kod</th><th className={s.sagHiz}>İndirim</th><th>Koşul ve kime</th><th>Kullanım</th><th>Son kullanım</th><th>Etkin</th><th /></tr>
            </thead>
            <tbody>
              {q.data.kuponlar.map((k) => (
                <KuponSatiri
                  key={k.id}
                  k={k}
                  onDuzenle={() => onDuzenle(k)}
                  onKopyala={() => navigator.clipboard?.writeText(k.code).then(() => bildiri(`${k.code} kopyalandı`), () => bildiri(k.code))}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={s.bos}>
          <Nesne ad="odeme-karti" boyut={72} />
          <b>Henüz kupon yok</b>
          <span>Instagram ya da e-posta kampanyası için kod oluştur; müşteri ödeme adımında yazar.</span>
        </div>
      )}
    </>
  );
}

function KuponSatiri({ k, onDuzenle, onKopyala }: { k: Kupon; onDuzenle: () => void; onKopyala: () => void }) {
  const istemci = useQueryClient();
  const bildiri = useBildiri();
  const [emin, setEmin] = React.useState(false);
  const [simdi] = React.useState(simdiAl);
  const bitti = !!k.expiresAt && new Date(k.expiresAt).getTime() < simdi;
  const doldu = k.usageLimit !== null && k.usedCount >= k.usageLimit;
  const ac = useMutation({
    mutationFn: (isActive: boolean) => gonder(`/api/admin/coupons/${k.id}`, "PATCH", { isActive }),
    onSuccess: (_, v) => {
      istemci.invalidateQueries({ queryKey: ["yonetim", "kuponlar"] });
      bildiri(v ? "Kupon etkin" : "Kupon durduruldu; kod artık kabul edilmez");
    },
    onError: (e: Error) => bildiri(e.message),
  });
  const sil = useMutation({
    mutationFn: () => gonder(`/api/admin/coupons/${k.id}`, "DELETE"),
    onSuccess: () => {
      istemci.invalidateQueries({ queryKey: ["yonetim", "kuponlar"] });
      bildiri("Kupon silindi");
    },
    onError: (e: Error) => { setEmin(false); bildiri(e.message); },
  });
  const aktif = ac.isPending ? !!ac.variables : k.isActive;
  const kosul = [k.minAmount ? `En az ${eur(k.minAmount)}` : null, k.perUserOnce ? "kişi başı bir kez" : null].filter(Boolean).join(" · ") || "Koşulsuz";
  return (
    <tr data-kapali={!aktif || bitti || doldu || undefined}>
      <td>
        <button type="button" className={s.kod} onClick={onKopyala} title="Kopyala">{k.code}</button>
        {k.note && <span className={s.alt}>{k.note}</span>}
      </td>
      <td className={`${s.sagHiz} ${s.deger}`}>{k.type === "PERCENTAGE" ? `%${k.value}` : eur(k.value)}</td>
      <td>{kosul}<span className={s.alt}>{KUPON_KIME[k.audience]}{k.stacks ? " · otomatik indirimle birleşir" : ""}</span></td>
      <td>
        <div className={s.kullanim}>
          <span>{sayi(k.usedCount)}{k.usageLimit ? ` / ${sayi(k.usageLimit)}` : ""}{k.toplamIndirim ? ` · ${eur(k.toplamIndirim)}` : ""}</span>
          {k.usageLimit && <div><i style={{ width: `${Math.min(100, (k.usedCount / k.usageLimit) * 100)}%` }} /></div>}
        </div>
      </td>
      <td>{k.expiresAt ? `${bitti ? "Bitti · " : ""}${tarihUzun(k.expiresAt)}` : "Süresiz"}</td>
      <td><Anahtar acik={aktif} etiket={`${k.code} etkin`} pasif={ac.isPending} onDegis={(v) => ac.mutate(v)} /></td>
      <td>
        <div className={s.islemler}>
          {emin ? (
            <>
              <button type="button" className={`${s.metinDugme} ${s.tehlike}`} disabled={sil.isPending} onClick={() => sil.mutate()}>Evet, sil</button>
              <button type="button" className={s.metinDugme} onClick={() => setEmin(false)}>Vazgeç</button>
            </>
          ) : (
            <>
              <button type="button" className={s.metinDugme} onClick={onDuzenle}>Düzenle</button>
              {!k.bagli && <button type="button" className={s.metinDugme} onClick={() => setEmin(true)}>Sil</button>}
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

function KuponPenceresi({ k, kar, onKapat }: { k: Kupon | "yeni" | null; kar: { yuzde: number } | null; onKapat: () => void }) {
  const [son, setSon] = React.useState(k);
  if (k && k !== son) setSon(k);
  const x = k ?? son;
  return (
    <Pencere acik={!!k} onKapat={onKapat} baslik={x === "yeni" ? "Yeni kupon" : "Kuponu düzenle"} genislik={600}>
      {x && <KuponFormu key={x === "yeni" ? "yeni" : x.id} k={x === "yeni" ? null : x} kar={kar} onKapat={onKapat} />}
    </Pencere>
  );
}

const rastgeleKod = () => "LB" + Array.from(crypto.getRandomValues(new Uint8Array(5)), (b) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b % 32]).join("");

function KuponFormu({ k, kar, onKapat }: { k: Kupon | null; kar: { yuzde: number } | null; onKapat: () => void }) {
  const istemci = useQueryClient();
  const bildiri = useBildiri();
  const [kod, setKod] = React.useState(k?.code ?? "");
  const [tur, setTur] = React.useState<"PERCENTAGE" | "FIXED">(k?.type ?? "PERCENTAGE");
  const [deger, setDeger] = React.useState(k ? String(k.value) : "10");
  const [min, setMin] = React.useState(k?.minAmount != null ? String(k.minAmount) : "");
  const [limit, setLimit] = React.useState(k?.usageLimit != null ? String(k.usageLimit) : "");
  const [kime, setKime] = React.useState<Kupon["audience"]>(k?.audience ?? "CUSTOMER");
  const [bitis, setBitis] = React.useState(gun(k?.expiresAt ?? null));
  const [kisi, setKisi] = React.useState(k?.perUserOnce ?? true);
  const [birles, setBirles] = React.useState(k?.stacks ?? false);
  const [not, setNot] = React.useState(k?.note ?? "");
  const [hata, setHata] = React.useState<string | null>(null);
  const kaydet = useMutation({
    mutationFn: (g: Record<string, unknown>) => (k ? gonder(`/api/admin/coupons/${k.id}`, "PATCH", g) : gonder("/api/admin/coupons", "POST", g)),
    onSuccess: () => {
      istemci.invalidateQueries({ queryKey: ["yonetim", "kuponlar"] });
      bildiri(k ? "Kupon güncellendi" : `${kod.trim().toUpperCase()} oluşturuldu; müşteri ödeme adımında kullanabilir`);
      onKapat();
    },
    onError: (e: Error) => setHata(e.message),
  });
  const d = Number(deger) || 0;
  const tamam = (e: React.FormEvent) => {
    e.preventDefault();
    setHata(null);
    const c = kod.trim().toUpperCase();
    if (!/^[A-Z0-9]{4,20}$/.test(c)) return setHata("Kod 4–20 harf ya da rakam olmalı");
    if (!(d > 0) || (tur === "PERCENTAGE" && d > 90)) return setHata(tur === "PERCENTAGE" ? "Yüzde 1–90 arasında olmalı" : "Tutar sıfırdan büyük olmalı");
    kaydet.mutate({
      code: c,
      type: tur,
      value: d,
      minAmount: min ? Number(min) : null,
      usageLimit: limit ? Math.round(Number(limit)) : null,
      audience: kime,
      expiresAt: bitis || null,
      perUserOnce: kisi,
      stacks: birles,
      note: not.trim() || null,
    });
  };
  return (
    <form className={s.form} onSubmit={tamam} noValidate>
      <div className={s.ikiAlan}>
        <Girdi id="c-kod" etiket="Kod" value={kod} onDegis={(v) => setKod(v.toUpperCase())} autoComplete="off" spellCheck={false} maxLength={20} />
        <div style={{ display: "flex", alignItems: "center" }}>
          <button type="button" className={s.metinDugme} onClick={() => setKod(rastgeleKod())}>Rastgele kod üret</button>
        </div>
      </div>
      <div className={s.ikiAlan}>
        <Secim id="c-tur" etiket="İndirim" deger={tur} onDegis={(v) => setTur(v as "PERCENTAGE" | "FIXED")}>
          <option value="PERCENTAGE">Yüzde (%)</option>
          <option value="FIXED">Tutar (€)</option>
        </Secim>
        <Girdi id="c-deger" etiket={tur === "PERCENTAGE" ? "Yüzde" : "Tutar (€)"} type="number" min={1} inputMode="decimal" value={deger} onDegis={setDeger} />
      </div>
      <div className={s.ikiAlan}>
        <Girdi id="c-min" etiket="En az sepet (€, boşsa yok)" type="number" min={0} inputMode="decimal" value={min} onDegis={setMin} />
        <Girdi id="c-limit" etiket="Toplam kullanım (boşsa sınırsız)" type="number" min={1} inputMode="numeric" value={limit} onDegis={setLimit} />
      </div>
      <div className={s.ikiAlan}>
        <Secim id="c-kime" etiket="Kime" deger={kime} onDegis={(v) => setKime(v as Kupon["audience"])}>
          <option value="CUSTOMER">Müşteriler</option>
          <option value="NEW_CUSTOMER">Yeni müşteriler (ilk rezervasyon)</option>
          <option value="AGENCY">Acenteler</option>
        </Secim>
        <Girdi id="c-bitis" etiket="Son kullanım (boşsa süresiz)" type="date" value={bitis} onDegis={setBitis} />
      </div>
      <Girdi id="c-not" etiket="Not (nerede dağıtıldı; müşteri görmez)" value={not} onDegis={setNot} maxLength={200} placeholder="Örn. Instagram ekim paylaşımı" />
      <label className={s.onayKutu}>
        <input type="checkbox" checked={kisi} onChange={(e) => setKisi(e.target.checked)} />
        <span>Kişi başı bir kez</span>
      </label>
      <label className={s.onayKutu}>
        <input type="checkbox" checked={birles} onChange={(e) => setBirles(e.target.checked)} />
        <span>Otomatik indirimle birleşsin</span>
      </label>
      <p className={s.not}>
        {birles
          ? `Otomatik indirimin üstüne ${tur === "PERCENTAGE" ? `%${d}` : eur(d)} daha düşer. İkisinin toplamı kâr payını${kar ? ` (%${kar.yuzde})` : ""} aşarsa zararına satarsın.`
          : "Rezervasyona otomatik indirim de uyuyorsa müşteriye hangisi daha avantajlıysa o uygulanır; ikisi birleşmez."}
      </p>
      {hata && <HataYazi>{hata}</HataYazi>}
      <div className={s.pAlt}>
        <button type="button" className={`${s.dugme} ${s.cerceve}`} onClick={onKapat}>Vazgeç</button>
        <button type="submit" className={`${s.dugme} ${s.siyah}`} disabled={kaydet.isPending}>{kaydet.isPending ? "Kaydediliyor…" : k ? "Kaydet" : "Kuponu oluştur"}</button>
      </div>
    </form>
  );
}
