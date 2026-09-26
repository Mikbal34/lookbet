"use client";

// Aramanın uyruğu (Etscore fiyatı uyruğa göre değişebiliyor): adreste varsa
// o; yoksa girişli kullanıcıda hesaptaki uyruk (Hesabım › Kişisel bilgiler),
// o da yoksa TR. Oturum ve profil bilinene kadar `hazir` false — arama iki kez
// gitmesin (önce TR, sonra hesaptaki uyrukla).

import { useSession } from "next-auth/react";
import { useProfil } from "@/components/hesap/veri";

export function useUyruk(adresteki: string | null): { uyruk: string; hazir: boolean } {
  const { status } = useSession();
  const girisli = status === "authenticated";
  const profil = useProfil(girisli && !adresteki);
  if (adresteki) return { uyruk: adresteki, hazir: true };
  if (status === "loading") return { uyruk: "TR", hazir: false };
  if (!girisli) return { uyruk: "TR", hazir: true };
  // Profil alınamazsa varsayılanla devam (arama engellenmesin).
  if (profil.isPending) return { uyruk: "TR", hazir: false };
  return { uyruk: profil.data?.nationality || "TR", hazir: true };
}
