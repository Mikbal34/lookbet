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
import { UstCubuk } from "@/components/lb/ust-cubuk";
import { AltBilgi } from "@/components/lb/alt-bilgi";
import { Ikon } from "@/components/lb/ikon";
import { Nesne } from "@/components/lb/nesne";
import { Pencere } from "@/components/lb/pencere";
import { BOS_ARAMA, aramaAdresi } from "@/components/lb/arama/durum";
import { para } from "@/components/otel-detay/yardimci";
import type { HotelDetailResponse } from "@/lib/royal-api/types";
import { Kopyala } from "./rezervasyonlar";
import {
  aralik, durumBilgisi, geceler, gunKisa, gunOku, gunUzun, gunYonelme, iptalDurumu, kalanGun, misafirYazi, saat, telefonGizle, tutar,
  type Rezervasyon,
} from "./ortak";
import s from "./rezervasyonlar.module.css";
import d from "./rezervasyon-detay.module.css";

const KonumHaritasi = dynamic(() => import("@/components/otel-detay/konum-haritasi").then((m) => m.KonumHaritasi), {
  ssr: false,
  loading: () => <div className={d.haritaYedek}>Harita yükleniyor…</div>,
});

type OtelVerisi = Partial<HotelDetailResponse> & { location?: { name: string; parent?: { name: string } | null } | null };
const simdiAl = () => Date.now();

