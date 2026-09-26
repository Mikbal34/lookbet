"use client";
/* eslint-disable @next/next/no-img-element -- otel görselleri dış kaynaklı (tedarikçi) */

// Rezervasyon detayı: yolculuk çizelgesi (rezervasyon → ücretsiz iptal son
// gün → giriş → çıkış, "Bugün" işaretiyle), giriş-çıkış, oda ve misafirler,
// rezervasyon bilgileri, konum ve otel iletişimi, iptal koşulları; sağda
// ödeme özeti. İptal pencerede: önce koşullara göre ücret, sonra sonuç.

import * as React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createTranslator, useTranslations, type Messages } from "next-intl";
import { UstCubuk } from "@/components/lb/ust-cubuk";
import { AltBilgi } from "@/components/lb/alt-bilgi";
import { Ikon } from "@/components/lb/ikon";
import { Nesne } from "@/components/lb/nesne";
import { Pencere } from "@/components/lb/pencere";
import { BOS_ARAMA, aramaAdresi } from "@/components/lb/arama/durum";
import { bicimleyici } from "@/i18n/bicim";
import { useBicim } from "@/i18n/use-bicim";
import type { HotelDetailResponse } from "@/lib/royal-api/types";
import trMetinler from "../../../messages/tr/rezervasyon.json";
import { Kopyala } from "./rezervasyonlar";
import {
  aralikYerel, durumBilgisi, geceler, gunOku, gunUzunYerel, gunYonelmeYerel, iptalDurumu, kalanGun, misafirYerel, saatYerel, telefonGizle, tutar,
  type Rezervasyon,
} from "./ortak";
import s from "./rezervasyonlar.module.css";
import d from "./rezervasyon-detay.module.css";

const KonumHaritasi = dynamic(() => import("@/components/otel-detay/konum-haritasi").then((m) => m.KonumHaritasi), {
  ssr: false,
  loading: () => <HaritaYukleniyor />,
});

function HaritaYukleniyor() {
  const t = useTranslations("rezervasyon");
  return <div className={d.haritaYedek}>{t("detay.konum.haritaYukleniyor")}</div>;
}

type OtelVerisi = Partial<HotelDetailResponse> & { location?: { name: string; parent?: { name: string } | null } | null };
const simdiAl = () => Date.now();

