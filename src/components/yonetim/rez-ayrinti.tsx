"use client";
/* eslint-disable @next/next/no-img-element -- otel görseli dış kaynaklı (tedarikçi) */

// Yönetim › rezervasyon ayrıntısı: otel, tarihler, kaynak, iletişim,
// misafirler ve fiyatın oluşumu (Etscore net fiyatı → uygulanan kural →
// satış fiyatı → acente komisyonu). Belge müşteri sayfasında açılır; iptal
// müşteri tarafıyla aynı servise (/api/reservations/:id/cancel, tedarikçide
// gerçek iptal) gider, pencere yönetici diliyle (müşterinin "Rezervasyonun
// iptal edildi", "iptal hakkın var" metinleri değil).

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencere } from "@/components/lb/pencere";
import { para } from "@/components/otel-detay/yardimci";
import { aralik, geceler, gunOku, gunUzun, gunYonelme, iptalDurumu, komisyonTutari } from "@/components/rezervasyonlar/ortak";
import { DurumRozet, HataYazi, eur, gonder, satisFiyati, simdiAl, tarihUzun, saatYazi, useBildiri, type YRez } from "./ortak";
import s from "./yonetim.module.css";

export function RezAyrinti({ r, onKapat }: { r: YRez | null; onKapat: () => void }) {
  const [son, setSon] = React.useState(r);
  if (r && r !== son) setSon(r);
  const x = r ?? son;
  const [iptal, setIptal] = React.useState(false);
  const istemci = useQueryClient();
  const bildiri = useBildiri();

  return (
    <>
      <Pencere acik={!!r} onKapat={onKapat} baslik={x?.bookingNumber ?? "Rezervasyon"} genislik={620}>
        {x && <Icerik r={x} onIptal={() => setIptal(true)} />}
      </Pencere>
      {x && (
        // Rezervasyon başına ayrı durum: birini iptal edince sonrakinde "iptal edildi" kalmasın.
        <IptalOnayi
          key={x.id}
          acik={iptal}
          r={x}
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

interface IptalYaniti {
  reservation?: { cancellationFee?: number | null };
  cancellation?: { cancellationFee?: number | null; currency?: string | null };
}

/** İptal onayı ve sonucu (yönetici dili); ücret tahmini rezervasyondaki iptal koşullarından. */
function IptalOnayi({ acik, r, onKapat, onIptal }: { acik: boolean; r: YRez; onKapat: () => void; onIptal: () => void }) {
  const [simdi] = React.useState(simdiAl);
  const iptal = useMutation({
    mutationFn: () => gonder<IptalYaniti>(`/api/reservations/${r.id}/cancel`, "POST"),
    onSuccess: onIptal,
  });
  const ip = iptalDurumu(r, simdi);
  const tahmin = ip.simdiUcret;
  const birim = ip.ceza?.penaltyCurrency || r.currency;
  const kesilen = iptal.data?.cancellation?.cancellationFee ?? iptal.data?.reservation?.cancellationFee ?? null;
  // Hata kalmasın: yeniden açılınca soru temiz başlasın (sürerken ya da bittiyse dokunma).
  const kapat = () => {
    if (iptal.isError) iptal.reset();
    onKapat();
  };
  return (
    <Pencere acik={acik} onKapat={kapat} baslik="Rezervasyonu iptal et" genislik={520}>
      {iptal.isSuccess ? (
        <div className={s.pIc}>
          <h3 className="lb-y">Rezervasyon iptal edildi</h3>
          <p>
            {kesilen == null
              ? "İptal otele iletildi; tedarikçi ücret bildirmedi."
              : kesilen > 0
                ? `Kesilen iptal ücreti: ${para(kesilen, iptal.data?.cancellation?.currency || birim)}.`
                : "İptal ücreti kesilmedi."}
          </p>
          <div className={s.pAlt}>
            <button type="button" className={`${s.dugme} ${s.siyah}`} onClick={kapat}>Tamam</button>
          </div>
        </div>
      ) : (
        <div className={s.pIc}>
          <div className={s.dokum}>
            <div data-toplam>
              <span>Şimdi iptal edilirse</span>
              <b>{tahmin === 0 ? "Ücret yok" : tahmin != null ? para(tahmin, birim) : "Otelin koşullarına göre"}</b>
            </div>
          </div>
          <p className={s.not}>
            {tahmin === 0 && ip.ucretsizSon
              ? `${gunYonelme(ip.ucretsizSon)} kadar ücretsiz iptal edilebilir.`
              : tahmin != null
                ? "Tutar rezervasyondaki iptal koşullarına göre kesilir."
                : "İptal ücreti otelden gelen yanıta göre kesinleşir."}
          </p>
          <p className={s.not}>
            <b>{r.hotelName ?? r.hotelCode}</b> · {aralik(r)} · {r.contactName || r.user?.name || "Misafir"}
          </p>
          {iptal.error && (
            <HataYazi>{iptal.error instanceof TypeError ? "Bağlantıda bir sorun oldu; birazdan tekrar dene." : iptal.error.message}</HataYazi>
          )}
          <div className={s.pAlt}>
            <button type="button" className={`${s.dugme} ${s.cerceve}`} onClick={kapat}>Vazgeç</button>
            <button type="button" className={`${s.dugme} ${s.kirmizi}`} disabled={iptal.isPending} onClick={() => iptal.mutate()}>
              {iptal.isPending ? "İptal ediliyor…" : "Rezervasyonu iptal et"}
            </button>
          </div>
        </div>
      )}
    </Pencere>
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
