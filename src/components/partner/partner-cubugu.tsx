"use client";

// LookBeds Partner üst çubuğu (Airbnb ev sahibi paneli gibi): solda marka,
// ortada Bugün · Rezervasyonlar · Kazançlar, sağda "Otel ara", bildirim zili
// ve hesap menüsü. Mobilde sekmeler ekranın altına iner. Onaysız acentede
// (kilitli) sekmeler ve panel linkleri gizlenir; yalnız zil, yardım ve çıkış
// kalır (başvurunun onayı da bildirim olarak gelir).

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { signOut, useSession } from "next-auth/react";
import { Ikon } from "@/components/lb/ikon";
import { Nesne, type NesneAdi } from "@/components/lb/nesne";
import { gecenSure } from "./ortak";
import { BILDIRIM_ANAHTARI, okunduYap, useBildirimler, type Bildirim, type BildirimKutusu } from "./veri";
import s from "./partner.module.css";

const SEKMELER = [
  { href: "/agency/dashboard", ad: "Bugün" },
  { href: "/agency/reservations", ad: "Rezervasyonlar" },
  { href: "/agency/kazanclar", ad: "Kazançlar" },
];

/** Dışarı tıklayınca ya da Escape'le kapat (Escape, odak içerideyse onu düğmeye döndürür). */
function useDisariKapat(acik: boolean, kapat: () => void, kok: React.RefObject<HTMLElement | null>, dugme?: React.RefObject<HTMLElement | null>) {
  React.useEffect(() => {
    if (!acik) return;
    const dis = (e: PointerEvent) => !kok.current?.contains(e.target as Node) && kapat();
    const tus = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (dugme && kok.current?.contains(document.activeElement)) dugme.current?.focus();
      kapat();
    };
    document.addEventListener("pointerdown", dis);
    document.addEventListener("keydown", tus);
    return () => {
      document.removeEventListener("pointerdown", dis);
      document.removeEventListener("keydown", tus);
    };
  }, [acik, kapat, kok, dugme]);
}

export function PartnerCubugu({ kilitli = false }: { kilitli?: boolean }) {
  const yol = usePathname();
  const { data: oturum } = useSession();
  const [acik, setAcik] = React.useState(false);
  const kok = React.useRef<HTMLDivElement>(null);
  const kapat = React.useCallback(() => setAcik(false), []);
  useDisariKapat(acik, kapat, kok);

  const ad = oturum?.user?.name ?? "";
  const bas = ad
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toLocaleUpperCase("tr"))
    .join("");

  return (
    <header className={s.ust}>
      <div className={s.ustIc}>
        <Link href="/agency/dashboard" className={s.marka}>
          <span className="lb-y">LookBeds</span>
          <small>Partner</small>
        </Link>
        {kilitli ? (
          <span className={s.bosluk} />
        ) : (
          <nav className={s.sekmeler} aria-label="Panel">
            {SEKMELER.map((k) => (
              <Link key={k.href} href={k.href} aria-current={yol?.startsWith(k.href) ? "page" : undefined}>
                {k.ad}
              </Link>
            ))}
          </nav>
        )}
        <div className={s.sag}>
          <Link href="/" className={s.araDugme}>
            <Ikon ad="search" boyut={16} kalinlik={2.6} />
            <span>Otel ara</span>
          </Link>
          <BildirimZili kilitli={kilitli} />
          <div className={s.menuKok} ref={kok}>
            <button type="button" className={s.menuDugme} aria-expanded={acik} aria-haspopup="true" onClick={() => setAcik((a) => !a)} aria-label="Hesap menüsü">
              <Ikon ad="menu" boyut={18} />
              <span className={s.avatar}>{bas || <Ikon ad="user" boyut={16} />}</span>
            </button>
            <nav className={s.acilir} data-acik={acik || undefined} aria-label="Hesap menüsü">
              <div className={s.kimlik}>
                <b>{ad || "Acente hesabı"}</b>
                <span>{oturum?.user?.email}</span>
              </div>
              <hr />
              {!kilitli && (
                <>
                  <Link href="/agency/company" onClick={kapat}><Ikon ad="hotel" boyut={18} />Şirket bilgileri</Link>
                  <Link href="/agency/kazanclar" onClick={kapat}><Ikon ad="wallet" boyut={18} />Kazançlar</Link>
                  <Link href="/agency/reservations" onClick={kapat}><Ikon ad="calendar" boyut={18} />Rezervasyonlar</Link>
                  <hr />
                </>
              )}
              <Link href="/yardim?kitle=acente" onClick={kapat}><Ikon ad="help" boyut={18} />Yardım ve destek</Link>
              <button type="button" onClick={() => signOut({ callbackUrl: "/agency/login" })}><Ikon ad="logout" boyut={18} />Çıkış yap</button>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}

/* ── Bildirim zili ── */

const NESNE: Record<string, NesneAdi> = { AGENCY_APPROVED: "anahtar-karti" };
/** Tıklanınca açılan sayfa (panel açıkken). */
const BAG: Record<string, string> = { AGENCY_APPROVED: "/agency/dashboard" };
const simdiAl = () => Date.now();

/**
 * Okunmamış varsa turuncu nokta; tıklayınca son 10 bildirim. Panel açılınca
 * görünen okunmamışlar okundu sayılır (bu açılışta "yeni" diye işaretli
 * kalır); bir bildirime tıklamak da onu okundu yapar.
 */
