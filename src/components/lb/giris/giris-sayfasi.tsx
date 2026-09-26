"use client";

// /login: korumalı bir sayfaya girişsiz gelinince buraya yönlendiriliyor.
// Sade bir zemin üstünde aynı giriş penceresi açık gelir; giriş bitince
// callbackUrl'e gidilir, kapatılırsa ana sayfaya dönülür.

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { GirisPenceresi } from "./giris-penceresi";
import { guvenliHedef } from "./hedef";
import s from "./giris-sayfasi.module.css";

export function GirisSayfasi() {
  const router = useRouter();
  const p = useSearchParams();
  const ham = p.get("callbackUrl");
  const hedef = React.useMemo(() => guvenliHedef(ham) ?? "/", [ham]);
  const [acik, setAcik] = React.useState(true);
  const kapat = React.useCallback(() => {
    setAcik(false);
    router.push("/");
  }, [router]);
  return (
    <div className={`lb ${s.zemin}`}>
      <Link href="/" className={`lb-y ${s.logo}`}>LookBeds</Link>
      <GirisPenceresi acik={acik} hedef={hedef} onKapat={kapat} />
    </div>
  );
}
