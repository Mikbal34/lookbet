"use client";

// Yönetim › Denetim kaydı: kim, ne zaman, neyi değiştirdi. Güne göre gruplu;
// kayda tıklayınca eski ve yeni değerler yan yana, IP adresiyle.

import * as React from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Ikon } from "@/components/lb/ikon";
import { getir, saatYazi, simdiAl, tarihUzun } from "./ortak";
import s from "./yonetim.module.css";

interface Kayit {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
  user: { name: string; email: string } | null;
}
interface Yanit { auditLogs: Kayit[]; pagination: { page: number; totalPages: number } }

const EYLEM: Record<string, string> = {
  APPROVE_AGENCY_APPLICATION: "acente başvurusunu onayladı",
  REJECT_AGENCY_APPLICATION: "acente başvurusunu reddetti",
  APPROVE_AGENCY: "acenteyi onayladı",
  CREATE_AGENCY: "acente oluşturdu",
  UPDATE_AGENCY: "acenteyi güncelledi",
  SOFT_DELETE_AGENCY: "acenteyi kapattı",
  CREATE_PRICE_RULE: "fiyat kuralı oluşturdu",
  UPDATE_PRICE_RULE: "fiyat kuralını güncelledi",
  DELETE_PRICE_RULE: "fiyat kuralını sildi",
  CREATE_COMMISSION: "özel komisyon ekledi",
  UPDATE_COMMISSION: "özel komisyonu güncelledi",
  DELETE_COMMISSION: "özel komisyonu sildi",
  CREATE_USER: "kullanıcı oluşturdu",
  UPDATE_USER: "kullanıcıyı güncelledi",
  SOFT_DELETE_USER: "kullanıcı hesabını kapattı",
  CREATE_NOTIFICATION: "bildirim gönderdi",
  BROADCAST_NOTIFICATION: "toplu bildirim gönderdi",
  RUN_CONTENT_SYNC: "içerik işini başlattı",
  CREATE_DISCOUNT: "indirim oluşturdu",
  UPDATE_DISCOUNT: "indirimi güncelledi",
  DELETE_DISCOUNT: "indirimi sildi",
  CREATE_COUPON: "kupon oluşturdu",
  UPDATE_COUPON: "kuponu güncelledi",
  DELETE_COUPON: "kuponu sildi",
};
const FILTRE = [
  { ad: "Hepsi", varlik: "" },
  { ad: "Acente", varlik: "Agency" },
  { ad: "Başvuru", varlik: "AgencyApplication" },
  { ad: "Fiyat kuralı", varlik: "PriceRule" },
  { ad: "Komisyon", varlik: "Commission" },
  { ad: "İndirim", varlik: "Discount" },
  { ad: "Kupon", varlik: "Coupon" },
  { ad: "Kullanıcı", varlik: "User" },
];
const yaz = (v: unknown) => (v === null || v === undefined || v === "" ? "—" : typeof v === "object" ? JSON.stringify(v) : String(v));

function gunBasligi(iso: string, simdi: number) {
  const g = Math.floor((new Date(simdi).setHours(0, 0, 0, 0) - new Date(iso).setHours(0, 0, 0, 0)) / 864e5);
  return g <= 0 ? "Bugün" : g === 1 ? "Dün" : tarihUzun(iso);
}

export function Denetim() {
  const [simdi] = React.useState(simdiAl);
  const [varlik, setVarlik] = React.useState("");
  const q = useInfiniteQuery({
    queryKey: ["yonetim", "denetim", varlik],
    queryFn: ({ pageParam }) => getir<Yanit>(`/api/admin/audit-logs?limit=40&page=${pageParam}${varlik ? `&entity=${varlik}` : ""}`),
    initialPageParam: 1,
    getNextPageParam: (son) => (son.pagination.page < son.pagination.totalPages ? son.pagination.page + 1 : undefined),
  });
  const liste = q.data?.pages.flatMap((p) => p.auditLogs) ?? [];
  const gunler: { baslik: string; kayitlar: Kayit[] }[] = [];
  for (const k of liste) {
    const b = gunBasligi(k.createdAt, simdi);
    if (gunler[gunler.length - 1]?.baslik !== b) gunler.push({ baslik: b, kayitlar: [] });
    gunler[gunler.length - 1].kayitlar.push(k);
  }

  return (
    <div className={s.dis}>
      <div className={s.sayfaBas}>
        <h1 className="lb-y">Denetim kaydı</h1>
        <div className={s.cipler} role="group" aria-label="Kayıt türü">
          {FILTRE.map((f) => (
            <button key={f.varlik} type="button" className={s.cip} aria-pressed={varlik === f.varlik} onClick={() => setVarlik(f.varlik)}>{f.ad}</button>
          ))}
        </div>
      </div>
      {q.isPending ? (
        <div className={s.iskelet} aria-busy="true" />
      ) : q.isError ? (
        <div className={s.bos}><b>Kayıtlar alınamadı</b><button type="button" className={`${s.dugme} ${s.siyah}`} onClick={() => q.refetch()}>Tekrar dene</button></div>
      ) : liste.length ? (
        <div className={s.denetim}>
          {gunler.map((g) => (
            <section key={g.baslik} className={s.gun}>
              <h3>{g.baslik}</h3>
              {g.kayitlar.map((k) => {
                const anahtarlar = [...new Set([...Object.keys(k.oldData ?? {}), ...Object.keys(k.newData ?? {})])];
                const kim = k.user?.name ?? "Sistem";
                return (
                  <details key={k.id} className={s.kayit}>
                    <summary>
                      <span className={s.saat}>{saatYazi(k.createdAt)}</span>
                      <span className={s.kim} data-sistem={!k.user || undefined}>{kim[0]?.toLocaleUpperCase("tr")}</span>
                      <div>
                        <b>{kim}</b> {EYLEM[k.action] ?? k.action.toLocaleLowerCase("tr").replace(/_/g, " ")}
                        <span className={s.varlik}>{k.entity}</span>
                      </div>
                      <Ikon ad="chevron-down" boyut={18} className={s.acOk} />
                    </summary>
                    <div className={s.fark}>
                      {anahtarlar.length ? (
                        anahtarlar.map((a) => {
                          const eski = k.oldData?.[a];
                          const yeni = k.newData?.[a];
                          return (
                            <div key={a}>
                              <code>{a}</code>
                              {k.oldData && <span className={s.eski}>{yaz(eski)}</span>}
                              {k.oldData && k.newData && <Ikon ad="chevron-right" boyut={14} />}
                              {k.newData && <span className={s.yeni}>{yaz(yeni)}</span>}
                            </div>
                          );
                        })
                      ) : (
                        <p className={s.soluk}>Ayrıntı kaydedilmemiş.</p>
                      )}
                      <p className={s.soluk}>{k.entityId ? `Kayıt ${k.entityId} · ` : ""}{k.user?.email ?? ""}{k.ipAddress ? ` · IP ${k.ipAddress}` : ""}</p>
                    </div>
                  </details>
                );
              })}
            </section>
          ))}
          {q.hasNextPage && (
            <div style={{ display: "flex", justifyContent: "center" }}>
              <button type="button" className={`${s.dugme} ${s.cerceve}`} disabled={q.isFetchingNextPage} onClick={() => q.fetchNextPage()}>Daha eski kayıtlar</button>
            </div>
          )}
        </div>
      ) : (
        <div className={s.bos}><b>Kayıt yok</b><span>Başvuru kararları, fiyat ve kullanıcı değişiklikleri burada listelenir.</span></div>
      )}
    </div>
  );
}