export function RezervasyonDetay({ id }: { id: string }) {
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
        <main className={s.dis} aria-busy="true" aria-label="Rezervasyon yükleniyor">
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
          <h1 className="lb-y">{yok ? "Bu rezervasyonu bulamadık" : "Rezervasyon şu an alınamadı"}</h1>
          <p>{yok ? "Bağlantı eski olabilir ya da rezervasyon başka bir hesaba ait." : "Birazdan tekrar dene."}</p>
          <Link href="/reservations" className={`${s.dugme} ${s.siyah}`}>Rezervasyonlarım</Link>
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
  const misafir = misafirYazi(r);
  const yer = [otel?.location?.name, otel?.location?.parent?.name].filter(Boolean).join(", ") || r.hotel?.city || "";
  const fotolar = [...new Set([...(otel?.images ?? []).sort((a, b) => Number(b.isMain) - Number(a.isMain)).map((i) => i.url), ...(r.hotel?.image ? [r.hotel.image] : [])])].slice(0, 3);
  const konum = otel?.latitude && otel?.longitude ? { lat: otel.latitude, lng: otel.longitude } : null;
  const telefon = otel?.phone || r.hotel?.phone || null;
  const eposta = otel?.email || null;
  const girisSaati = otel?.policies?.checkInFrom;
  const cikisSaati = otel?.policies?.checkOutUntil;

  // Yolculuk çizelgesi: tarihli duraklar ve bugünün konumu (0–1).
  const duraklar: { ad: string; t: Date }[] = [
    { ad: "Rezervasyon", t: new Date(r.createdAt) },
    ...(ip.ucretsizSonHer && ip.ucretsizSonHer.getTime() > Date.parse(r.createdAt) && ip.ucretsizSonHer < gunOku(r.checkIn) ? [{ ad: "Ücretsiz iptal son gün", t: ip.ucretsizSonHer }] : []),
    { ad: "Giriş", t: gunOku(r.checkIn) },
    { ad: "Çıkış", t: gunOku(r.checkOut) },
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
          Rezervasyonlarım
        </Link>
        <div className={d.bas}>
          <div>
            <span className={s.rozet} data-renk={durum.renk}>{durum.ad}</span>
            <h1 className="lb-y">{r.hotelName ?? r.hotelCode}</h1>
            <p>{[r.hotel?.stars ? `${r.hotel.stars} yıldızlı` : null, yer || null, aralik(r)].filter(Boolean).join(" · ")}</p>
          </div>
          {aktif && !bitti && (
            <p className={d.kalan}>{kalan > 0 ? <><b className="lb-y">{kalan} gün</b> kaldı</> : <b className="lb-y">{kalan === 0 ? "Giriş bugün" : "Konaklaman sürüyor"}</b>}</p>
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
                    <b>{r.status === "CANCELLED" ? "Bu rezervasyon iptal edildi" : "Bu rezervasyon tamamlanamadı"}</b>
                    <span>
                      {r.status === "CANCELLED"
                        ? r.cancellationFee != null
                          ? `İptal ücreti ${para(r.cancellationFee, r.cancellationFeeCurrency || r.currency)}.`
                          : "İptal ücreti bilgisi otelden gelmedi."
                        : "Otel rezervasyonu onaylamadı; ücret alınmadı."}
                    </span>
                  </div>
                </div>
              </section>
            ) : (
              <section aria-label="Konaklama çizelgesi">
                <h2>Yolculuğun</h2>
                <Yolculuk duraklar={duraklar} oran={oran} simdi={simdi} />
              </section>
            )}

            <section>
              <h2>Giriş ve çıkış</h2>
              <div className={d.iki}>
                <div className={d.kutu}>
                  <small>Giriş</small>
                  <b>{gunUzun(gunOku(r.checkIn))}</b>
                  {girisSaati && <span>{girisSaati} ve sonrası</span>}
                </div>
                <div className={d.kutu}>
                  <small>Çıkış</small>
                  <b>{gunUzun(gunOku(r.checkOut))}</b>
                  {cikisSaati && <span>En geç {cikisSaati}</span>}
                </div>
              </div>
            </section>

            <section>
              <h2>Oda ve misafirler</h2>
              <ul className={d.liste}>
                {(r.roomType || r.boardTypeName) && (
                  <li>
                    <Ikon ad="bed" boyut={22} />
                    <span>
                      <b>{r.roomType ?? "Oda"}</b>
                      {[r.boardTypeName, `${gece} gece`].filter(Boolean).join(" · ")}
                    </span>
                  </li>
                )}
                {misafir && (
                  <li>
                    <Ikon ad="guests" boyut={22} />
                    <span>
                      <b>{misafir}</b>
                      {r.guests!.map((g) => `${g.name} ${g.surname}${g.type === "Child" && g.age !== undefined ? ` (${g.age} yaş)` : ""}`).join(", ")}
                    </span>
                  </li>
                )}
                {r.notes && (
                  <li>
                    <Ikon ad="info" boyut={22} />
                    <span>
                      <b>Özel istek</b>
                      {r.notes}
                    </span>
                  </li>
                )}
              </ul>
            </section>

            <section>
              <h2>Rezervasyon bilgileri</h2>
              <dl className={d.tablo}>
                {r.bookingNumber && (
                  <>
                    <dt>Rezervasyon no</dt>
                    <dd><Kopyala etiket="" deger={r.bookingNumber} /></dd>
                  </>
                )}
                <dt>Otel onay no</dt>
                <dd>{r.hotelConfirmationNumber ?? <span className={s.soluk}>Otel onaylayınca burada görünür</span>}</dd>
                {r.contactName && (
                  <>
                    <dt>İletişim</dt>
                    <dd>{[r.contactName, r.contactEmail].filter(Boolean).join(" · ")}</dd>
                  </>
                )}
                {r.contactPhone && (
                  <>
                    <dt>Telefon</dt>
                    <dd>{telefonGizle(r.contactPhone)}</dd>
                  </>
                )}
                <dt>Rezervasyon tarihi</dt>
                <dd>{new Date(r.createdAt).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}</dd>
              </dl>
            </section>

            {(konum || telefon || eposta) && (
              <section id="konum">
                <h2>Konum ve iletişim</h2>
                {konum && (
                  <div className={d.harita}>
                    <KonumHaritasi konum={konum} className={d.haritaIc} yedek={<div className={d.haritaYedek}>Harita şu an gösterilemiyor.</div>} />
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
                      Yol tarifi al
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
                <h2>İptal koşulları</h2>
                {ip.bilgiVar ? (
                  <div className={d.zaman}>
                    {ip.ucretsizSonHer && (
                      <div data-gecti={!ip.ucretsizSon || undefined}>
                        <b>{gunYonelme(ip.ucretsizSonHer)} kadar (saat {saat(ip.ucretsizSonHer)})</b>
                        <span>Ücretsiz iptal</span>
                      </div>
                    )}
                    {ip.ceza && (
                      <div className={d.ceza}>
                        <b>{ip.ucretsizSonHer ? `${gunKisa(new Date(ip.ceza.fromDate))}, saat ${saat(new Date(ip.ceza.fromDate))} ve sonrası` : "Rezervasyondan itibaren"}</b>
                        <span>İptal ücreti {para(ip.ceza.penalty, ip.ceza.penaltyCurrency || r.currency)}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className={s.soluk}>İptal koşulları bu rezervasyon için kayıtlı değil; iptal ederken otelin koşulları uygulanır.</p>
                )}
                <div className={d.iptalKutu}>
                  <div>
                    <b>Planların mı değişti?</b>
                    <span>
                      {ip.simdiUcret === 0
                        ? "Şu an iptal edersen ücret alınmaz."
                        : ip.simdiUcret != null
                          ? `Şu an iptal edersen ${para(ip.simdiUcret, ip.ceza?.penaltyCurrency || r.currency)} iptal ücreti kesilir.`
                          : "İptal ücreti otelin koşullarına göre belirlenir."}
                    </span>
                  </div>
                  <button type="button" className={`${s.dugme} ${s.cerceve}`} onClick={() => { setSimdi(Date.now()); setIptalAcik(true); }}>
                    Rezervasyonu iptal et
                  </button>
                </div>
              </section>
            )}
          </div>

          <aside className={d.sag}>
            <div className={d.ozet}>
              <h3>Ödeme özeti</h3>
              <div className={d.dokum}>
                <div>
                  <span>{para((toplam + indirim) / gece, r.currency)} × {gece} gece</span>
                  <span>{para(toplam + indirim, r.currency)}</span>
                </div>
                {indirim > 0 && (
                  <div className={d.yesil}>
                    <span>İndirim</span>
                    <span>−{para(indirim, r.currency)}</span>
                  </div>
                )}
                <div>
                  <span>Vergiler ve ücretler</span>
                  <span>Dahil</span>
                </div>
                <div className={d.toplam}>
                  <span>Toplam ({r.currency})</span>
                  <span className="lb-y">{para(toplam, r.currency)}</span>
                </div>
                {r.status === "CANCELLED" && r.cancellationFee != null && (
                  <div>
                    <span>İptal ücreti</span>
                    <span>{para(r.cancellationFee, r.cancellationFeeCurrency || r.currency)}</span>
                  </div>
                )}
              </div>
            </div>
            {(bitti || !aktif) && (
              <div className={d.tekrar}>
                <Nesne ad="kartpostal" boyut={64} />
                <div>
                  <b>Yine gitmek ister misin?</b>
                  <span>Aynı otel, yeni tarihler.</span>
                </div>
                <Link href={`/hotel/${r.hotelCode}`} className={`${s.dugme} ${s.turuncu}`}>Tekrar rezervasyon yap</Link>
              </div>
            )}
            <nav className={d.eylemler} aria-label="Rezervasyon işlemleri">
              {(telefon || eposta) && (
                <a href="#konum">
                  <Ikon ad="phone" boyut={20} />
                  Otelle iletişime geç
                  <Ikon ad="chevron-right" boyut={16} className={d.okIkon} />
                </a>
              )}
              <Link href={`/hotel/${r.hotelCode}`}>
                <Ikon ad="hotel" boyut={20} />
                Otel sayfası
                <Ikon ad="chevron-right" boyut={16} className={d.okIkon} />
              </Link>
              <Link href="/yardim">
                <Ikon ad="help" boyut={20} />
                Yardım merkezi
                <Ikon ad="chevron-right" boyut={16} className={d.okIkon} />
              </Link>
            </nav>
          </aside>
        </div>
      </main>
      <AltBilgi />

      <IptalPenceresi
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
  const [o, setO] = React.useState(0);
  React.useEffect(() => {
    const k = requestAnimationFrame(() => setO(oran));
    return () => cancelAnimationFrame(k);
  }, [oran]);
  return (
    <div className={d.yolculuk} style={{ "--o": o, "--n": duraklar.length } as React.CSSProperties}>
      <span className={d.ilerleme} />
      {oran < 1 && <span className={d.bugun}>Bugün</span>}
      {duraklar.map((x) => {
        const gecti = x.t.getTime() <= simdi;
        return (
          <div key={x.ad} className={d.durak} data-gecti={gecti || undefined}>
            <i>{gecti && <Ikon ad="check" boyut={13} kalinlik={3} />}</i>
            <b>{x.ad}</b>
            <span>{gunKisa(x.t)}</span>
          </div>
        );
      })}
    </div>
  );
}

export function IptalPenceresi({ acik, r, simdi, onKapat, onIptal }: {
  acik: boolean;
  r: Rezervasyon;
  simdi: number;
  onKapat: () => void;
  onIptal: () => void;
}) {
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
        setHata(v.error ?? "Rezervasyon iptal edilemedi");
        setAsama("soru");
        return;
      }
      const f = v.cancellation?.cancellationFee ?? v.reservation?.cancellationFee;
      setUcret(f != null ? { tutar: f, para: v.cancellation?.currency || birim } : null);
      setAsama("bitti");
      onIptal();
    } catch {
      setHata("Bağlantıda bir sorun oldu; birazdan tekrar dene.");
      setAsama("soru");
    }
  };

  return (
    <Pencere acik={acik} onKapat={onKapat} baslik="Rezervasyonu iptal et" genislik={520}>
      {asama === "bitti" ? (
        <div className={d.bitti}>
          <Nesne ad="iptal" boyut={96} />
          <h3 className="lb-y">Rezervasyonun iptal edildi</h3>
          <p>{ucret ? (ucret.tutar > 0 ? `İptal ücreti: ${para(ucret.tutar, ucret.para)}.` : "İptal ücreti alınmadı.") : "İptal otele iletildi."} Onay e-posta adresine gönderilecek.</p>
          <button type="button" className={`${s.dugme} ${s.siyah}`} onClick={onKapat}>Tamam</button>
        </div>
      ) : (
        <div className={d.iptalIc}>
          <div className={d.ucret} data-cezali={(tahmin ?? 0) > 0 || undefined}>
            <Nesne ad="iptal" boyut={64} />
            <b className="lb-y">{tahmin === 0 ? "Ücret yok" : tahmin != null ? para(tahmin, birim) : "Ücret otelin koşullarına göre"}</b>
            <span>
              {tahmin === 0 && ip.ucretsizSon
                ? `${gunYonelme(ip.ucretsizSon)} kadar ücretsiz iptal hakkın var.`
                : tahmin != null
                  ? "Bu tutar, rezervasyondaki iptal koşullarına göre kesilir."
                  : "İptal ücreti otelden gelen yanıta göre kesinleşir."}
            </span>
          </div>
          <p>
            <b>{r.hotelName ?? r.hotelCode}</b> · {aralik(r)}
          </p>
          {hata && (
            <div className={d.hata} role="alert">
              <Ikon ad="warning" boyut={20} />
              <span>{hata}</span>
            </div>
          )}
          <div className={d.pencereAlt}>
            <button type="button" className={s.metinDugme} onClick={onKapat}>Vazgeç</button>
            <button type="button" className={`${s.dugme} ${s.kirmizi}`} onClick={iptalEt} disabled={asama === "gidiyor"}>
              {asama === "gidiyor" ? "İptal ediliyor…" : "Rezervasyonu iptal et"}
            </button>
          </div>
        </div>
      )}
    </Pencere>
  );
}
