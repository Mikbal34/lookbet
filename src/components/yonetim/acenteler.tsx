"use client";

// Yönetim › Acenteler: bekleyen başvurular (kart + inceleme penceresi:
// anlaşma oranlarıyla onay ya da acentenin göreceği sebeple ret), acenteler
// (oran düzenleme, kapatma/açma) ve karar geçmişi.

import * as React from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ikon } from "@/components/lb/ikon";
import { Nesne } from "@/components/lb/nesne";
import { Pencere } from "@/components/lb/pencere";
import { Girdi, HataYazi, eur, getir, gonder, neZaman, simdiAl, tarihUzun, useBildiri } from "./ortak";
import s from "./yonetim.module.css";

interface Basvuru {
  id: string;
  contactName: string;
  email: string;
  phone: string | null;
  companyName: string;
  taxId: string;
  taxOffice: string | null;
  tursabNo: string | null;
  website: string | null;
  companyPhone: string | null;
  address: string | null;
  message: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectionReason: string | null;
  reviewedBy: { name: string } | null;
  reviewedAt: string | null;
  createdAt: string;
}
interface Acente {
  id: string;
  companyName: string;
  taxId: string;
  taxOffice: string | null;
  tursabNo: string | null;
  commission: number;
  discountRate: number;
  isApproved: boolean;
  createdAt: string;
  yilSatis: number;
  user: { name: string; email: string; phone: string | null; isActive: boolean };
  _count: { reservations: number };
}
type Sekme = "basvuru" | "liste" | "gecmis";

