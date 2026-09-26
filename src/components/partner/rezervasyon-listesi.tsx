"use client";
/* eslint-disable @next/next/no-img-element -- otel görselleri dış kaynaklı (tedarikçi) */

// Partner · Rezervasyonlar: durum çipleri, arama, fotoğraflı tablo ve
// Excel'e aktarma (CSV; Excel doğrudan açar). Satıra tıklayınca ayrıntı.
// Liste 50'şer sayfa gelir ("Daha fazla göster"); süzgeç ve sıra sunucuda
// (yaklaşan: girişe en yakın önce, tamamlanan: son giriş önce, iptal ve
// tümü: en yeni kayıt önce). Arama yüklenen satırlarda; Excel'e aktarma
// süzgecin tüm sayfalarını çeker (en fazla 2000 satır).

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Ikon } from "@/components/lb/ikon";
import { Nesne } from "@/components/lb/nesne";
import { para } from "@/components/otel-detay/yardimci";
import { durumBilgisi, gunKisa, gunOku, komisyonTutari, tutar, type Rezervasyon } from "@/components/rezervasyonlar/ortak";
import { Bos } from "./bugun";
import { misafirAdi } from "./ortak";
import { RezPenceresi } from "./rez-penceresi";
import { AKTARMA_SINIRI, tekil, tumRezervasyonlar, useKazanc, useRezervasyonSayfalari, type Zaman } from "./veri";
import s from "./partner.module.css";

type Filtre = "yaklasan" | "tamam" | "iptal" | "hepsi";
const FILTRELER: { k: Filtre; ad: string; zaman?: Zaman }[] = [
  { k: "yaklasan", ad: "Yaklaşan", zaman: "gelecek" },
  { k: "tamam", ad: "Tamamlanan", zaman: "gecmis" },
  { k: "iptal", ad: "İptal edilen", zaman: "iptal" },
  { k: "hepsi", ad: "Tümü" },
];
const simdiAl = () => Date.now();
const sayi = (n: number) => n.toLocaleString("tr-TR");

/** Arama: misafir, otel ya da rezervasyon no. */
const aramayaUyar = (r: Rezervasyon, k: string) =>
  !k || [misafirAdi(r), r.hotelName, r.bookingNumber].filter(Boolean).join(" ").toLocaleLowerCase("tr").includes(k);

