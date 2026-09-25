"use client";

// Yönetim › Bugün: seni bekleyen işler (başvuru, otel onayı, başarısız
// rezervasyon, içerik işi), bu ayın özeti, son 6 ayın satışı (müşteri ve
// acente) ve son rezervasyonlar. Rezervasyona tıklayınca ayrıntı açılır.

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Ikon } from "@/components/lb/ikon";
import { Nesne, type NesneAdi } from "@/components/lb/nesne";
import { AYLAR } from "@/components/lb/arama/durum";
import { AYK, CubukGrafik, DurumRozet, Kaynak, OtelFoto, bugunYazi, eur, getir, neZaman, satisFiyati, sayi, simdiAl, tarihKisa, type YRez } from "./ortak";
import { RezAyrinti } from "./rez-ayrinti";
import s from "./yonetim.module.css";

interface Ozet {
  bekleyen: {
    basvuru: number;
    enEskiBasvuru: string | null;
    otelOnayi: number;
    basarisiz: number;
    icerik: { adim: string; zaman: string; basarili: boolean; ozet: string } | null;
    calisan: string | null;
  };
  ozet: { buAySatis: number; gecenAySatis: number; buAyAdet: number; gecenAyAdet: number; bugunAdet: number; aktifAcente: number; musteri: number; yeniMusteri: number };
  aylar: { ay: string; musteri: number; acente: number }[];
  son: YRez[];
}

const IS_ADI: Record<string, string> = { revizyon: "Değişen oteller", fiyat: "Fiyat veren oteller", listeler: "Listeler", oteller: "Otel listesi", icerik: "Eksik içerik" };
const yon = (a: number, b: number) => (a > b ? "yukari" : a < b ? "asagi" : undefined);