export function Acenteler() {
  const [sekme, setSekme] = React.useState<Sekme>("basvuru");
  const [simdi] = React.useState(simdiAl);
  const [incelenen, setIncelenen] = React.useState<Basvuru | null>(null);
  const [duzenlenen, setDuzenlenen] = React.useState<Acente | null>(null);

  const bekleyen = useQuery({
    queryKey: ["yonetim", "basvurular", "PENDING"],
    queryFn: () => getir<{ applications: Basvuru[]; pendingCount: number }>("/api/admin/agency-applications?status=PENDING&limit=100"),
  });
  const acenteSayfalari = useInfiniteQuery({
    queryKey: ["yonetim", "acenteler"],
    queryFn: ({ pageParam }) =>
      getir<{ agencies: Acente[]; pagination: { total: number; page: number; totalPages: number } }>(`/api/admin/agencies?limit=50&page=${pageParam}`),
    initialPageParam: 1,
    getNextPageParam: (son) => (son.pagination.page < son.pagination.totalPages ? son.pagination.page + 1 : undefined),
    enabled: sekme === "liste" || !!bekleyen.data,
  });
  const acenteVerisi = acenteSayfalari.data && {
    agencies: acenteSayfalari.data.pages.flatMap((p) => p.agencies),
    pagination: acenteSayfalari.data.pages[0].pagination,
  };
  const gecmis = useQuery({
    queryKey: ["yonetim", "basvurular", "KARAR"],
    queryFn: () => getir<{ applications: Basvuru[] }>("/api/admin/agency-applications?status=KARAR&limit=50"),
    enabled: sekme === "gecmis",
  });

  return (
    <div className={s.dis}>
      <div className={s.sayfaBas}>
        <h1 className="lb-y">Acenteler</h1>
      </div>
      <div className={s.altSekmeler} role="tablist" aria-label="Acenteler">
        <button role="tab" type="button" aria-selected={sekme === "basvuru"} onClick={() => setSekme("basvuru")}>
          Başvurular {!!bekleyen.data?.pendingCount && <i className={s.say}>{bekleyen.data.pendingCount}</i>}
        </button>
        <button role="tab" type="button" aria-selected={sekme === "liste"} onClick={() => setSekme("liste")}>
          Acenteler {acenteVerisi && <i>{acenteVerisi.pagination.total}</i>}
        </button>
        <button role="tab" type="button" aria-selected={sekme === "gecmis"} onClick={() => setSekme("gecmis")}>Karar geçmişi</button>
      </div>

      {sekme === "basvuru" &&
        (bekleyen.isPending ? (
          <div className={s.iskelet} aria-busy="true" />
        ) : bekleyen.isError ? (
          <Hata onTekrar={() => bekleyen.refetch()} />
        ) : bekleyen.data.applications.length ? (
          <div className={s.bkartlar}>
            {bekleyen.data.applications.map((b) => (
              <BasvuruKarti key={b.id} b={b} simdi={simdi} onIncele={() => setIncelenen(b)} />
            ))}
          </div>
        ) : (
          <div className={s.bos}>
            <Nesne ad="anahtar-karti" boyut={72} />
            <b>Bekleyen başvuru yok</b>
            <span>Acente girişinden başvuru gelince burada ve bildirimlerde görünür.</span>
          </div>
        ))}

      {sekme === "liste" &&
        (!acenteVerisi && !acenteSayfalari.isError ? (
          <div className={s.iskelet} aria-busy="true" />
        ) : !acenteVerisi ? (
          <Hata onTekrar={() => acenteSayfalari.refetch()} />
        ) : (
          <div className={s.tabloKap}>
            <table className={s.tablo}>
              <thead>
                <tr>
                  <th>Acente</th>
                  <th className={s.sagHiz}>Komisyon</th>
                  <th className={s.sagHiz}>İndirim</th>
                  <th className={s.sagHiz}>Rezervasyon</th>
                  <th className={s.sagHiz}>Satış ({new Date(simdi).getFullYear()})</th>
                  <th>Durum</th>
                  <th>Partner oldu</th>
                </tr>
              </thead>
              <tbody>
                {acenteVerisi.agencies.map((a) => (
                  <tr key={a.id} data-tik tabIndex={0} onClick={() => setDuzenlenen(a)} onKeyDown={(e) => e.key === "Enter" && setDuzenlenen(a)}>
                    <td>
                      <div className={s.hucre}>
                        <span className={s.harf}>{a.companyName[0]?.toLocaleUpperCase("tr")}</span>
                        <div><b>{a.companyName}</b><span>{a.user.name} · {a.user.email}</span></div>
                      </div>
                    </td>
                    <td className={s.sagHiz}>%{a.commission}</td>
                    <td className={s.sagHiz}>%{a.discountRate}</td>
                    <td className={s.sagHiz}>{a._count.reservations}</td>
                    <td className={s.sagHiz}>{eur(a.yilSatis)}</td>
                    <td>
                      <span className={s.rozet} data-renk={a.isApproved && a.user.isActive ? "yesil" : "gri"}>
                        {a.isApproved && a.user.isActive ? "Aktif" : "Kapalı"}
                      </span>
                    </td>
                    <td className={s.no}>{tarihUzun(a.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!acenteVerisi.agencies.length && <div className={s.tabloBos}>Henüz acente yok.</div>}
            {acenteSayfalari.hasNextPage && (
              <div className={s.dahaFazla}>
                <button type="button" className={`${s.dugme} ${s.cerceve}`} disabled={acenteSayfalari.isFetchingNextPage} onClick={() => acenteSayfalari.fetchNextPage()}>
                  {acenteSayfalari.isFetchingNextPage ? "Yükleniyor…" : "Daha fazla göster"}
                </button>
              </div>
            )}
          </div>
        ))}

      {sekme === "gecmis" &&
        (gecmis.isPending ? (
          <div className={s.iskelet} aria-busy="true" />
        ) : gecmis.isError ? (
          <Hata onTekrar={() => gecmis.refetch()} />
        ) : gecmis.data.applications.length ? (
          <div className={s.gecmis}>
            {gecmis.data.applications.map((b) => (
              <div key={b.id} className={s.gsatir}>
                <div>
                  <b>{b.companyName}</b>
                  <span className={s.soluk}>
                    {b.contactName} · {b.reviewedAt ? tarihUzun(b.reviewedAt) : "—"}{b.reviewedBy ? ` · ${b.reviewedBy.name}` : ""}
                  </span>
                  {b.rejectionReason && <p className={s.sebep}>{b.rejectionReason}</p>}
                </div>
                <span className={s.rozet} data-renk={b.status === "APPROVED" ? "yesil" : "kirmizi"}>{b.status === "APPROVED" ? "Onaylandı" : "Reddedildi"}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className={s.bos}><b>Henüz karar verilmiş başvuru yok</b></div>
        ))}

      <BasvuruPenceresi b={incelenen} onKapat={() => setIncelenen(null)} />
      <AcentePenceresi a={duzenlenen} onKapat={() => setDuzenlenen(null)} />
    </div>
  );
}

function Hata({ onTekrar }: { onTekrar: () => void }) {
  return (
    <div className={s.bos}>
      <b>Liste alınamadı</b>
      <button type="button" className={`${s.dugme} ${s.siyah}`} onClick={onTekrar}>Tekrar dene</button>
    </div>
  );
}

function BasvuruKarti({ b, simdi, onIncele }: { b: Basvuru; simdi: number; onIncele: () => void }) {
  const uyarilar = [!b.tursabNo && "TÜRSAB no yok", b.taxId.length === 11 && "Şahıs (TC kimlik no)"].filter(Boolean) as string[];
  return (
    <article className={s.bkart}>
      <div className={s.bkartUst}>
        <div>
          <span className={s.etiket}>{neZaman(b.createdAt, simdi).replace(/ \d\d:\d\d$/, "").replace(/^./, (c) => c.toLocaleUpperCase("tr"))}</span>
          <h3>{b.companyName}</h3>
          <p className={s.soluk}>{b.contactName} · {b.email}</p>
        </div>
        <Nesne ad="anahtar-karti" boyut={48} />
      </div>
      <dl className={s.bilgiler}>
        <div><dt>Vergi no</dt><dd>{b.taxId}{b.taxOffice ? ` · ${b.taxOffice} VD` : ""}</dd></div>
        <div><dt>TÜRSAB</dt><dd>{b.tursabNo || "—"}</dd></div>
        <div><dt>Adres</dt><dd>{b.address || "—"}</dd></div>
      </dl>
      {uyarilar.length > 0 && (
        <div className={s.uyarilar}>
          {uyarilar.map((u) => <span key={u} className={s.uyari}><Ikon ad="info" boyut={14} kalinlik={2.2} />{u}</span>)}
        </div>
      )}
      <div><button type="button" className={`${s.dugme} ${s.siyah}`} onClick={onIncele}>İncele ve karar ver</button></div>
    </article>
  );
}

const HAZIR_SEBEP = ["Vergi levhası bilgileri eşleşmedi.", "TÜRSAB belgesi gerekli.", "Şahıs başvurularını şu an kabul etmiyoruz."];

function BasvuruPenceresi({ b, onKapat }: { b: Basvuru | null; onKapat: () => void }) {
  const [son, setSon] = React.useState(b);
  if (b && b !== son) setSon(b);
  const x = b ?? son;
  return (
    <Pencere acik={!!b} onKapat={onKapat} baslik="Acente başvurusu" genislik={880}>
      {x && <BasvuruIcerik key={x.id} b={x} onKapat={onKapat} />}
    </Pencere>
  );
}

function BasvuruIcerik({ b, onKapat }: { b: Basvuru; onKapat: () => void }) {
  const istemci = useQueryClient();
  const bildiri = useBildiri();
  const [mod, setMod] = React.useState<"onay" | "red">("onay");
  const [kom, setKom] = React.useState("8");
  const [ind, setInd] = React.useState("0");
  const [not, setNot] = React.useState("");
  const [sebep, setSebep] = React.useState("");
  const [hata, setHata] = React.useState<string | null>(null);
  const karar = useMutation({
    mutationFn: () =>
      mod === "onay"
        ? gonder(`/api/admin/agency-applications/${b.id}/approve`, "POST", {
            commission: Number(kom) || 0,
            discountRate: Number(ind) || 0,
            ...(not.trim() ? { notes: not.trim() } : {}),
          })
        : gonder(`/api/admin/agency-applications/${b.id}/reject`, "POST", { reason: sebep.trim() }),
    onSuccess: () => {
      istemci.invalidateQueries({ queryKey: ["yonetim"] });
      bildiri(mod === "onay" ? `${b.companyName} onaylandı; paneli açıldı` : `${b.companyName} reddedildi; acente sebebi panelinde görür`);
      onKapat();
    },
    onError: (e: Error) => setHata(e.message),
  });
  const oran = (v: string, ust = 100) => v !== "" && Number(v) >= 0 && Number(v) <= ust;
  const tamam = () => {
    setHata(null);
    if (mod === "onay" && !oran(kom, 90)) return setHata("Komisyon 0 ile 90 arasında olmalı");
    if (mod === "onay" && !oran(ind)) return setHata("İndirim 0 ile 100 arasında olmalı");
    if (mod === "red" && sebep.trim().length < 5) return setHata("Acentenin göreceği bir sebep yaz");
    karar.mutate();
  };
  const satir = (a: string, v?: string | null) => (
    <div><dt>{a}</dt><dd>{v || <span className={s.soluk}>—</span>}</dd></div>
  );

  return (
    <div className={s.pIc}>
      <div className={s.basvuruDuzen}>
        <div>
          <h3 className="lb-y">{b.companyName}</h3>
          <dl className={s.alanlarOku}>
            {satir("Yetkili", b.contactName)}
            {satir("E-posta", `${b.email} (kodla doğrulandı)`)}
            {satir("Cep telefonu", b.phone)}
            {satir("Vergi no", b.taxId + (b.taxId.length === 11 ? " · TC kimlik no" : ""))}
            {satir("Vergi dairesi", b.taxOffice)}
            {satir("TÜRSAB no", b.tursabNo)}
            {satir("Adres", b.address)}
            {satir("Şirket telefonu", b.companyPhone)}
            {satir("Web sitesi", b.website)}
            {satir("Başvuru", tarihUzun(b.createdAt))}
          </dl>
          {b.message && (
            <div>
              <span className={s.pEtiket}>Notu</span>
              <p className={s.mesaj}>{b.message}</p>
            </div>
          )}
        </div>
        <div>
          {mod === "onay" ? (
            <div className={s.form}>
              <span className={s.pEtiket}>Anlaşma</span>
              <div className={s.ikiAlan}>
                <Girdi id="k-kom" etiket="Komisyon (%)" type="number" min={0} max={90} inputMode="decimal" value={kom} onDegis={setKom} />
                <Girdi id="k-ind" etiket="İndirim (%)" type="number" min={0} max={100} inputMode="decimal" value={ind} onDegis={setInd} />
              </div>
              <div className={s.alan}>
                <label htmlFor="k-not">Dahili not (acente görmez)</label>
                <textarea id="k-not" rows={2} value={not} onChange={(e) => setNot(e.target.value)} placeholder="Görüşme notu, referans…" />
              </div>
              <p className={s.not}>Onaylayınca paneli hemen açılır; acente aynı e-postayla kodla girer.</p>
            </div>
          ) : (
            <div className={s.form}>
              <span className={s.pEtiket}>Ret sebebi (acente görür)</span>
              <div className={s.hazirSebep}>
                {HAZIR_SEBEP.map((h) => <button key={h} type="button" onClick={() => setSebep(h)}>{h}</button>)}
              </div>
              <div className={s.alan}>
                <label htmlFor="k-sebep">Sebep</label>
                <textarea id="k-sebep" rows={3} value={sebep} onChange={(e) => setSebep(e.target.value)} autoFocus />
              </div>
            </div>
          )}
        </div>
      </div>
      {hata && <HataYazi>{hata}</HataYazi>}
      <div className={s.pAlt}>
        <button type="button" className={`${s.dugme} ${s.cerceve} ${s.solda}`} onClick={() => { setMod(mod === "onay" ? "red" : "onay"); setHata(null); }}>
          {mod === "onay" ? "Reddet" : "Vazgeç"}
        </button>
        <button type="button" className={`${s.dugme} ${mod === "onay" ? s.turuncu : s.kirmizi}`} disabled={karar.isPending} onClick={tamam}>
          {karar.isPending ? "Kaydediliyor…" : mod === "onay" ? "Onayla ve paneli aç" : "Reddet"}
        </button>
      </div>
    </div>
  );
}

function AcentePenceresi({ a, onKapat }: { a: Acente | null; onKapat: () => void }) {
  const [son, setSon] = React.useState(a);
  if (a && a !== son) setSon(a);
  const x = a ?? son;
  return (
    <Pencere acik={!!a} onKapat={onKapat} baslik={x?.companyName ?? "Acente"} genislik={620}>
      {x && <AcenteIcerik key={x.id} a={x} onKapat={onKapat} />}
    </Pencere>
  );
}

function AcenteIcerik({ a, onKapat }: { a: Acente; onKapat: () => void }) {
  const istemci = useQueryClient();
  const bildiri = useBildiri();
  const [kom, setKom] = React.useState(String(a.commission));
  const [ind, setInd] = React.useState(String(a.discountRate));
  const [hata, setHata] = React.useState<string | null>(null);
  const [onay, setOnay] = React.useState(false);
  const aktif = a.isApproved && a.user.isActive;
  const kaydet = useMutation({
    mutationFn: (govde: Record<string, unknown>) => gonder(`/api/admin/agencies/${a.id}`, "PATCH", govde),
    onSuccess: (_, govde) => {
      istemci.invalidateQueries({ queryKey: ["yonetim"] });
      bildiri("isApproved" in govde ? (govde.isApproved ? "Acente açıldı; paneline girebilir" : "Acente kapatıldı; paneli kilitlendi") : "Kaydedildi");
      onKapat();
    },
    onError: (e: Error) => setHata(e.message),
  });
  return (
    <div className={s.pIc}>
      <div className={s.kutular}>
        <div className={s.kutucuk}><small>Yetkili</small><b>{a.user.name}</b><span>{a.user.email}</span></div>
        <div className={s.kutucuk}><small>Vergi</small><b>{a.taxId}{a.taxOffice ? ` · ${a.taxOffice} VD` : ""}</b><span>TÜRSAB {a.tursabNo || "—"}</span></div>
        <div className={s.kutucuk}><small>Bu yıl satış</small><b>{eur(a.yilSatis)}</b><span>{a._count.reservations} rezervasyon (toplam)</span></div>
        <div className={s.kutucuk}><small>Partner</small><b>{tarihUzun(a.createdAt)}</b>{!a.user.isActive && <span>Kullanıcı hesabı kapalı</span>}</div>
      </div>
      <span className={s.pEtiket}>Anlaşma</span>
      <div className={s.ikiAlan}>
        <Girdi id="d-kom" etiket="Komisyon (%)" type="number" min={0} max={90} value={kom} onDegis={setKom} />
        <Girdi id="d-ind" etiket="İndirim (%)" type="number" min={0} max={100} value={ind} onDegis={setInd} />
      </div>
      <p className={s.not}>Oran değişikliği yeni rezervasyonlara uygulanır ve denetim kaydına düşer.</p>
      {hata && <HataYazi>{hata}</HataYazi>}
      <div className={s.pAlt}>
        {onay ? (
          <>
            <span className={`${s.solda} ${s.soluk}`} style={{ alignSelf: "center" }}>{aktif ? "Paneli kilitlensin mi?" : "Paneli açılsın mı?"}</span>
            <button type="button" className={`${s.dugme} ${s.cerceve}`} onClick={() => setOnay(false)}>Vazgeç</button>
            <button type="button" className={`${s.dugme} ${aktif ? s.kirmizi : s.siyah}`} disabled={kaydet.isPending} onClick={() => kaydet.mutate({ isApproved: !aktif })}>
              {aktif ? "Acenteyi kapat" : "Acenteyi aç"}
            </button>
          </>
        ) : (
          <>
            <button type="button" className={`${s.dugme} ${s.cerceve} ${s.solda}`} onClick={() => setOnay(true)} disabled={!a.user.isActive} title={!a.user.isActive ? "Kullanıcı hesabı kapalı; Kullanıcılar sayfasından aç" : undefined}>
              {aktif ? "Acenteyi kapat" : "Acenteyi aç"}
            </button>
            <button
              type="button"
              className={`${s.dugme} ${s.siyah}`}
              disabled={kaydet.isPending}
              onClick={() => {
                const k = Number(kom), i = Number(ind);
                if (kom === "" || k < 0 || k > 90) return setHata("Komisyon 0 ile 90 arasında olmalı");
                if (ind === "" || i < 0 || i > 100) return setHata("İndirim 0 ile 100 arasında olmalı");
                kaydet.mutate({ commission: k, discountRate: i });
              }}
            >
              {kaydet.isPending ? "Kaydediliyor…" : "Kaydet"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
