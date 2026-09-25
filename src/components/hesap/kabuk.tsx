"use client";

// Hesap sayfalarının kabuğu: üst çubuk, alt bilgi ve oturum denetimi.
// Girişsizse giriş penceresini önerir; acente ve yönetici kendi paneline gider.

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { UstCubuk } from "@/components/lb/ust-cubuk";
import { AltBilgi } from "@/components/lb/alt-bilgi";
import { Ikon } from "@/components/lb/ikon";
import { Nesne } from "@/components/lb/nesne";
import { BOS_ARAMA, aramaAdresi } from "@/components/lb/arama/durum";
import { useGiris } from "@/components/lb/giris/giris-saglayici";
import s from "./hesap.module.css";

export function HesapKabugu({ kirinti, herkeseAcik, children }: {
  /** Alt sayfalarda "Hesap › …" yolu. */
  kirinti?: string;
  /** Favoriler gibi girişsiz de açılan sayfalar. */
  herkeseAcik?: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { data: oturum, status } = useSession();
  const giris = useGiris();
  const [arama, setArama] = React.useState(BOS_ARAMA);
  const rol = oturum?.user?.role;
  const panel = herkeseAcik ? null : rol === "AGENCY" ? "/agency/company" : rol === "ADMIN" ? "/admin" : null;
  React.useEffect(() => {
    if (panel) router.replace(panel);
  }, [panel, router]);

  let govde: React.ReactNode = children;
  if (herkeseAcik) {
    govde = children;
  } else if (status === "loading" || panel) {
    govde = <div className={s.iskelet} aria-busy="true" aria-label="Yükleniyor" />;
  } else if (status === "unauthenticated") {
    govde = (
      <div className={s.bos}>
        <Nesne ad="kapi" boyut={110} />
        <h1 className="lb-y">Hesabını görmek için giriş yap</h1>
        <p>Şifre yok: e-postana gelen kodla saniyeler içinde girersin.</p>
        <button type="button" className={`${s.dugme} ${s.turuncu}`} onClick={() => giris.ac()}>Giriş yap ya da üye ol</button>
      </div>
    );
  }

  return (
    <div className={`lb ${s.sayfa}`}>
      <UstCubuk deger={arama} onDegis={setArama} onAra={() => router.push(aramaAdresi(arama))} />
      <main className={s.dis}>
        {kirinti && status === "authenticated" && !panel && rol === "CUSTOMER" && (
          <nav className={s.kirinti} aria-label="Konum">
            <Link href="/profile">Hesap</Link>
            <Ikon ad="chevron-right" boyut={14} />
            <span>{kirinti}</span>
          </nav>
        )}
        {govde}
      </main>
      <AltBilgi />
    </div>
  );
}
