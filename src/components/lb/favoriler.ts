"use client";

// Favoriler (kalp). Girişsiz: bu cihazda (localStorage). Girişli: hesapta
// (/api/favoriler); liste react-query önbelleğinde ["favoriler"] anahtarıyla
// durur, kancayı kullanan bütün bileşenler aynı listeyi görür. Girişte
// cihazdaki favoriler bir kez hesaba eklenir, sonra cihazdan silinir.
//
// Dönüş eskisiyle aynı: { fav, degistir, hazir }. fav eskiden yeniye sıralı
// (localStorage'daki gibi); /favoriler ters çevirip en yeniyi başa alıyor.

import * as React from "react";
import { useSession } from "next-auth/react";
import {
  queryOptions,
  useMutation,
  useMutationState,
  useQuery,
  useQueryClient,
  type Mutation,
  type QueryClient,
} from "@tanstack/react-query";

const ANAHTAR = "lookbet.favoriler";
const SORGU = ["favoriler"] as const;
/** API tek istekte en fazla bu kadar kod alıyor. */
const PARCA = 200;

/**
 * Kalbe basış: sunucuya gidene kadar ekranda listenin üstüne uygulanır.
 * kullanici basış anındaki hesap: mutasyonun seçenekleri her çizimde
 * yenilendiği için oturum değişimi kapanıştan değil buradan anlaşılır.
 */
type Degisim = { kod: string; ekle: boolean; kullanici: string };

// --- Cihazdaki liste (girişsiz) ---

const dinleyiciler = new Set<() => void>();
/** Bellekteki kopya; null: henüz okunmadı. localStorage yazılamasa da sayfa açıkken bu geçerli. */
let cihazdaki: string[] | null = null;

function diskten(): string[] {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(ANAHTAR) ?? "[]");
    if (!Array.isArray(v)) return [];
    return [...new Set(v.filter((k): k is string => typeof k === "string" && k.length > 0 && k.length <= 50))];
  } catch {
    // Bozuk kayıt, gizli sekme, kapalı site verisi: boş liste.
    return [];
  }
}

function cihazListesi(): string[] {
  cihazdaki ??= diskten();
  return cihazdaki;
}

function cihazaYaz(liste: string[]) {
  cihazdaki = liste;
  try {
    if (liste.length) localStorage.setItem(ANAHTAR, JSON.stringify(liste));
    else localStorage.removeItem(ANAHTAR);
  } catch {
    // Kota dolu ya da yazma kapalı: bellekte kalır.
  }
  dinleyiciler.forEach((d) => d());
}

function cihazaAbone(d: () => void) {
  dinleyiciler.add(d);
  // Başka sekmedeki değişiklik (kalp, girişte temizlik) bu sekmeye de yansısın.
  const depo = (e: StorageEvent) => {
    if (e.key !== ANAHTAR && e.key !== null) return;
    cihazdaki = null;
    d();
  };
  window.addEventListener("storage", depo);
  return () => {
    dinleyiciler.delete(d);
    window.removeEventListener("storage", depo);
  };
}

// Sunucuda ve hidrasyonda localStorage okunamaz: "henüz bilinmiyor".
const sunucudaCihaz = () => null;

// --- Hesaptaki liste (girişli) ---

async function yanit(r: Response): Promise<string[]> {
  const d = await r.json().catch(() => null);
  if (!r.ok || !Array.isArray(d?.kodlar)) throw new Error(d?.error ?? "Favoriler güncellenemedi");
  return d.kodlar;
}

const listeyiAl = () => fetch("/api/favoriler", { cache: "no-store" }).then(yanit);

const hesabaEkle = (kodlar: string[]) =>
  fetch("/api/favoriler", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kodlar }),
  }).then(yanit);

const hesaptanCikar = (kod: string) =>
  fetch(`/api/favoriler?kod=${encodeURIComponent(kod)}`, { method: "DELETE" }).then(yanit);

// Girişte cihazdakileri hesaba ekleme: oturum başına bir kez. Kancayı kullanan
// her bileşen ve listenin yeniden okunması aynı işi bekler, iki kez göndermez.
let birlesme: { kullanici: string; is: Promise<void> } | null = null;
// Hesaba eklenmiş ama cihazdan henüz silinmemiş kodlar. Hesaptaki liste ekrana
// gelince silinir; önce silinseydi kalpler bir an boş görünürdü.
let silinecek: string[] = [];
// Son bilinen oturum sahibi; undefined: sayfa açıldığından beri henüz belli değil.
let sonKimlik: string | null | undefined;

function birlestir(kullanici: string) {
  if (birlesme?.kullanici !== kullanici) birlesme = { kullanici, is: cihazdakileriGonder() };
  return birlesme.is;
}

async function cihazdakileriGonder() {
  const liste = cihazListesi();
  try {
    for (let i = 0; i < liste.length; i += PARCA) {
      const parca = liste.slice(i, i + PARCA);
      await hesabaEkle(parca);
      // Katalogda olmayan kodu sunucu atlar; cihazdan o da silinir.
      silinecek = [...silinecek, ...parca];
    }
  } catch {
    // Gönderilemeyenler cihazda kalır; sayfa yeniden açılınca tekrar denenir.
  }
}

function eklenenleriCihazdanSil() {
  if (!silinecek.length) return;
  const giden = new Set(silinecek);
  silinecek = [];
  cihazaYaz(cihazListesi().filter((k) => !giden.has(k)));
}

