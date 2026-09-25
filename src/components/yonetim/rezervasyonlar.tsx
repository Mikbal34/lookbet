"use client";

// Yönetim › Rezervasyonlar: durum çipleri (sayılı), kaynak (müşteri/acente),
// arama (misafir, e-posta, otel, rezervasyon no, acente), CSV ve sayfalı
// liste. Satıra tıklayınca ayrıntı açılır. ?durum=PENDING ile gelinebilir.

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Ikon } from "@/components/lb/ikon";
import { geceler } from "@/components/rezervasyonlar/ortak";
import { DURUM, DurumRozet, Kaynak, OtelFoto, eur, getir, satisFiyati, tarihKisa, type YRez } from "./ortak";
import { RezAyrinti } from "./rez-ayrinti";
import s from "./yonetim.module.css";

interface Yanit {
  reservations: YRez[];
  sayilar: Record<string, number>;
  pagination: { page: number; totalPages: number; total: number };
}
const CIPLER = ["PENDING", "FAILED", "CONFIRMED", "CANCELLED"] as const;
const CIP_AD: Record<string, string> = { PENDING: "Otel onayı bekleyen", FAILED: "Başarısız", CONFIRMED: "Onaylı", CANCELLED: "İptal" };

export function Rezervasyonlar() {
  const router = useRouter();
  const p = useSearchParams();
  const durum = CIPLER.includes(p.get("durum") as (typeof CIPLER)[number]) ? p.get("durum")! : "";
  const [kaynak, setKaynak] = React.useState("");
  const [ara, setAra] = React.useState("");
  const [aranan, setAranan] = React.useState("");
  const [secili, setSecili] = React.useState<YRez | null>(null);
  React.useEffect(() => {
    const t = setTimeout(() => setAranan(ara.trim()), 300);
    return () => clearTimeout(t);
  }, [ara]);

  const parametre = (sayfa?: number) => {
    const u = new URLSearchParams();
    if (durum) u.set("status", durum);
    if (kaynak) u.set("source", kaynak);
    if (aranan) u.set("search", aranan);
    if (sayfa) {
      u.set("page", String(sayfa));
      u.set("limit", "40");
    }
    return u.toString();
  };
  const q = useInfiniteQuery({
    queryKey: ["yonetim", "rezervasyonlar", durum, kaynak, aranan],
    queryFn: ({ pageParam }) => getir<Yanit>(`/api/admin/reservations?${parametre(pageParam)}`),
    initialPageParam: 1,
    getNextPageParam: (son) => (son.pagination.page < son.pagination.totalPages ? son.pagination.page + 1 : undefined),
  });
  const liste = q.data?.pages.flatMap((x) => x.reservations) ?? [];
  const sayilar = q.data?.pages[0]?.sayilar;
  const toplam = sayilar ? Object.values(sayilar).reduce((a, b) => a + b, 0) : null;
  const durumSec = (d: string) => router.replace(d ? `/admin/reservations?durum=${d}` : "/admin/reservations", { scroll: false });

  return (
    <div className={s.dis}>
      <div className={s.sayfaBas}>
        <h1 className="lb-y">Rezervasyonlar</h1>
        <a className={`${s.dugme} ${s.cerceve}`} href={`/api/admin/reservations/export?${parametre()}`} download>
          <Ikon ad="download" boyut={16} kalinlik={2.1} />
          CSV indir
        </a>
      </div>
      <div className={s.araclar}>
        <div className={s.cipler} role="group" aria-label="Durum">
          <button type="button" className={s.cip} aria-pressed={!durum} onClick={() => durumSec("")}>
            Tümü {toplam !== null && <i>{toplam}</i>}
          </button>
          {CIPLER.map((c) => (
            <button key={c} type="button" className={s.cip} aria-pressed={durum === c} data-uyari={c === "FAILED" || undefined} onClick={() => durumSec(c)}>
              {CIP_AD[c]} {sayilar && <i>{sayilar[c] ?? 0}</i>}
            </button>
          ))}
        </div>
        <div className={s.aracSag}>
          <div className={s.parca} role="radiogroup" aria-label="Kaynak">
            {[["", "Hepsi"], ["CUSTOMER", "Müşteri"], ["AGENCY", "Acente"]].map(([v, ad]) => (
              <label key={v}>
                <input type="radio" name="kaynak" checked={kaynak === v} onChange={() => setKaynak(v)} />
                <span>{ad}</span>
              </label>
            ))}
          </div>
          <label className={s.arama}>
            <Ikon ad="search" boyut={17} />
            <input type="search" value={ara} onChange={(e) => setAra(e.target.value)} placeholder="Misafir, otel, no, acente" aria-label="Rezervasyonlarda ara" />
          </label>
        </div>
      </div>

      {q.isPending ? (
        <div className={s.iskelet} aria-busy="true" />
      ) : q.isError ? (
        <div className={s.bos}>
          <b>Rezervasyonlar alınamadı</b>
          <button type="button" className={`${s.dugme} ${s.siyah}`} onClick={() => q.refetch()}>Tekrar dene</button>
        </div>
      ) : (
        <div className={s.tabloKap}>
          <table className={s.tablo}>
            <thead>
              <tr>
                <th>Misafir ve otel</th>
                <th>Tarihler</th>
                <th>Kaynak</th>
                <th className={s.sagHiz}>Satış</th>
                <th>Durum</th>
                <th>No</th>
              </tr>
            </thead>
            <tbody>
              {liste.map((r) => (
                <tr
                  key={r.id}
                  data-tik
                  tabIndex={0}
                  onClick={() => setSecili(r)}
                  onKeyDown={(e) => e.key === "Enter" && setSecili(r)}
                  aria-label={`${r.contactName ?? "Misafir"}, ${r.hotelName ?? r.hotelCode}, ${DURUM[r.status]?.ad ?? r.status}`}
                >
                  <td>
                    <div className={s.hucre}>
                      <OtelFoto src={r.hotel?.image} />
                      <div><b>{r.contactName || r.user?.name || "Misafir"}</b><span>{r.hotelName ?? r.hotelCode}</span></div>
                    </div>
                  </td>
                  <td>{tarihKisa(r.checkIn)} – {tarihKisa(r.checkOut)}<span className={s.alt}>{geceler(r)} gece</span></td>
                  <td><Kaynak r={r} /></td>
                  <td className={s.sagHiz}>{eur(satisFiyati(r))}<span className={s.alt}>net {eur(r.totalPrice)}</span></td>
                  <td><DurumRozet durum={r.status} /></td>
                  <td className={s.no}>{r.bookingNumber ?? "—"}<span className={s.alt}>{tarihKisa(r.createdAt)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!liste.length && <div className={s.tabloBos}>Bu filtreye uyan rezervasyon yok.</div>}
          {q.hasNextPage && (
            <div className={s.dahaFazla}>
              <button type="button" className={`${s.dugme} ${s.cerceve}`} disabled={q.isFetchingNextPage} onClick={() => q.fetchNextPage()}>
                {q.isFetchingNextPage ? "Yükleniyor…" : "Daha fazla göster"}
              </button>
            </div>
          )}
        </div>
      )}
      <RezAyrinti r={secili} onKapat={() => setSecili(null)} />
    </div>
  );
}
