"use client";

// Partner paneli veri kancaları.

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import type { Rezervasyon } from "@/components/rezervasyonlar/ortak";

export interface Kazanc {
  komisyonOrani: number;
  indirimOrani: number;
  paraBirimi: string;
  aylar: { ay: string; satis: number; komisyon: number; adet: number }[];
}

export interface Sirket {
  companyName: string;
  taxId: string;
  taxOffice: string | null;
  tursabNo: string | null;
  website: string | null;
  address: string | null;
  phone: string | null;
  discountRate: number;
  commission: number;
  isApproved: boolean;
  createdAt: string;
}

async function getir<T>(adres: string): Promise<T> {
  const r = await fetch(adres);
  if (!r.ok) throw new Error("Veri alınamadı");
  return r.json();
}

/** Acentenin rezervasyonları (en fazla 100). `gelecek`: konaklaması bitmemiş, aktif olanlar. Bugün ekranı bunu kullanır. */
export async function rezervasyonlariGetir(zaman?: "gelecek"): Promise<Rezervasyon[]> {
  const d = await getir<{ data: Rezervasyon[] }>(`/api/reservations?limit=100${zaman ? `&zaman=${zaman}` : ""}`);
  return d.data;
}

/* ── Rezervasyonlar ekranı: sayfalı liste ve Excel'e aktarma ── */

/** Sunucudaki süzgeç: gelecek (aktif, bitmemiş) · gecmis (aktif, bitmiş) · iptal (iptal/başarısız). Yoksa hepsi. */
export type Zaman = "gelecek" | "gecmis" | "iptal";

interface RezSayfasi {
  data: Rezervasyon[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
}

const rezAdresi = (zaman: Zaman | undefined, sayfa: number, limit: number) =>
  `/api/reservations?limit=${limit}&page=${sayfa}${zaman ? `&zaman=${zaman}` : ""}`;

/** Sayfalar birleşirken yinelenen kaydı at: sıra anahtarı eşit kayıtlar sayfa sınırında iki kez gelebilir. */
export function tekil<T extends { id: string }>(liste: T[]): T[] {
  const gorulen = new Set<string>();
  return liste.filter((r) => {
    if (gorulen.has(r.id)) return false;
    gorulen.add(r.id);
    return true;
  });
}

/** Rezervasyonlar ekranı: 50'şer sayfa, "Daha fazla göster" sonrakini ekler; sıra sunucudan. */
export const useRezervasyonSayfalari = (zaman?: Zaman) =>
  useInfiniteQuery({
    queryKey: ["partner-rez", "sayfa", zaman ?? "hepsi"],
    queryFn: ({ pageParam }) => getir<RezSayfasi>(rezAdresi(zaman, pageParam, 50)),
    initialPageParam: 1,
    getNextPageParam: (son) => (son.pagination.page < son.pagination.totalPages ? son.pagination.page + 1 : undefined),
  });

/** Excel'e aktarmada en fazla satır. */
export const AKTARMA_SINIRI = 2000;
const PARCA = 100; // API'nin en büyük sayfası

/** Excel'e aktarma: süzgecin tüm sayfaları sırayla, en fazla AKTARMA_SINIRI satır. `kesildi`: sunucuda daha fazlası var. */
export async function tumRezervasyonlar(zaman?: Zaman): Promise<{ liste: Rezervasyon[]; toplam: number; kesildi: boolean }> {
  const liste: Rezervasyon[] = [];
  let toplam = 0;
  for (let sayfa = 1; sayfa <= AKTARMA_SINIRI / PARCA; sayfa++) {
    const d = await getir<RezSayfasi>(rezAdresi(zaman, sayfa, PARCA));
    toplam = d.pagination.total;
    liste.push(...d.data);
    if (sayfa >= d.pagination.totalPages) break;
  }
  return { liste: tekil(liste).slice(0, AKTARMA_SINIRI), toplam, kesildi: toplam > AKTARMA_SINIRI };
}

export const useKazanc = () =>
  useQuery({ queryKey: ["partner-kazanc"], queryFn: () => getir<Kazanc>("/api/agency/kazanc"), staleTime: 5 * 60_000 });

export const useSirket = () =>
  useQuery({
    queryKey: ["partner-sirket"],
    queryFn: async () => (await getir<{ agency: Sirket }>("/api/agency/dashboard")).agency,
    staleTime: 10 * 60_000,
  });

/* ── Bildirimler (üst çubuktaki zil) ── */

export interface Bildirim {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}
export interface BildirimKutusu {
  bildirimler: Bildirim[];
  okunmamis: number;
  pagination: { page: number; totalPages: number };
}

export const BILDIRIM_ANAHTARI = ["partner-bildirim"];

/** Son 10 bildirim ve okunmamış sayısı; yönetim zili gibi iki dakikada bir yenilenir. */
export const useBildirimler = () =>
  useQuery({
    queryKey: BILDIRIM_ANAHTARI,
    queryFn: () => getir<BildirimKutusu>("/api/bildirimler?limit=10"),
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

/** Okundu işareti: { id } tek bildirim, { hepsi: true } tümü. */
export async function okunduYap(govde: { id: string } | { hepsi: true }): Promise<void> {
  const r = await fetch("/api/bildirimler", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(govde),
  });
  if (!r.ok) throw new Error("Bildirim güncellenemedi");
}