export function Bugun() {
  const [simdi] = React.useState(simdiAl);
  const [secili, setSecili] = React.useState<YRez | null>(null);
  const q = useQuery({ queryKey: ["yonetim", "ozet"], queryFn: () => getir<Ozet>("/api/admin/dashboard"), staleTime: 60_000 });
  const d = q.data;

  const isler: { nesne: NesneAdi; baslik: string; aciklama: string; href: string; acil?: boolean }[] = d
    ? [
        {
          nesne: "anahtar-karti",
          baslik: d.bekleyen.basvuru ? `${d.bekleyen.basvuru} acente başvurusu` : "Bekleyen başvuru yok",
          aciklama: d.bekleyen.enEskiBasvuru ? `En eskisi ${neZaman(d.bekleyen.enEskiBasvuru, simdi).replace(/ \d\d:\d\d$/, "")} geldi` : "Yeni başvuru gelince burada görünür",
          href: "/admin/agencies",
          acil: d.bekleyen.basvuru > 0,
        },
        {
          nesne: "bavul",
          baslik: d.bekleyen.otelOnayi ? `${d.bekleyen.otelOnayi} rezervasyon otel onayında` : "Otel onayı bekleyen yok",
          aciklama: "Etscore onaylayınca kendiliğinden düşer",
          href: "/admin/reservations?durum=PENDING",
        },
        {
          nesne: "iptal",
          baslik: d.bekleyen.basarisiz ? `${d.bekleyen.basarisiz} başarısız rezervasyon` : "Başarısız rezervasyon yok",
          aciklama: d.bekleyen.basarisiz ? "Son 14 gün · müşteriye dönüş yapılmalı" : "Son 14 günde tedarikçi hatası yok",
          href: "/admin/reservations?durum=FAILED",
          acil: d.bekleyen.basarisiz > 0,
        },
        {
          nesne: "sehir",
          baslik: d.bekleyen.calisan
            ? `${IS_ADI[d.bekleyen.calisan] ?? d.bekleyen.calisan} çalışıyor`
            : !d.bekleyen.icerik
              ? "İçerik işi henüz kaydedilmedi"
              : d.bekleyen.icerik.basarili ? "İçerik senkronu sağlıklı" : "İçerik işi başarısız",
          aciklama: d.bekleyen.icerik
            ? `${IS_ADI[d.bekleyen.icerik.adim] ?? d.bekleyen.icerik.adim} · ${neZaman(d.bekleyen.icerik.zaman, simdi)}`
            : "İlk çalışmadan sonra durum burada görünür",
          href: "/admin/content",
          acil: !!d.bekleyen.icerik && !d.bekleyen.icerik.basarili,
        },
      ]
    : [];

  return (
    <div className={s.dis}>
      <div className={s.selam}>
        <h1 className="lb-y">{new Date(simdi).getHours() < 12 ? "Günaydın" : new Date(simdi).getHours() < 18 ? "İyi günler" : "İyi akşamlar"}</h1>
        <p>{bugunYazi(new Date(simdi))}{d ? ` · bugün ${d.ozet.bugunAdet} yeni rezervasyon` : ""}</p>
      </div>

      {q.isError ? (
        <div className={s.bos} style={{ marginTop: 24 }}>
          <Nesne ad="zil" boyut={72} />
          <b>Özet şu an alınamadı</b>
          <button type="button" className={`${s.dugme} ${s.siyah}`} onClick={() => q.refetch()}>Tekrar dene</button>
        </div>
      ) : !d ? (
        <>
          <h2 className={s.bolum}>Seni bekleyenler</h2>
          <div className={`${s.iskelet} ${s.iskeletKisa}`} aria-busy="true" />
          <div className={s.iskelet} style={{ marginTop: 16 }} />
        </>
      ) : (
        <>
          <h2 className={s.bolum}>Seni bekleyenler</h2>
          <div className={s.isler}>
            {isler.map((i) => (
              <Link key={i.href} className={s.is} href={i.href} data-acil={i.acil || undefined}>
                <Nesne ad={i.nesne} boyut={56} />
                <div>
                  <b>{i.baslik}</b>
                  <span>{i.aciklama}</span>
                </div>
                <Ikon ad="chevron-right" boyut={18} />
              </Link>
            ))}
          </div>

          <div className={s.kpiler}>
            <div className={s.kpi}>
              <span>Bu ay satış</span>
              <b className="lb-y">{eur(d.ozet.buAySatis)}</b>
              <small data-yon={yon(d.ozet.buAySatis, d.ozet.gecenAySatis)}>Geçen ay {eur(d.ozet.gecenAySatis)}</small>
            </div>
            <div className={s.kpi}>
              <span>Bu ay rezervasyon</span>
              <b className="lb-y">{sayi(d.ozet.buAyAdet)}</b>
              <small data-yon={yon(d.ozet.buAyAdet, d.ozet.gecenAyAdet)}>Geçen ay {sayi(d.ozet.gecenAyAdet)}</small>
            </div>
            <div className={s.kpi}>
              <span>Aktif acente</span>
              <b className="lb-y">{sayi(d.ozet.aktifAcente)}</b>
              <small>{d.bekleyen.basvuru ? `${d.bekleyen.basvuru} başvuru bekliyor` : "Bekleyen başvuru yok"}</small>
            </div>
            <div className={s.kpi}>
              <span>Kayıtlı müşteri</span>
              <b className="lb-y">{sayi(d.ozet.musteri)}</b>
              <small data-yon={d.ozet.yeniMusteri ? "yukari" : undefined}>Bu ay +{sayi(d.ozet.yeniMusteri)}</small>
            </div>
          </div>

          <div className={s.ikiKolon}>
            <section className={s.kutu} aria-labelledby="satis-baslik">
              <div className={s.bolumBas}>
                <h2 id="satis-baslik">Son 6 ay satış</h2>
                <div className={s.lejant}><span><i />Müşteri</span><span><i data-acente />Acente</span></div>
              </div>
              <CubukGrafik
                etiket="Son 6 ayın satışı, müşteri ve acente"
                soluk
                cubuklar={d.aylar.map((a, i) => {
                  const ay = Number(a.ay.slice(5)) - 1;
                  return {
                    etiket: AYK[ay],
                    ipucu: `${AYLAR[ay]}: müşteri ${eur(a.musteri)} · acente ${eur(a.acente)}`,
                    vurgu: i === d.aylar.length - 1,
                    dilimler: [{ deger: a.musteri, renk: "var(--lb-yazi)" }, { deger: a.acente, renk: "#b9c9e2" }],
                  };
                })}
              />
            </section>
            <section className={s.kutu} aria-labelledby="son-baslik">
              <div className={s.bolumBas}>
                <h2 id="son-baslik">Son rezervasyonlar</h2>
                <Link className={s.metinDugme} href="/admin/reservations">Tümü</Link>
              </div>
              {d.son.length ? (
                <div className={s.sonlar}>
                  {d.son.map((r) => (
                    <button key={r.id} type="button" className={s.son} onClick={() => setSecili(r)}>
                      <OtelFoto src={r.hotel?.image} />
                      <div>
                        <b>{r.contactName || r.user?.name || "Misafir"}</b>
                        <span>{r.hotelName ?? r.hotelCode} · {tarihKisa(r.checkIn)}</span>
                      </div>
                      <Kaynak r={r} />
                      <span className={s.tutar}>{eur(satisFiyati(r))}</span>
                      <DurumRozet durum={r.status} />
                    </button>
                  ))}
                </div>
              ) : (
                <p className={s.soluk}>Henüz rezervasyon yok.</p>
              )}
            </section>
          </div>
        </>
      )}
      <RezAyrinti r={secili} onKapat={() => setSecili(null)} />
    </div>
  );
}
