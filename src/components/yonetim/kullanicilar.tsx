"use client";

// Yönetim › Kullanıcılar: rol çipleri (sayılı), ad/e-posta araması, sayfalı
// liste. "Yönet" penceresinde rol değişir, hesap kapatılır ya da açılır;
// hesap silinmez (rezervasyon geçmişi korunur). Yönetici kendi rolünü
// düşüremez, kendini kapatamaz (API de engeller).

import * as React from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { Ikon } from "@/components/lb/ikon";
import { Pencere } from "@/components/lb/pencere";
import { HataYazi, Secim, getir, gonder, sayi, tarihUzun, useBildiri } from "./ortak";
import s from "./yonetim.module.css";

type Rol = "CUSTOMER" | "AGENCY" | "ADMIN";
interface Kullanici {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Rol;
  isActive: boolean;
  createdAt: string;
  agency: { companyName: string; isApproved: boolean } | null;
  _count: { reservations: number };
}
interface Yanit {
  users: Kullanici[];
  rolSayilari: Partial<Record<Rol, number>>;
  pagination: { page: number; totalPages: number; total: number };
}
const ROL_AD: Record<Rol, string> = { CUSTOMER: "Müşteri", AGENCY: "Acente", ADMIN: "Yönetici" };

export function Kullanicilar() {
  const [rol, setRol] = React.useState<Rol | "">("");
  const [ara, setAra] = React.useState("");
  const [aranan, setAranan] = React.useState("");
  const [secili, setSecili] = React.useState<Kullanici | null>(null);
  React.useEffect(() => {
    const t = setTimeout(() => setAranan(ara.trim()), 300);
    return () => clearTimeout(t);
  }, [ara]);

  const q = useInfiniteQuery({
    queryKey: ["yonetim", "kullanicilar", rol, aranan],
    queryFn: ({ pageParam }) => {
      const u = new URLSearchParams({ page: String(pageParam), limit: "40" });
      if (rol) u.set("role", rol);
      if (aranan) u.set("search", aranan);
      return getir<Yanit>(`/api/admin/users?${u}`);
    },
    initialPageParam: 1,
    getNextPageParam: (son) => (son.pagination.page < son.pagination.totalPages ? son.pagination.page + 1 : undefined),
  });
  const liste = q.data?.pages.flatMap((p) => p.users) ?? [];
  const sayilar = q.data?.pages[0]?.rolSayilari;

  return (
    <div className={s.dis}>
      <div className={s.sayfaBas}>
        <h1 className="lb-y">Kullanıcılar</h1>
        {sayilar && (
          <span className={s.soluk}>
            {sayi(sayilar.CUSTOMER ?? 0)} müşteri · {sayi(sayilar.AGENCY ?? 0)} acente · {sayi(sayilar.ADMIN ?? 0)} yönetici
          </span>
        )}
      </div>
      <div className={s.araclar}>
        <div className={s.cipler} role="group" aria-label="Rol">
          <button type="button" className={s.cip} aria-pressed={!rol} onClick={() => setRol("")}>Hepsi</button>
          {(["CUSTOMER", "AGENCY", "ADMIN"] as const).map((r) => (
            <button key={r} type="button" className={s.cip} aria-pressed={rol === r} onClick={() => setRol(r)}>{ROL_AD[r]}</button>
          ))}
        </div>
        <label className={s.arama}>
          <Ikon ad="search" boyut={17} />
          <input type="search" value={ara} onChange={(e) => setAra(e.target.value)} placeholder="Ad ya da e-posta" aria-label="Kullanıcılarda ara" />
        </label>
      </div>
      {q.isPending ? (
        <div className={s.iskelet} aria-busy="true" />
      ) : q.isError ? (
        <div className={s.bos}><b>Kullanıcılar alınamadı</b><button type="button" className={`${s.dugme} ${s.siyah}`} onClick={() => q.refetch()}>Tekrar dene</button></div>
      ) : (
        <div className={s.tabloKap}>
          <table className={s.tablo}>
            <thead>
              <tr><th>Kullanıcı</th><th>Rol</th><th>Durum</th><th className={s.sagHiz}>Rezervasyon</th><th>Üyelik</th><th /></tr>
            </thead>
            <tbody>
              {liste.map((k) => (
                <tr key={k.id}>
                  <td>
                    <div className={s.hucre}>
                      <span className={s.harf}>{k.name.trim()[0]?.toLocaleUpperCase("tr") ?? "?"}</span>
                      <div><b>{k.name}</b><span>{k.email}{k.agency ? ` · ${k.agency.companyName}` : ""}</span></div>
                    </div>
                  </td>
                  <td><span className={s.rol} data-rol={k.role}>{ROL_AD[k.role]}</span></td>
                  <td><span className={s.rozet} data-renk={k.isActive ? "yesil" : "gri"}>{k.isActive ? "Etkin" : "Kapalı"}</span></td>
                  <td className={s.sagHiz}>{k._count.reservations}</td>
                  <td className={s.no}>{tarihUzun(k.createdAt)}</td>
                  <td><button type="button" className={s.metinDugme} onClick={() => setSecili(k)}>Yönet</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!liste.length && <div className={s.tabloBos}>Aramaya uyan kullanıcı yok.</div>}
          {q.hasNextPage && (
            <div className={s.dahaFazla}>
              <button type="button" className={`${s.dugme} ${s.cerceve}`} disabled={q.isFetchingNextPage} onClick={() => q.fetchNextPage()}>
                {q.isFetchingNextPage ? "Yükleniyor…" : "Daha fazla göster"}
              </button>
            </div>
          )}
        </div>
      )}
      <KullaniciPenceresi k={secili} onKapat={() => setSecili(null)} />
    </div>
  );
}

function KullaniciPenceresi({ k, onKapat }: { k: Kullanici | null; onKapat: () => void }) {
  const [son, setSon] = React.useState(k);
  if (k && k !== son) setSon(k);
  const x = k ?? son;
  return (
    <Pencere acik={!!k} onKapat={onKapat} baslik={x?.name ?? "Kullanıcı"} genislik={520}>
      {x && <KullaniciIcerik key={x.id} k={x} onKapat={onKapat} />}
    </Pencere>
  );
}

function KullaniciIcerik({ k, onKapat }: { k: Kullanici; onKapat: () => void }) {
  const { data: oturum } = useSession();
  const ben = oturum?.user?.id === k.id;
  const istemci = useQueryClient();
  const bildiri = useBildiri();
  const [rol, setRol] = React.useState<Rol>(k.role);
  const [kapatOnay, setKapatOnay] = React.useState(false);
  const [hata, setHata] = React.useState<string | null>(null);
  const kaydet = useMutation({
    mutationFn: (govde: { role?: Rol; isActive?: boolean }) => gonder(`/api/admin/users/${k.id}`, "PATCH", govde),
    onSuccess: (_, g) => {
      istemci.invalidateQueries({ queryKey: ["yonetim"] });
      bildiri(g.isActive === false ? "Hesap kapatıldı; giriş yapamaz" : g.isActive ? "Hesap açıldı" : "Kaydedildi");
      onKapat();
    },
    onError: (e: Error) => setHata(e.message),
  });
  return (
    <div className={s.form}>
      <p className={s.soluk} style={{ margin: 0 }}>
        {k.email}{k.phone ? ` · ${k.phone}` : ""} · {tarihUzun(k.createdAt)} üye · {k._count.reservations} rezervasyon
      </p>
      <Secim id="u-rol" etiket="Rol" deger={rol} onDegis={(v) => setRol(v as Rol)}>
        <option value="CUSTOMER">Müşteri</option>
        <option value="AGENCY">Acente</option>
        <option value="ADMIN">Yönetici</option>
      </Secim>
      <p className={s.not}>
        {ben
          ? "Kendi rolünü değiştiremez, hesabını kapatamazsın."
          : "Rolü acente yapmak panel açmaz; panel yalnız onaylı başvuruyla açılır. Hesap silinmez, kapatılır: rezervasyon geçmişi korunur."}
      </p>
      {hata && <HataYazi>{hata}</HataYazi>}
      <div className={s.pAlt}>
        {!ben && (kapatOnay ? (
          <span className={s.solda}>
            <span className={s.soluk}>Oturumu hemen kapansın mı?</span>{" "}
            <button type="button" className={`${s.metinDugme} ${s.tehlike}`} disabled={kaydet.isPending} onClick={() => kaydet.mutate({ isActive: false })}>
              Evet, kapat
            </button>{" "}
            <button type="button" className={s.metinDugme} onClick={() => setKapatOnay(false)}>Vazgeç</button>
          </span>
        ) : (
          <button
            type="button"
            className={`${s.dugme} ${s.cerceve} ${s.solda}`}
            disabled={kaydet.isPending}
            // Kapatmak kullanıcının oturumunu hemen düşürür: bir kez daha sorulur.
            onClick={() => (k.isActive ? setKapatOnay(true) : kaydet.mutate({ isActive: true }))}
          >
            {k.isActive ? "Hesabı kapat" : "Hesabı aç"}
          </button>
        ))}
        <button type="button" className={`${s.dugme} ${s.siyah}`} disabled={kaydet.isPending || rol === k.role || ben} onClick={() => kaydet.mutate({ role: rol })}>
          {kaydet.isPending ? "Kaydediliyor…" : "Rolü kaydet"}
        </button>
      </div>
    </div>
  );
}
