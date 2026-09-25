"use client";
/* eslint-disable @next/next/no-img-element -- otel görselleri dış kaynaklı (tedarikçi) */

// Partner · Rezervasyonlar: durum çipleri, arama, fotoğraflı tablo ve
// Excel'e aktarma (CSV; Excel doğrudan açar). Satıra tıklayınca ayrıntı.

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ikon } from "@/components/lb/ikon";
import { Nesne } from "@/components/lb/nesne";
import { para } from "@/components/otel-detay/yardimci";
import { durumBilgisi, gunKisa, gunOku, komisyonTutari, tutar, type Rezervasyon } from "@/components/rezervasyonlar/ortak";
import { Bos } from "./bugun";
import { grup, misafirAdi } from "./ortak";
import { RezPenceresi } from "./rez-penceresi";
import { rezervasyonlariGetir, useKazanc } from "./veri";
import s from "./partner.module.css";

type Filtre = "yaklasan" | "tamam" | "iptal" | "hepsi";
const FILTRELER: { k: Filtre; ad: string }[] = [
  { k: "yaklasan", ad: "Yaklaşan" },
  { k: "tamam", ad: "Tamamlanan" },
  { k: "iptal", ad: "İptal edilen" },
  { k: "hepsi", ad: "Tümü" },
];
const simdiAl = () => Date.now();

export function RezervasyonListesi() {
  const istemci = useQueryClient();
  const [simdi] = React.useState(simdiAl);
  const [filtre, setFiltre] = React.useState<Filtre>("yaklasan");
  const [ara, setAra] = React.useState("");
  const [secili, setSecili] = React.useState<Rezervasyon | null>(null);
  const kazanc = useKazanc();
  const oran = kazanc.data?.komisyonOrani ?? null;
  const q = useQuery({ queryKey: ["partner-rez", "hepsi"], queryFn: () => rezervasyonlariGetir() });

  const liste = React.useMemo(() => {
    const k = ara.trim().toLocaleLowerCase("tr");
    return (q.data ?? [])
      .filter((r) => {
        const g = grup(r, simdi);
        if (filtre === "yaklasan" && (g === "tamam" || g === "iptal")) return false;
        if (filtre === "tamam" && g !== "tamam") return false;
        if (filtre === "iptal" && g !== "iptal") return false;
        if (!k) return true;
        return [misafirAdi(r), r.hotelName, r.bookingNumber].filter(Boolean).join(" ").toLocaleLowerCase("tr").includes(k);
      })
      .sort((a, b) =>
        filtre === "yaklasan" ? gunOku(a.checkIn).getTime() - gunOku(b.checkIn).getTime() : gunOku(b.checkIn).getTime() - gunOku(a.checkIn).getTime()
      );
  }, [q.data, filtre, ara, simdi]);

  const komisyon = (r: Rezervasyon) => komisyonTutari(r, oran)?.tutar ?? null;

  const aktar = () => {
    const bas = ["Misafir", "Otel", "Giriş", "Çıkış", "Tutar", "Para birimi", "Komisyon (tahmini)", "Durum", "Rezervasyon no"];
    const satirlar = liste.map((r) => [
      misafirAdi(r), r.hotelName ?? r.hotelCode, r.checkIn.slice(0, 10), r.checkOut.slice(0, 10),
      tutar(r).toFixed(2).replace(".", ","), r.currency, komisyon(r)?.toFixed(2).replace(".", ",") ?? "",
      durumBilgisi(r, simdi).ad, r.bookingNumber ?? "",
    ]);
    // Excel Türkçe ayarında ; ayırıcı bekliyor; BOM ile Türkçe harfler bozulmuyor.
    const csv = "﻿" + [bas, ...satirlar].map((x) => x.map((h) => `"${String(h).replace(/"/g, '""')}"`).join(";")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = `rezervasyonlar-${new Date(simdi).toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  return (
    <div className={s.dis}>
      <div className={s.sayfaBas}>
        <h1 className="lb-y">Rezervasyonlar</h1>
        <button type="button" className={`${s.dugme} ${s.cerceve}`} onClick={aktar} disabled={!liste.length}>
          <Ikon ad="download" boyut={16} kalinlik={2.1} />
          Excel&apos;e aktar
        </button>
      </div>
      <div className={s.araclar}>
        <div className={s.cipler} role="group" aria-label="Durum">
          {FILTRELER.map((f) => (
            <button key={f.k} type="button" className={s.cip} aria-pressed={filtre === f.k} onClick={() => setFiltre(f.k)}>{f.ad}</button>
          ))}
        </div>
        <label className={s.arama}>
          <Ikon ad="search" boyut={18} />
          <input type="search" value={ara} onChange={(e) => setAra(e.target.value)} placeholder="Misafir, otel ya da rezervasyon no" aria-label="Rezervasyonlarda ara" />
        </label>
      </div>

      {q.isPending ? (
        <div className={s.iskeletTablo} aria-busy="true" />
      ) : q.isError ? (
        <Bos nesne="zil" baslik="Rezervasyonlar şu an alınamadı" metin="Birazdan tekrar dene." />
      ) : !liste.length ? (
        <Bos nesne="kartpostal" baslik={ara ? "Aramana uyan rezervasyon yok" : "Bu listede rezervasyon yok"} />
      ) : (
        <div className={s.tabloKap}>
          <table className={s.tablo}>
            <thead>
              <tr>
                <th>Misafir ve otel</th>
                <th>Giriş</th>
                <th>Çıkış</th>
                <th className={s.sagHiz}>Tutar</th>
                <th className={s.sagHiz}>Komisyon</th>
                <th>Durum</th>
                <th>Rezervasyon no</th>
              </tr>
            </thead>
            <tbody>
              {liste.map((r) => {
                const d = durumBilgisi(r, simdi);
                const k = komisyon(r);
                return (
                  <tr key={r.id} onClick={() => setSecili(r)} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setSecili(r)}>
                    <td>
                      <div className={s.hucreOtel}>
                        <span>{r.hotel?.image ? <img src={r.hotel.image} alt="" loading="lazy" /> : <Nesne ad="zil" boyut={28} />}</span>
                        <div>
                          <b>{misafirAdi(r)}</b>
                          <small>{r.hotelName ?? r.hotelCode}</small>
                        </div>
                      </div>
                    </td>
                    <td>{gunKisa(gunOku(r.checkIn))}</td>
                    <td>{gunKisa(gunOku(r.checkOut))}</td>
                    <td className={s.sagHiz}>{para(tutar(r), r.currency)}</td>
                    <td className={s.sagHiz}>{k != null ? para(k, r.currency) : "—"}</td>
                    <td><span className={s.rozet} data-renk={d.renk}>{d.ad}</span></td>
                    <td className={s.no}>{r.bookingNumber ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <RezPenceresi
        r={secili}
        simdi={simdi}
        oran={oran}
        onKapat={() => setSecili(null)}
        onIptal={() => {
          // Ayrıntı kapanır; iptal sonucu penceresi açık kalır.
          setSecili(null);
          istemci.invalidateQueries({ queryKey: ["partner-rez"] });
          istemci.invalidateQueries({ queryKey: ["partner-kazanc"] });
        }}
      />
    </div>
  );
}