function BildirimZili({ kilitli }: { kilitli: boolean }) {
  const router = useRouter();
  const istemci = useQueryClient();
  const q = useBildirimler();
  const [acik, setAcik] = React.useState(false);
  const [simdi, setSimdi] = React.useState(simdiAl);
  const [yeniler, setYeniler] = React.useState<string[]>([]);
  const kok = React.useRef<HTMLDivElement>(null);
  const dugme = React.useRef<HTMLButtonElement>(null);
  const panelNo = React.useId();
  const kapat = React.useCallback(() => setAcik(false), []);
  useDisariKapat(acik, kapat, kok, dugme);

  const liste = q.data?.bildirimler ?? [];
  const okunmamis = q.data?.okunmamis ?? 0;

  // Önbellek hemen güncellenir (nokta hemen söner), sonra sunucudan tazelenir.
  const oku = useMutation({
    mutationFn: async (hedef: string[] | "hepsi") => {
      if (hedef === "hepsi") await okunduYap({ hepsi: true });
      else await Promise.all(hedef.map((id) => okunduYap({ id })));
    },
    onMutate: async (hedef) => {
      await istemci.cancelQueries({ queryKey: BILDIRIM_ANAHTARI });
      istemci.setQueryData<BildirimKutusu>(BILDIRIM_ANAHTARI, (d) => {
        if (!d) return d;
        const okunacak = (b: Bildirim) => !b.isRead && (hedef === "hepsi" || hedef.includes(b.id));
        const n = d.bildirimler.filter(okunacak).length;
        return {
          ...d,
          okunmamis: hedef === "hepsi" ? 0 : Math.max(0, d.okunmamis - n),
          bildirimler: d.bildirimler.map((b) => (okunacak(b) ? { ...b, isRead: true } : b)),
        };
      });
    },
    onSettled: () => istemci.invalidateQueries({ queryKey: BILDIRIM_ANAHTARI }),
  });

  const degistir = () => {
    if (acik) {
      setAcik(false);
      return;
    }
    const okunmamislar = liste.filter((b) => !b.isRead).map((b) => b.id);
    setYeniler(okunmamislar);
    setSimdi(Date.now());
    setAcik(true);
    if (okunmamislar.length) oku.mutate(okunmamislar);
  };

  const tikla = (b: Bildirim) => {
    setYeniler((y) => y.filter((id) => id !== b.id));
    if (!b.isRead) oku.mutate([b.id]);
    if (kilitli && b.type === "AGENCY_APPROVED") {
      // Onay geldi: panel düzeni sunucuda yeniden okunsun, kilit kalksın.
      setAcik(false);
      router.refresh();
    } else if (!kilitli && BAG[b.type]) setAcik(false);
  };

  const hepsiniOku = () => {
    setYeniler([]);
    oku.mutate("hepsi");
  };

  return (
    <div className={s.zilKok} ref={kok}>
      <button
        ref={dugme}
        type="button"
        className={s.zil}
        aria-expanded={acik}
        aria-controls={panelNo}
        aria-label={okunmamis ? `Bildirimler, ${okunmamis} okunmamış` : "Bildirimler"}
        onClick={degistir}
      >
        <Ikon ad="bell" boyut={20} />
        {okunmamis > 0 && <i />}
      </button>
      <section id={panelNo} className={s.bildirimPanel} data-acik={acik || undefined} aria-label="Bildirimler">
        <div className={s.bildirimBas}>
          <b>Bildirimler</b>
          <button type="button" className={s.metinDugme} disabled={!okunmamis} onClick={hepsiniOku}>
            Tümünü okundu say
          </button>
        </div>
        {q.isPending ? (
          <p className={s.bildirimDurum} aria-busy="true">Yükleniyor…</p>
        ) : !q.data ? (
          <div className={s.bildirimDurum}>
            <span>Bildirimler şu an alınamadı.</span>
            <button type="button" className={s.metinDugme} onClick={() => q.refetch()}>Tekrar dene</button>
          </div>
        ) : liste.length ? (
          <ul className={s.bildirimListe}>
            {liste.map((b) => {
              const yeni = !b.isRead || yeniler.includes(b.id);
              const href = kilitli ? undefined : BAG[b.type];
              const ic = (
                <>
                  <Nesne ad={NESNE[b.type] ?? "zil"} boyut={32} />
                  <span className={s.bildirimMetin}>
                    <b>{yeni && <span className={s.gizli}>Yeni: </span>}{b.title}</b>
                    <span>{b.message}</span>
                    <small>{gecenSure(b.createdAt, simdi)}</small>
                  </span>
                </>
              );
              return (
                <li key={b.id}>
                  {href ? (
                    <Link href={href} className={s.bildirimOge} data-yeni={yeni || undefined} onClick={() => tikla(b)}>{ic}</Link>
                  ) : (
                    <button type="button" className={s.bildirimOge} data-yeni={yeni || undefined} onClick={() => tikla(b)}>{ic}</button>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <div className={s.bildirimBos}>
            <Nesne ad="zil" boyut={56} />
            <b>Bildirim yok</b>
            <span>Hesabınla ilgili gelişmeler burada görünür.</span>
          </div>
        )}
      </section>
    </div>
  );
}