export function RezervasyonListesi() {
  const istemci = useQueryClient();
  const [simdi] = React.useState(simdiAl);
  const [filtre, setFiltre] = React.useState<Filtre>("yaklasan");
  const [ara, setAra] = React.useState("");
  const [secili, setSecili] = React.useState<Rezervasyon | null>(null);
  const [aktariliyor, setAktariliyor] = React.useState(false);
  const [aktarNot, setAktarNot] = React.useState<{ metin: string; hata?: boolean } | null>(null);
  const kazanc = useKazanc();
  const oran = kazanc.data?.komisyonOrani ?? null;
  const zaman = FILTRELER.find((f) => f.k === filtre)?.zaman;
  const q = useRezervasyonSayfalari(zaman);

  const yuklenen = React.useMemo(() => tekil(q.data?.pages.flatMap((p) => p.data) ?? []), [q.data]);
  const toplam = q.data?.pages.at(-1)?.pagination.total ?? 0;
  const aranan = ara.trim().toLocaleLowerCase("tr");
  const liste = React.useMemo(() => yuklenen.filter((r) => aramayaUyar(r, aranan)), [yuklenen, aranan]);

  const komisyon = (r: Rezervasyon) => komisyonTutari(r, oran)?.tutar ?? null;

  const csvIndir = (satirlar: Rezervasyon[]) => {
    const bas = ["Misafir", "Otel", "Giriş", "Çıkış", "Tutar", "Para birimi", "Komisyon (tahmini)", "Durum", "Rezervasyon no"];
    const govde = satirlar.map((r) => [
      misafirAdi(r), r.hotelName ?? r.hotelCode, r.checkIn.slice(0, 10), r.checkOut.slice(0, 10),
      tutar(r).toFixed(2).replace(".", ","), r.currency, komisyon(r)?.toFixed(2).replace(".", ",") ?? "",
      durumBilgisi(r, simdi).ad, r.bookingNumber ?? "",
    ]);
    // Excel Türkçe ayarında ; ayırıcı bekliyor; BOM ile Türkçe harfler bozulmuyor.
    const csv = "﻿" + [bas, ...govde].map((x) => x.map((h) => `"${String(h).replace(/"/g, '""')}"`).join(";")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = `rezervasyonlar-${new Date(simdi).toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  // Ekranda yalnız yüklenen sayfalar var: dosya için süzgecin tüm sayfaları sırayla çekilir.
  const aktar = async () => {
    setAktariliyor(true);
    setAktarNot(null);
    try {
      const { liste: tum, toplam: hepsi, kesildi } = await tumRezervasyonlar(zaman);
      const satirlar = tum.filter((r) => aramayaUyar(r, aranan));
      if (!satirlar.length) {
        setAktarNot({ metin: "Aktarılacak rezervasyon yok." });
        return;
      }
      csvIndir(satirlar);
      if (kesildi) {
        setAktarNot({
          metin: `Bu listede ${sayi(hepsi)} rezervasyon var; dosyaya yalnız ilk ${sayi(AKTARMA_SINIRI)} tanesi${aranan ? " (arama bunlarda yapıldı)" : ""} alındı.`,
        });
      }
    } catch {
      setAktarNot({ metin: "Rezervasyonlar alınamadı, dosya oluşturulmadı. Tekrar dene.", hata: true });
    } finally {
      setAktariliyor(false);
    }
  };

  return (
    <div className={s.dis}>
      <div className={s.sayfaBas}>
        <h1 className="lb-y">Rezervasyonlar</h1>
        <button type="button" className={`${s.dugme} ${s.cerceve}`} onClick={aktar} disabled={!toplam || aktariliyor} aria-busy={aktariliyor || undefined}>
          <Ikon ad="download" boyut={16} kalinlik={2.1} />
          {aktariliyor ? "Hazırlanıyor…" : <>Excel&apos;e aktar</>}
        </button>
      </div>
      {aktarNot && (
        <p className={s.aktarNot} data-hata={aktarNot.hata || undefined} role="status">
          <Ikon ad={aktarNot.hata ? "warning" : "info"} boyut={16} kalinlik={2.1} />
          {aktarNot.metin}
        </p>
      )}
      <div className={s.araclar}>
        <div className={s.cipler} role="group" aria-label="Durum">
          {FILTRELER.map((f) => (
            <button
              key={f.k}
              type="button"
              className={s.cip}
              aria-pressed={filtre === f.k}
              onClick={() => {
                setFiltre(f.k);
                setAktarNot(null);
              }}
            >
              {f.ad}
            </button>
          ))}
        </div>
        <label className={s.arama}>
          <Ikon ad="search" boyut={18} />
          <input type="search" value={ara} onChange={(e) => setAra(e.target.value)} placeholder="Misafir, otel ya da rezervasyon no" aria-label="Rezervasyonlarda ara" />
        </label>
      </div>

      {q.isPending ? (
        <div className={s.iskeletTablo} aria-busy="true" />
      ) : !q.data ? (
        <Bos nesne="zil" baslik="Rezervasyonlar şu an alınamadı" metin="Birazdan tekrar dene." />
      ) : !liste.length ? (
        <Bos
          nesne="kartpostal"
          baslik={!aranan ? "Bu listede rezervasyon yok" : q.hasNextPage ? "Yüklenenlerde aramana uyan rezervasyon yok" : "Aramana uyan rezervasyon yok"}
        />
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

      {q.data && q.hasNextPage && (
        <div className={s.dahaFazla}>
          <span>
            {sayi(yuklenen.length)} / {sayi(toplam)} rezervasyon yüklendi{aranan ? "; arama yüklenenlerde" : ""}
          </span>
          <button
            type="button"
            className={`${s.dugme} ${s.cerceve}`}
            disabled={q.isFetchingNextPage}
            aria-busy={q.isFetchingNextPage || undefined}
            onClick={() => q.fetchNextPage()}
          >
            {q.isFetchingNextPage ? "Yükleniyor…" : "Daha fazla göster"}
          </button>
          {q.isFetchNextPageError && <small role="alert">Devamı yüklenemedi, tekrar dene.</small>}
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