/** Oturum sahibi değiştiyse (ör. başka sekmede çıkış ya da başka hesapla giriş) öncekinin izlerini temizler. */
function oturumuIzle(qc: QueryClient, kimlik: string | null) {
  if (kimlik === sonKimlik) return;
  const ilk = sonKimlik === undefined;
  sonKimlik = kimlik;
  // Çıkışta sıfırla: sonraki girişte o arada cihaza eklenenler de hesaba geçsin.
  if (kimlik === null) birlesme = null;
  // Önceki hesabın listesi yeni oturumda görünmesin. signOut sayfayı
  // yenilediği için bu sekmede nadir; başka sekmedeki çıkış/giriş getirir.
  if (!ilk && qc.getQueryData(SORGU) !== undefined) void qc.resetQueries({ queryKey: SORGU, exact: true });
}

const sorguSecenekleri = (kullanici: string) =>
  queryOptions({
    queryKey: SORGU,
    // Önce cihazdakiler eklenir: liste onlarla birlikte gelsin, sonradan eklenenle yarışmasın.
    queryFn: async () => {
      await birlestir(kullanici);
      return listeyiAl();
    },
    staleTime: 60_000,
  });

const BEKLEYEN = { mutationKey: SORGU, status: "pending" } as const;
const degisimi = (m: Mutation) => m.state.variables as Degisim;

/** Ekrandaki liste, eskiden yeniye: hesaptaki (yoksa cihazdaki) liste ve üstüne bu hesabın yoldaki basışları. */
function gorunum(hesap: readonly string[] | undefined, cihaz: string[], bekleyen: Degisim[], kullanici: string): string[] {
  const s = new Set(hesap ? [...hesap].reverse() : cihaz);
  for (const d of bekleyen) {
    if (d.kullanici !== kullanici) continue;
    if (d.ekle) s.add(d.kod);
    else s.delete(d.kod);
  }
  return [...s];
}

export function useFavoriler() {
  const qc = useQueryClient();
  const { data: oturum, status } = useSession();
  // "loading" iki durumda: sayfa ilk açılırken (oturum yok, cihazdakiler
  // gösterilir) ve useSession().update() sürerken (oturum var, hesap sürer).
  const kullanici = status === "unauthenticated" ? null : (oturum?.user?.id ?? null);
  const hesapta = kullanici !== null;

  const cihaz = React.useSyncExternalStore<string[] | null>(cihazaAbone, cihazListesi, sunucudaCihaz);
  const sorgu = useQuery({ ...sorguSecenekleri(kullanici ?? ""), enabled: hesapta });
  const bekleyen = useMutationState({ filters: BEKLEYEN, select: degisimi });

  const { mutate } = useMutation({
    mutationKey: SORGU,
    // Sırayla: aynı otele art arda basışlar sunucuya da bu sırayla ulaşsın.
    scope: { id: "favoriler" },
    mutationFn: async (d: Degisim) => {
      // Girişteki birleştirme ve ilk liste bitmeden gönderilen basışın
      // dönen listesi eksik kalabilirdi.
      await qc.ensureQueryData(sorguSecenekleri(d.kullanici));
      return d.ekle ? hesabaEkle([d.kod]) : hesaptanCikar(d.kod);
    },
    onSuccess: async (kodlar, d) => {
      // Bu arada oturum değiştiyse eski hesabın listesini yazma.
      if (sonKimlik !== undefined && sonKimlik !== d.kullanici) return;
      // Yoldaki eski bir okuma bu listeyi ezmesin.
      await qc.cancelQueries({ queryKey: SORGU, exact: true });
      qc.setQueryData(SORGU, kodlar);
    },
    // Hata: basış mutasyonla birlikte ekrandan düşer (geri alınır); liste
    // sunucuyla yeniden eşitlenir (istek yarıda kalmış olabilir).
    onError: () => {
      void qc.invalidateQueries({ queryKey: SORGU, exact: true });
    },
  });

  React.useEffect(() => {
    if (status !== "loading") oturumuIzle(qc, kullanici);
  }, [status, kullanici, qc]);

  const listeZamani = sorgu.dataUpdatedAt;
  React.useEffect(() => {
    if (hesapta && listeZamani) eklenenleriCihazdanSil();
  }, [hesapta, listeZamani]);

  const hesapListesi = sorgu.data;
  const fav = React.useMemo(
    () => new Set(kullanici !== null ? gorunum(hesapListesi, cihaz ?? [], bekleyen, kullanici) : (cihaz ?? [])),
    [kullanici, hesapListesi, cihaz, bekleyen]
  );

  const degistir = React.useCallback(
    (kod: string) => {
      if (kullanici === null) {
        const liste = cihazListesi();
        cihazaYaz(liste.includes(kod) ? liste.filter((k) => k !== kod) : [...liste, kod]);
        return;
      }
      // Yön ekranda görünene göre (yoldaki basışlar dahil): boş kalbe basan
      // eklemek ister. Önbellekten o an okunur; art arda basışlar da doğru yönde.
      const gorunen = gorunum(
        qc.getQueryData<string[]>(SORGU),
        cihazListesi(),
        qc.getMutationCache().findAll(BEKLEYEN).map(degisimi),
        kullanici
      );
      mutate({ kod, ekle: !gorunen.includes(kod), kullanici });
    },
    [kullanici, qc, mutate]
  );

  // Oturum belli olmadan ya da hesaptaki liste ilk kez gelmeden hazır değil.
  const hazir = cihaz !== null && status !== "loading" && !(hesapta && sorgu.isPending);

  return { fav, degistir, hazir };
}
