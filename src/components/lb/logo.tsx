// LookBeds logosu: müşterinin turuncu kare logosu (içinde LOOK/BEDS yazılı
// yatak) + "Look" yazı renginde, "Beds" turuncu. 2026-10-02 müşteri isteği:
// yatak sembolü yerine kare logonun kendisi, yazı yanında kalıyor.
// Kapsayıcı `lb-y lb-logo` sınıflarını alır; boyut onun font-size'ından gelir
// (globals.css: kare yazının 1,3 katı, arada 0,28em).
//
// Kullanım: <Link href="/" className="lb-y lb-logo"><Logo /></Link>

import * as React from "react";

export function Logo() {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- küçük, sabit marka görseli */}
      <img className="lb-logo-isaret" src="/lookbeds-logo-512.png" alt="" width={512} height={512} draggable={false} />
      {/* Yazı tek parça kalmalı: kapsayıcı flex, "Look" ile "Beds" arasına boşluk girmesin. */}
      <span>
        Look<span className="lb-logo-beds">Beds</span>
      </span>
    </>
  );
}
