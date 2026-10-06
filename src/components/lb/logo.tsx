// LookBeds logosu: müşterinin turuncu kare logosu (içinde Look/Beds yazılı
// yatak; public/lookbeds-logo.svg, 2026-10-05 Illustrator dosyasından) +
// "Look" yazı renginde, "Beds" turuncu. Kapsayıcı `lb-y lb-logo` sınıflarını
// alır; boyut onun font-size'ından gelir (globals.css: kare yazının 1,3 katı,
// arada 0,28em). Ana sayfa açılışta yalnız kareyi gösterir, yazı kaydırınca
// gelir (ana-sayfa.module.css: .logoUcan).
//
// Kullanım: <Link href="/" className="lb-y lb-logo"><Logo /></Link>

import * as React from "react";

export function Logo() {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- küçük, sabit marka görseli */}
      <img className="lb-logo-isaret" src="/lookbeds-logo.svg" alt="" width={636} height={636} draggable={false} />
      {/* Yazı tek parça kalmalı: kapsayıcı flex, "Look" ile "Beds" arasına boşluk girmesin. */}
      <span className="lb-logo-yazi">
        Look<span className="lb-logo-beds">Beds</span>
      </span>
    </>
  );
}
