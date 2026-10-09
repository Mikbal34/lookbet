// LookBeds logosu: müşterinin turuncu kare logosu (içinde Look/Beds yazılı
// yatak; public/lookbeds-logo.svg, 2026-10-05 Illustrator dosyasından).
// Beyaz zeminde yalnız logo (müşteri isteği 2026-10-09). "LookBeds" yazısı
// (`yazi`) yalnız turuncuya dönen çubuklarda: ana sayfa (.logoUcan) ve
// UstCubuk; kaydırdıkça belirir. Kapsayıcı `lb-y lb-logo` sınıflarını alır;
// boyut onun font-size'ından gelir (globals.css: kare yazının 1,3 katı).
//
// Kullanım: <Link href="/" className="lb-y lb-logo"><Logo /></Link>

import * as React from "react";

export function Logo({ yazi = false }: { yazi?: boolean }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- küçük, sabit marka görseli */}
      <img className="lb-logo-isaret" src="/lookbeds-logo.svg" alt={yazi ? "" : "LookBeds"} width={636} height={636} draggable={false} />
      {/* Yazı tek parça kalmalı: kapsayıcı flex, "Look" ile "Beds" arasına boşluk girmesin. */}
      {yazi && (
        <span className="lb-logo-yazi">
          Look<span className="lb-logo-beds">Beds</span>
        </span>
      )}
    </>
  );
}
