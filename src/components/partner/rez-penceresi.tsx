"use client";
/* eslint-disable @next/next/no-img-element -- otel görseli dış kaynaklı (tedarikçi) */

// Acentenin rezervasyon ayrıntısı: misafir, otel, tarihler, tutar ve
// komisyon, durum ve iptal koşulu. "Rezervasyon belgesi" rezervasyon sayfasını
// yeni sekmede açar (müşteriye iletmek için); iptal, müşteri tarafıyla aynı
// pencereden gerçek iptal servisine gider.

import * as React from "react";
import Link from "next/link";
import { Ikon } from "@/components/lb/ikon";
import { Nesne } from "@/components/lb/nesne";
import { Pencere } from "@/components/lb/pencere";
import { para } from "@/components/otel-detay/yardimci";
import { IptalPenceresi } from "@/components/rezervasyonlar/rezervasyon-detay";
import {
  aralik, durumBilgisi, geceler, gunKisa, gunOku, gunUzun, gunYonelme, iptalDurumu, komisyonTutari, saat, tutar, type Rezervasyon,
} from "@/components/rezervasyonlar/ortak";
import { grup, misafirAdi } from "./ortak";
import s from "./partner.module.css";

export function RezPenceresi({ r, simdi, oran, onKapat, onIptal }: {
  r: Rezervasyon | null;
  simdi: number;
  /** Anlaşmadaki komisyon oranı (%). */
  oran: number | null;
  onKapat: () => void;
  onIptal: () => void;
}) {
  const [iptalAcik, setIptalAcik] = React.useState(false);
  // Pencere kapanırken içerik bir an daha görünsün diye son rezervasyonu tut.
  const [son, setSon] = React.useState(r);
  if (r && r !== son) setSon(r);
  const x = r ?? son;

  return (
    <>
      <Pencere acik={!!r} onKapat={onKapat} baslik="Rezervasyon" genislik={560}>
        {x && <Icerik r={x} simdi={simdi} oran={oran} onIptalAc={() => setIptalAcik(true)} />}
      </Pencere>
      {x && (
        <IptalPenceresi
          acik={iptalAcik}
          r={x}
          simdi={simdi}
          onKapat={() => setIptalAcik(false)}
          onIptal={() => {
            onIptal();
          }}
        />
      )}
    </>
  );
}

function Icerik({ r, simdi, oran, onIptalAc }: { r: Rezervasyon; simdi: number; oran: number | null; onIptalAc: () => void }) {
  const d = durumBilgisi(r, simdi);
  const g = grup(r, simdi);
  const ip = iptalDurumu(r, simdi);
  const t = tutar(r);
  const iptalEdilebilir = (r.status === "CONFIRMED" || r.status === "PENDING") && g !== "tamam";
  const komisyon = komisyonTutari(r, oran);

  return (
    <div className={s.pIc}>
      <div className={s.pFoto}>
        {r.hotel?.image ? <img src={r.hotel.image} alt="" /> : <Nesne ad="zil" boyut={64} />}
        <span className={s.rozet} data-renk={d.renk}>{d.ad}</span>
      </div>
      <div className={s.pBas}>
        <span>{[r.hotelName ?? r.hotelCode, r.hotel?.place].filter(Boolean).join(" · ")}</span>
        <h3 className="lb-y">{misafirAdi(r)}</h3>
        <p>{aralik(r)} · {geceler(r)} gece{r.roomType ? ` · ${r.roomType}` : ""}</p>
      </div>
      <div className={s.iki}>
        <div className={s.kutu}><small>Giriş</small><b>{gunUzun(gunOku(r.checkIn))}</b></div>
        <div className={s.kutu}><small>Çıkış</small><b>{gunUzun(gunOku(r.checkOut))}</b></div>
      </div>
      <div className={s.dokum}>
        <div><span>Tutar</span><span>{para(t, r.currency)}</span></div>
        {komisyon && <div><span>Komisyonun{komisyon.kayitli ? "" : ` (%${oran}, tahmini)`}</span><span>{para(komisyon.tutar, r.currency)}</span></div>}
        {r.status === "CANCELLED" && r.cancellationFee != null && (
          <div><span>İptal ücreti</span><span>{r.cancellationFee > 0 ? para(r.cancellationFee, r.cancellationFeeCurrency || r.currency) : "Alınmadı"}</span></div>
        )}
        <div className={s.toplam}><span>Rezervasyon no</span><span>{r.bookingNumber ?? "—"}</span></div>
        {r.hotelConfirmationNumber && <div><span>Otel onay no</span><span>{r.hotelConfirmationNumber}</span></div>}
      </div>

      {r.status === "PENDING" && (
        <p className={s.durumNot} data-renk="sari">
          <Ikon ad="clock" boyut={18} />
          Otel henüz onaylamadı. Onaylanınca durum burada güncellenir; onaylanmazsa ücret alınmaz.
        </p>
      )}
      {iptalEdilebilir && ip.bilgiVar && (
        <p className={s.durumNot} data-renk={ip.ucretsizSon ? "yesil" : "gri"}>
          <Ikon ad={ip.ucretsizSon ? "free-cancel" : "info"} boyut={18} />
          {ip.ucretsizSon
            ? `${gunYonelme(ip.ucretsizSon)} kadar (saat ${saat(ip.ucretsizSon)}) ücretsiz iptal.`
            : ip.ceza
              ? `Ücretsiz iptal süresi geçti; iptal ücreti ${para(ip.ceza.penalty, ip.ceza.penaltyCurrency || r.currency)}.`
              : "İptal koşulları rezervasyonda."}
        </p>
      )}
      {r.status === "CANCELLED" && (
        <p className={s.durumNot} data-renk="kirmizi">
          <Ikon ad="info" boyut={18} />
          {gunKisa(new Date(r.cancelledAt ?? r.updatedAt))} tarihinde iptal edildi.
        </p>
      )}

      <div className={s.pAlt}>
        <Link href={`/reservations/${r.id}`} target="_blank" className={`${s.dugme} ${s.siyah}`}>
          <Ikon ad="document" boyut={16} kalinlik={2.1} />
          Rezervasyon belgesi
        </Link>
        {iptalEdilebilir && (
          <button type="button" className={`${s.dugme} ${s.cerceve}`} onClick={onIptalAc}>Rezervasyonu iptal et</button>
        )}
      </div>
    </div>
  );
}
