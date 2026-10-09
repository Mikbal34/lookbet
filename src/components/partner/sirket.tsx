"use client";

// Partner · Şirket bilgileri: kayıtlı şirket bilgileri (salt okunur) ve
// anlaşmadaki oranlar. Değişiklik LookBeds temsilcisi üzerinden yapılır.

import { Nesne } from "@/components/lb/nesne";
import { Bos } from "./bugun";
import { useSirket } from "./veri";
import s from "./partner.module.css";

export function Sirket() {
  const q = useSirket();
  const a = q.data;
  return (
    <div className={s.dis}>
      <div className={s.sayfaBas}>
        <h1 className="lb-y">Şirket bilgileri</h1>
      </div>
      {q.isPending ? (
        <div className={s.iskeletTablo} aria-busy="true" />
      ) : q.isError || !a ? (
        <Bos nesne="zil" baslik="Şirket bilgileri şu an alınamadı" metin="Birazdan tekrar dene." />
      ) : (
        <div className={s.altDuzen}>
          <div>
            <Satir ad="Şirket adı" deger={a.companyName} />
            <Satir ad="Vergi no" deger={a.taxOffice ? `${a.taxId} · ${a.taxOffice} VD` : a.taxId} />
            <Satir ad="TÜRSAB belge no" deger={a.tursabNo} />
            <Satir ad="Adres" deger={a.address} />
            <Satir ad="Telefon" deger={a.phone} />
            <Satir ad="Web sitesi" deger={a.website} />
            <Satir ad="Partner olduğun tarih" deger={new Date(a.createdAt).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })} />
            <Satir ad="Durum" deger={a.isApproved ? "Onaylı acente" : "Onay bekliyor"} />
          </div>
          <aside className={s.bilgiKart}>
            <Nesne ad="anahtar-karti" boyut={56} />
            <b>Anlaşman</b>
            <span>LookBeds ile yaptığın anlaşmadaki oranlar. Bilgilerde ya da oranlarda değişiklik için temsilcine yaz.</span>
            <div className={s.anlasma}>
              <div><span>Komisyon</span><b className="lb-y">%{a.commission}</b></div>
              <div><span>İndirim</span><b className="lb-y">%{a.discountRate}</b></div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function Satir({ ad, deger }: { ad: string; deger: string | null }) {
  return (
    <div className={s.bilgiSatir}>
      <b>{ad}</b>
      <span>{deger || "—"}</span>
    </div>
  );
}