export function RezervasyonDetay({ id }: { id: string }) {
  const t = useTranslations("rezervasyon");
  const tk = useTranslations("ortak");
  const b = useBicim();
  const router = useRouter();
  const istemci = useQueryClient();
  const [simdi, setSimdi] = React.useState(simdiAl);
  const [arama, setArama] = React.useState(BOS_ARAMA);
  const [iptalAcik, setIptalAcik] = React.useState(false);

  const q = useQuery<Rezervasyon>({
    queryKey: ["rezervasyon", id],
    queryFn: async () => {
      const r = await fetch(`/api/reservations/${id}`);
      if (!r.ok) throw new Error(r.status === 404 || r.status === 403 ? "yok" : "hata");
      return r.json();
    },
    retry: (n, e) => e.message !== "yok" && n < 1,
  });
  const r = q.data;
  const otelQ = useQuery<OtelVerisi>({
    queryKey: ["otel-detay", r?.hotelCode],
    queryFn: async () => {
      const x = await fetch(`/api/hotels/${r!.hotelCode}`);
      if (!x.ok) throw new Error("hata");
      return x.json();
    },
    enabled: !!r?.hotelCode,
    staleTime: 10 * 60_000,
  });
  const otel = otelQ.data;

  const ust = <UstCubuk deger={arama} onDegis={setArama} onAra={() => router.push(aramaAdresi(arama))} />;
  if (q.isPending) {
    return (
      <div className={`lb ${s.sayfa}`}>
        {ust}
        <main className={s.dis} aria-busy="true" aria-label={t("detay.yukleniyor")}>
          <div className={d.iskeletBas}><i /><i /></div>
          <div className={`${s.iskelet} ${d.iskeletFoto}`} />
        </main>
      </div>
    );
  }
  if (q.isError || !r) {
    const yok = q.error?.message === "yok";
    return (
      <div className={`lb ${s.sayfa}`}>
        {ust}
        <div className={s.bos}>
          <Nesne ad="zil" boyut={110} />
          <h1 className="lb-y">{yok ? t("detay.bulunamadi") : t("detay.alinamadi")}</h1>
          <p>{yok ? t("detay.bulunamadiMetin") : t("detay.alinamadiMetin")}</p>
          <Link href="/reservations" className={`${s.dugme} ${s.siyah}`}>{t("baslik")}</Link>
        </div>
        <AltBilgi />
      </div>
    );
  }

  const durum = durumBilgisi(r, simdi);
  const aktif = r.status === "PENDING" || r.status === "CONFIRMED";
  const bitti = gunOku(r.checkOut).getTime() < simdi;
  const kalan = kalanGun(r, simdi);
  const ip = iptalDurumu(r, simdi);
  const gece = geceler(r);
  const toplam = tutar(r);
  const indirim = r.discountAmount ?? 0;
  const misafir = misafirYerel(t, r);
  const yer = [otel?.location?.name, otel?.location?.parent?.name].filter(Boolean).join(", ") || r.hotel?.city || "";
  const fotolar = [...new Set([...(otel?.images ?? []).sort((a, b) => Number(b.isMain) - Number(a.isMain)).map((i) => i.url), ...(r.hotel?.image ? [r.hotel.image] : [])])].slice(0, 3);
  const konum = otel?.latitude && otel?.longitude ? { lat: otel.latitude, lng: otel.longitude } : null;
  const telefon = otel?.phone || r.hotel?.phone || null;
  const eposta = otel?.email || null;
  const girisSaati = otel?.policies?.checkInFrom;
  const cikisSaati = otel?.policies?.checkOutUntil;

  // Yolculuk çizelgesi: tarihli duraklar ve bugünün konumu (0–1).
  const duraklar: { ad: string; t: Date }[] = [
    { ad: t("detay.yolculuk.rezervasyon"), t: new Date(r.createdAt) },
    ...(ip.ucretsizSonHer && ip.ucretsizSonHer.getTime() > Date.parse(r.createdAt) && ip.ucretsizSonHer < gunOku(r.checkIn) ? [{ ad: t("detay.yolculuk.ucretsizSon"), t: ip.ucretsizSonHer }] : []),
    { ad: t("giris"), t: gunOku(r.checkIn) },
    { ad: t("cikis"), t: gunOku(r.checkOut) },
  ];
  let oran = 1;
  if (simdi < duraklar[duraklar.length - 1].t.getTime()) {
    const i = Math.max(0, duraklar.findLastIndex((x) => x.t.getTime() <= simdi));
    const a = duraklar[i].t.getTime(), b = duraklar[i + 1].t.getTime();
    oran = (i + Math.min(1, Math.max(0, (simdi - a) / (b - a)))) / (duraklar.length - 1);
  }

  return (
    <div className={`lb ${s.sayfa}`}>
      {ust}
      <main className={s.dis}>
        <Link href="/reservations" className={d.geri}>
          <Ikon ad="back" boyut={18} />
          {t("baslik")}
        </Link>
        <div className={d.bas}>
          <div>
            <span className={s.rozet} data-renk={durum.renk}>{t(`durum.${durum.kod}`)}</span>
            <h1 className="lb-y">{r.hotelName ?? r.hotelCode}</h1>
            <p>{[r.hotel?.stars ? tk("yildizli", { sayi: r.hotel.stars }) : null, yer || null, aralikYerel(b, r)].filter(Boolean).join(" · ")}</p>
          </div>
          {aktif && !bitti && (
            <p className={d.kalan}>{kalan > 0 ? t.rich("kalan.gun", { sayi: kalan, b: (c) => <b className="lb-y">{c}</b> }) : <b className="lb-y">{kalan === 0 ? t("kalan.bugun") : t("kalan.suruyor")}</b>}</p>
          )}
        </div>
        <div className={d.foto} data-adet={Math.max(1, fotolar.length)}>
          {fotolar.length ? fotolar.map((u) => <img key={u} src={u} alt="" />) : <div className={d.fotoYok}><Nesne ad="zil" boyut={72} /></div>}
        </div>

        <div className={d.govde}>
          <div className={d.sol}>
            {r.status === "CANCELLED" || r.status === "FAILED" ? (
              <section>
                <div className={d.iptalBilgi}>
                  <Nesne ad="iptal" boyut={52} />
                  <div>
                    <b>{r.status === "CANCELLED" ? t("detay.iptalEdildi") : t("detay.tamamlanamadi")}</b>
                    <span>
                      {r.status === "CANCELLED"
                        ? r.cancellationFee != null
                          ? t("detay.iptalUcreti", { tutar: b.para(r.cancellationFee, r.cancellationFeeCurrency || r.currency) })
                          : t("detay.iptalUcretiYok")
                        : t("detay.onaylanmadi")}
                    </span>
                  </div>
                </div>
              </section>
            ) : (
              <section aria-label={t("detay.yolculuk.etiket")}>
                <h2>{t("detay.yolculuk.baslik")}</h2>
                <Yolculuk duraklar={duraklar} oran={oran} simdi={simdi} />
              </section>
            )}

            <section>
              <h2>{t("detay.girisCikis.baslik")}</h2>
              <div className={d.iki}>
                <div className={d.kutu}>
                  <small>{t("giris")}</small>
                  <b>{gunUzunYerel(b, gunOku(r.checkIn))}</b>
                  {girisSaati && <span>{t("detay.girisCikis.girisSaati", { saat: girisSaati })}</span>}
                </div>
                <div className={d.kutu}>
                  <small>{t("cikis")}</small>
                  <b>{gunUzunYerel(b, gunOku(r.checkOut))}</b>
                  {cikisSaati && <span>{t("detay.girisCikis.cikisSaati", { saat: cikisSaati })}</span>}
                </div>
              </div>
            </section>

            <section>
              <h2>{t("detay.oda.baslik")}</h2>
              <ul className={d.liste}>
                {(r.roomType || r.boardTypeName) && (
                  <li>
                    <Ikon ad="bed" boyut={22} />
                    <span>
                      <b>{r.roomType ?? t("detay.oda.yedek")}</b>
                      {[r.boardTypeName, tk("gece", { sayi: gece })].filter(Boolean).join(" · ")}
                    </span>
                  </li>
                )}
                {misafir && (
                  <li>
                    <Ikon ad="guests" boyut={22} />
                    <span>
                      <b>{misafir}</b>
                      {r.guests!.map((g) => (g.type === "Child" && g.age !== undefined ? t("detay.oda.cocukYasi", { ad: `${g.name} ${g.surname}`, yas: g.age }) : `${g.name} ${g.surname}`)).join(", ")}
                    </span>
                  </li>
                )}
                {r.notes && (
                  <li>
                    <Ikon ad="info" boyut={22} />
                    <span>
                      <b>{t("detay.oda.ozelIstek")}</b>
                      {r.notes}
                    </span>
                  </li>
                )}
              </ul>
            </section>

            <section>
              <h2>{t("detay.bilgi.baslik")}</h2>
              <dl className={d.tablo}>
                {r.bookingNumber && (
                  <>
                    <dt>{t("rezervasyonNo")}</dt>
                    <dd><Kopyala etiket="" deger={r.bookingNumber} /></dd>
                  </>
                )}
                <dt>{t("detay.bilgi.otelOnayNo")}</dt>
                <dd>{r.hotelConfirmationNumber ?? <span className={s.soluk}>{t("detay.bilgi.onayBekleniyor")}</span>}</dd>
                {r.contactName && (
                  <>
                    <dt>{t("detay.bilgi.iletisim")}</dt>
                    <dd>{[r.contactName, r.contactEmail].filter(Boolean).join(" · ")}</dd>
                  </>
                )}
                {r.contactPhone && (
                  <>
                    <dt>{t("detay.bilgi.telefon")}</dt>
                    <dd>{telefonGizle(r.contactPhone)}</dd>
                  </>
                )}
                <dt>{t("detay.bilgi.tarih")}</dt>
                <dd>{b.gunAyYil(new Date(r.createdAt))}</dd>
              </dl>
            </section>

            {(konum || telefon || eposta) && (
              <section id="konum">
                <h2>{t("detay.konum.baslik")}</h2>
                {konum && (
                  <div className={d.harita}>
                    <KonumHaritasi konum={konum} className={d.haritaIc} yedek={<div className={d.haritaYedek}>{t("detay.konum.haritaYok")}</div>} />
                  </div>
                )}
                <div className={d.haritaAlt}>
                  <div>
                    {yer && <b>{yer}</b>}
                    {otel?.address && otel.address !== yer && <span>{otel.address}</span>}
                  </div>
                  {konum && (
                    <a className={`${s.dugme} ${s.cerceve}`} href={`https://www.google.com/maps/dir/?api=1&destination=${konum.lat},${konum.lng}`} target="_blank" rel="noopener noreferrer">
                      <Ikon ad="pin" boyut={16} kalinlik={2.1} />
                      {t("detay.konum.yolTarifi")}
                    </a>
                  )}
                </div>
                {(telefon || eposta) && (
                  <div className={d.iletisim}>
                    {telefon && (
                      <div>
                        <Ikon ad="phone" boyut={20} />
                        <a href={`tel:${telefon.replace(/\s/g, "")}`}>{telefon}</a>
                      </div>
                    )}
                    {eposta && (
                      <div>
                        <Ikon ad="mail" boyut={20} />
                        <a href={`mailto:${eposta}`}>{eposta}</a>
                      </div>
                    )}
                  </div>
                )}
              </section>
            )}

            {aktif && !bitti && (
              <section id="iptal">
                <h2>{t("detay.kosul.baslik")}</h2>
                {ip.bilgiVar ? (
                  <div className={d.zaman}>
                    {ip.ucretsizSonHer && (
                      <div data-gecti={!ip.ucretsizSon || undefined}>
                        <b>{t("detay.kosul.ucretsizSon", { tarih: gunYonelmeYerel(b, ip.ucretsizSonHer), saat: saatYerel(b, ip.ucretsizSonHer) })}</b>
                        <span>{t("detay.kosul.ucretsiz")}</span>
                      </div>
                    )}
                    {ip.ceza && (
                      <div className={d.ceza}>
                        <b>
                          {ip.ucretsizSonHer
                            ? t("detay.kosul.cezaBaslangic", { tarih: b.gunAyUzun(new Date(ip.ceza.fromDate)), saat: saatYerel(b, new Date(ip.ceza.fromDate)) })
                            : t("detay.kosul.rezervasyondan")}
                        </b>
                        <span>{t("detay.kosul.ceza", { tutar: b.para(ip.ceza.penalty, ip.ceza.penaltyCurrency || r.currency) })}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className={s.soluk}>{t("detay.kosul.yok")}</p>
                )}
                {r.bookingNumber ? (
                  <div className={d.iptalKutu}>
                    <div>
                      <b>{t("detay.kosul.planlar")}</b>
                      <span>
                        {ip.simdiUcret === 0
                          ? t("detay.kosul.simdiUcretsiz")
                          : ip.simdiUcret != null
                            ? t("detay.kosul.simdiUcretli", { tutar: b.para(ip.simdiUcret, ip.ceza?.penaltyCurrency || r.currency) })
                            : t("detay.kosul.simdiBelirsiz")}
                      </span>
                    </div>
                    <button type="button" className={`${s.dugme} ${s.cerceve}`} onClick={() => { setSimdi(Date.now()); setIptalAcik(true); }}>
                      {t("iptalEt")}
                    </button>
                  </div>
                ) : (
                  // Otelden onay (rezervasyon numarası) gelmeden iptal edilecek kayıt yok.
                  <p className={s.soluk}>{t("detay.kosul.onayBekliyor")}</p>
                )}
              </section>
            )}
          </div>

          <aside className={d.sag}>
            <div className={d.ozet}>
              <h3>{t("detay.ozet.baslik")}</h3>
              <div className={d.dokum}>
                <div>
                  <span>{t("detay.ozet.geceBasi", { fiyat: b.para((toplam + indirim) / gece, r.currency), sayi: gece })}</span>
                  <span>{b.para(toplam + indirim, r.currency)}</span>
                </div>
                {indirim > 0 && (
                  <div className={d.yesil}>
                    <span>{t("detay.ozet.indirim")}</span>
                    <span>−{b.para(indirim, r.currency)}</span>
                  </div>
                )}
                <div>
                  <span>{t("detay.ozet.vergiler")}</span>
                  <span>{t("detay.ozet.dahil")}</span>
                </div>
                <div className={d.toplam}>
                  <span>{t("detay.ozet.toplam", { birim: r.currency })}</span>
                  <span className="lb-y">{b.para(toplam, r.currency)}</span>
                </div>
                {r.status === "CANCELLED" && r.cancellationFee != null && (
                  <div>
                    <span>{t("detay.ozet.iptalUcreti")}</span>
                    <span>{b.para(r.cancellationFee, r.cancellationFeeCurrency || r.currency)}</span>
                  </div>
                )}
              </div>
            </div>
            {(bitti || !aktif) && (
              <div className={d.tekrar}>
                <Nesne ad="kartpostal" boyut={64} />
                <div>
                  <b>{t("detay.tekrar.baslik")}</b>
                  <span>{t("detay.tekrar.metin")}</span>
                </div>
                <Link href={`/hotel/${r.hotelCode}`} className={`${s.dugme} ${s.turuncu}`}>{t("tekrarRezervasyon")}</Link>
              </div>
            )}
            <nav className={d.eylemler} aria-label={t("detay.eylem.etiket")}>
              {(telefon || eposta) && (
                <a href="#konum">
                  <Ikon ad="phone" boyut={20} />
                  {t("detay.eylem.otelIletisim")}
                  <Ikon ad="chevron-right" boyut={16} className={d.okIkon} />
                </a>
              )}
              <Link href={`/hotel/${r.hotelCode}`}>
                <Ikon ad="hotel" boyut={20} />
                {t("detay.eylem.otelSayfasi")}
                <Ikon ad="chevron-right" boyut={16} className={d.okIkon} />
              </Link>
              <Link href="/yardim">
                <Ikon ad="help" boyut={20} />
                {t("yardimMerkezi")}
                <Ikon ad="chevron-right" boyut={16} className={d.okIkon} />
              </Link>
            </nav>
          </aside>
        </div>
      </main>
      <AltBilgi />

      <IptalPenceresi
        ceviri
        acik={iptalAcik}
        r={r}
        simdi={simdi}
        onKapat={() => setIptalAcik(false)}
        onIptal={() => {
          istemci.invalidateQueries({ queryKey: ["rezervasyon", id] });
          istemci.invalidateQueries({ queryKey: ["rezervasyonlar"] });
        }}
      />
    </div>
  );
}

function Yolculuk({ duraklar, oran, simdi }: { duraklar: { ad: string; t: Date }[]; oran: number; simdi: number }) {
  const t = useTranslations("rezervasyon");
  const b = useBicim();
  const [o, setO] = React.useState(0);
  React.useEffect(() => {
    const k = requestAnimationFrame(() => setO(oran));
    return () => cancelAnimationFrame(k);
  }, [oran]);
  return (
    <div className={d.yolculuk} style={{ "--o": o, "--n": duraklar.length } as React.CSSProperties}>
      <span className={d.ilerleme} />
      {oran < 1 && <span className={d.bugun}>{t("detay.yolculuk.bugun")}</span>}
      {duraklar.map((x) => {
        const gecti = x.t.getTime() <= simdi;
        return (
          <div key={x.ad} className={d.durak} data-gecti={gecti || undefined}>
            <i>{gecti && <Ikon ad="check" boyut={13} kalinlik={3} />}</i>
            <b>{x.ad}</b>
            <span>{b.gunAyUzun(x.t)}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Acente paneli henüz çevrilmedi: IptalPenceresi orada sabit Türkçe metin ve biçimle açılır. */
const TR_METIN = createTranslator({ locale: "tr", messages: { rezervasyon: trMetinler } as Messages, namespace: "rezervasyon" });
const TR_BICIM = bicimleyici("tr");

export function IptalPenceresi({ acik, r, simdi, onKapat, onIptal, ceviri = false }: {
  acik: boolean;
  r: Rezervasyon;
  simdi: number;
  onKapat: () => void;
  onIptal: () => void;
  /** Metinler geçerli dilde (müşteri sayfası); verilmezse Türkçe (acente paneli). */
  ceviri?: boolean;
}) {
  const tDil = useTranslations("rezervasyon");
  const bDil = useBicim();
  const t = ceviri ? tDil : TR_METIN;
  const b = ceviri ? bDil : TR_BICIM;
  const [asama, setAsama] = React.useState<"soru" | "gidiyor" | "bitti">("soru");
  const [hata, setHata] = React.useState<string | null>(null);
  const [ucret, setUcret] = React.useState<{ tutar: number; para: string } | null>(null);
  const [onceki, setOnceki] = React.useState(acik);
  if (acik !== onceki) {
    setOnceki(acik);
    if (acik && asama !== "bitti") {
      setAsama("soru");
      setHata(null);
    }
  }
  const ip = iptalDurumu(r, simdi);
  const tahmin = ip.simdiUcret;
  const birim = ip.ceza?.penaltyCurrency || r.currency;

  const iptalEt = async () => {
    setAsama("gidiyor");
    setHata(null);
    try {
      const x = await fetch(`/api/reservations/${r.id}/cancel`, { method: "POST" });
      const v = await x.json().catch(() => ({}));
      if (!x.ok) {
        setHata(v.error ?? t("iptal.hata"));
        setAsama("soru");
        return;
      }
      const f = v.cancellation?.cancellationFee ?? v.reservation?.cancellationFee;
      setUcret(f != null ? { tutar: f, para: v.cancellation?.currency || birim } : null);
      setAsama("bitti");
      onIptal();
    } catch {
      setHata(t("baglantiHatasi"));
      setAsama("soru");
    }
  };

  return (
    <Pencere acik={acik} onKapat={onKapat} baslik={t("iptalEt")} genislik={520}>
      {asama === "bitti" ? (
        <div className={d.bitti}>
          <Nesne ad="iptal" boyut={96} />
          <h3 className="lb-y">{t("iptal.bittiBaslik")}</h3>
          <p>{ucret ? (ucret.tutar > 0 ? t("iptal.bittiUcretli", { tutar: b.para(ucret.tutar, ucret.para) }) : t("iptal.bittiUcretsiz")) : t("iptal.bittiIletildi")}</p>
          <button type="button" className={`${s.dugme} ${s.siyah}`} onClick={onKapat}>{t("iptal.tamam")}</button>
        </div>
      ) : (
        <div className={d.iptalIc}>
          <div className={d.ucret} data-cezali={(tahmin ?? 0) > 0 || undefined}>
            <Nesne ad="iptal" boyut={64} />
            <b className="lb-y">{tahmin === 0 ? t("iptal.ucretYok") : tahmin != null ? b.para(tahmin, birim) : t("iptal.ucretBelirsiz")}</b>
            <span>
              {tahmin === 0 && ip.ucretsizSon
                ? t("iptal.ucretsizHak", { tarih: gunYonelmeYerel(b, ip.ucretsizSon) })
                : tahmin != null
                  ? t("iptal.kosulaGore")
                  : t("iptal.otelYanitina")}
            </span>
          </div>
          <p>
            <b>{r.hotelName ?? r.hotelCode}</b> · {aralikYerel(b, r)}
          </p>
          {hata && (
            <div className={d.hata} role="alert">
              <Ikon ad="warning" boyut={20} />
              <span>{hata}</span>
            </div>
          )}
          <div className={d.pencereAlt}>
            <button type="button" className={s.metinDugme} onClick={onKapat}>{t("iptal.vazgec")}</button>
            <button type="button" className={`${s.dugme} ${s.kirmizi}`} onClick={iptalEt} disabled={asama === "gidiyor"}>
              {asama === "gidiyor" ? t("iptal.gidiyor") : t("iptalEt")}
            </button>
          </div>
        </div>
      )}
    </Pencere>
  );
}
