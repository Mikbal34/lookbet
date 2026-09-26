"use client";

// Hesap sayfalarının veri kancaları: profil ve kayıtlı misafirler.

import { useQuery } from "@tanstack/react-query";

export interface Profil {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  birthDate: string | null;
  nationality: string | null;
  role: string;
  createdAt: string;
}

export interface KayitliMisafir {
  id: string;
  name: string;
  surname: string;
  birthDate: string;
  gender: "Male" | "Female" | null;
}

export const useProfil = (etkin = true) =>
  useQuery({
    queryKey: ["profil"],
    queryFn: async (): Promise<Profil> => {
      const r = await fetch("/api/profile");
      if (!r.ok) throw new Error("Profil alınamadı");
      return (await r.json()).user;
    },
    enabled: etkin,
    staleTime: 60_000,
  });

export const useKayitliMisafirler = (etkin = true) =>
  useQuery({
    queryKey: ["kayitli-misafirler"],
    queryFn: async (): Promise<KayitliMisafir[]> => {
      const r = await fetch("/api/profile/misafirler");
      if (!r.ok) throw new Error("Misafirler alınamadı");
      return (await r.json()).misafirler;
    },
    enabled: etkin,
    staleTime: 60_000,
  });

/** YYYY-AA-GG ↔ GG.AA.YYYY */
export const tarihGoster = (iso: string | null) => (iso ? iso.split("-").reverse().join(".") : "");
export const tarihOku = (g: string) => {
  const m = g.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : "";
};
export const tarihMaskesi = (v: string) => {
  const r = v.replace(/\D/g, "").slice(0, 8);
  return [r.slice(0, 2), r.slice(2, 4), r.slice(4)].filter(Boolean).join(".");
};
