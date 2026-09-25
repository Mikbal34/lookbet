"use client";
/* eslint-disable @next/next/no-img-element -- otel görseli dış kaynaklı (tedarikçi) */

// Yönetim › rezervasyon ayrıntısı: otel, tarihler, kaynak, iletişim,
// misafirler ve fiyatın oluşumu (Etscore net fiyatı → uygulanan kural →
// satış fiyatı → acente komisyonu). Belge müşteri sayfasında açılır; iptal
// müşteri tarafıyla aynı pencereden gerçek iptal servisine gider.

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Pencere } from "@/components/lb/pencere";
import { IptalPenceresi } from "@/components/rezervasyonlar/rezervasyon-detay";
import { geceler, gunOku, gunUzun, komisyonTutari } from "@/components/rezervasyonlar/ortak";
import { DurumRozet, eur, satisFiyati, simdiAl, tarihUzun, saatYazi, useBildiri, type YRez } from "./ortak";
import s from "./yonetim.module.css";

export function RezAyrinti({ r, onKapat }: { r: YRez | null; onKapat: () => void }) {
  const [son, setSon] = React.useState(r);
  if (r && r !== son) setSon(r);
  const x = r ?? son;
  const [iptal, setIptal] = React.useState(false);
  const [simdi] = React.useState(simdiAl);
  const istemci = useQueryClient();
  const bildiri = useBildiri();

  return (
    <>
      <Pencere acik={!!r} onKapat={onKapat} baslik={x?.bookingNumber ?? "Rezervasyon"} genislik={620}>
        {x && <Icerik r={x} onIptal={() => setIptal(true)} />}
      </Pencere>
      {x && (
        <IptalPenceresi
          acik={iptal}
          r={x}
          simdi={simdi}
          onKapat={() => setIptal(false)}
          onIptal={() => {
            istemci.invalidateQueries({ queryKey: ["yonetim"] });
            bildiri("Rezervasyon iptal edildi");
            onKapat();
          }}
        />
      )}
    </>
  );
}

function Icerik({ r, onIptal }: { r: YRez; onIptal: () => void }) {
  const satis = satisFiyati(r);
  const kurallar = Array.isArray(r.appliedPriceRules) ? r.appliedPriceRules : [];
  const komisyon = r.agency ? komisyonTutari(r, r.agency.commission ?? 0) : null;
  const misafirler = Array.isArray(r.guests) ? r.guests : [];
  return (
    <div className={s.pIc}>
      {r.hotel?.image ? (
        <div className={s.pFoto}>
          <img src={r.hotel.image} alt="" />
          <DurumRozet durum={r.status} />
        </div>
      ) : (
        <div><DurumRozet durum={r.status} /></div>
      )}
      <h3 className="lb-y">{r.contactName || r.user?.name || "Misafir"}</h3>
      <p>{[r.hotelName ?? r.hotelCode, r.hotel?.place, `otel kodu ${r.hotelCode}`].filter(Boolean).join(" · ")}</p>
      <div className={s.kutular}>
        <div className={s.kutucuk}><small>Giriş</small><b>{gunUzun(gunOku(r.checkIn))}</b></div>
        <div className={s.kutucuk}><small>Çıkış</small><b>{gunUzun(gunOku(r.checkOut))} · {geceler(r)} gece</b></div>
        <div className={s.kutucuk}>
          <small>Kaynak</small>
          <b>{r.agency?.companyName ?? "Müşteri (web)"}</b>
          {r.user && <span>{r.user.name} · {r.user.email}</span>}
        </div>
        <div className={s.kutucuk}>
          <small>İletişim</small>
          <b>{r.contactEmail ?? "—"}</b>
          {r.contactPhone && <span>{r.contactPhone}</span>}
        </div>
        <div className={s.kutucuk}><small>Oda ve pansiyon</small><b>{r.roomType ?? "—"}</b><span>{r.boardTypeName ?? r.boardType ?? ""}</span></div>
        <div className={s.kutucuk}>
          <small>Misafirler</small>
          <b>{misafirler.length ? misafirler.map((m) => `${m.name} ${m.surname}`).join(", ") : "—"}</b>
        </div>
      </div>
      <div>
        <span className={s.pEtiket}>Fiyat</span>
        <div className={s.dokum}>
          <div><span>Etscore net fiyatı</span><b>{eur(r.totalPrice, true)}</b></div>
          {kurallar.map((k, i) => (
            <div key={i}>
              <span>{k.name}</span>
              <b>{k.discountAmount > 0 ? "−" : "+"}{eur(Math.abs(k.discountAmount), true)}</b>
            </div>
          ))}
          <div data-toplam><span>Satış fiyatı</span><b>{eur(satis, true)}</b></div>
          {r.agency && (
            <div>
              <span>Acente komisyonu{komisyon?.kayitli ? "" : ` %${r.agency.commission ?? 0} (anlaşma, tahmini)`}</span>
              <b>{komisyon ? eur(komisyon.tutar, true) : "—"}</b>
            </div>
          )}
        </div>
      </div>
      {r.notes && <p className={s.mesaj}><b>Özel istek:</b> {r.notes}</p>}
      <p className={s.not}>
        Oluşturuldu {tarihUzun(r.createdAt)} {saatYazi(r.createdAt)}
        {r.hotelConfirmationNumber ? ` · otel onay no ${r.hotelConfirmationNumber}` : ""}
      </p>
      <div className={s.pAlt}>
        {r.status === "CONFIRMED" && (
          <button type="button" className={`${s.dugme} ${s.cerceve} ${s.solda}`} onClick={onIptal}>İptal et</button>
        )}
        <a className={`${s.dugme} ${s.siyah}`} href={`/reservations/${r.id}`} target="_blank" rel="noopener">Rezervasyon belgesi</a>
      </div>
    </div>
  );
}
