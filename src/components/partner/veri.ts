"use client";

// Partner paneli veri kancaları.

import { useQuery } from "@tanstack/react-query";
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

/** Acentenin rezervasyonları (en fazla 100). `gelecek`: konaklaması bitmemiş, aktif olanlar. */
export async function rezervasyonlariGetir(zaman?: "gelecek"): Promise<Rezervasyon[]> {
  const d = await getir<{ data: Rezervasyon[] }>(`/api/reservations?limit=100${zaman ? `&zaman=${zaman}` : ""}`);
  return d.data;
}

export const useKazanc = () =>
  useQuery({ queryKey: ["partner-kazanc"], queryFn: () => getir<Kazanc>("/api/agency/kazanc"), staleTime: 5 * 60_000 });

export const useSirket = () =>
  useQuery({
    queryKey: ["partner-sirket"],
    queryFn: async () => (await getir<{ agency: Sirket }>("/api/agency/dashboard")).agency,
    staleTime: 10 * 60_000,
  });
