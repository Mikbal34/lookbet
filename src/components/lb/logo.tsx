// LookBeds logosu (2026-09-27, seçenek B): turuncu yatak sembolü + "Look"
// yazı renginde, "Beds" turuncu. Sembol, turuncu kare logonun içindeki yatak.
// Kapsayıcı `lb-y lb-logo` sınıflarını alır; boyut onun font-size'ından gelir
// (globals.css: sembol yazının 1,15 katı, arada 0,28em).
//
// Kullanım: <Link href="/" className="lb-y lb-logo"><Logo /></Link>

import * as React from "react";

export function Logo() {
  return (
    <>
      <svg className="lb-logo-isaret" viewBox="76 52 360 408" aria-hidden="true" focusable="false">
        <rect x="76" y="52" width="58" height="340" rx="29" />
        <rect x="378" y="120" width="58" height="340" rx="29" />
        <rect x="76" y="248" width="360" height="86" rx="30" />
      </svg>
      {/* Yazı tek parça kalmalı: kapsayıcı flex, "Look" ile "Beds" arasına boşluk girmesin. */}
      <span>
        Look<span className="lb-logo-beds">Beds</span>
      </span>
    </>
  );
}
