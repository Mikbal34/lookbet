"use client";

// Giriş ve güvenlik: giriş yöntemi (e-posta kodu, şifresiz), bu cihazdan çıkış
// ve hesabı silme. Silme şimdilik destek ekibi üzerinden: yaklaşan
// rezervasyonlar ve fatura kayıtları elle kontrol edilmeli.

import * as React from "react";
import { signOut, useSession } from "next-auth/react";
import { Ikon } from "@/components/lb/ikon";
import { Nesne } from "@/components/lb/nesne";
import { DESTEK } from "@/components/yardim/makaleler";
import { HesapKabugu } from "./kabuk";
import { useProfil } from "./veri";
import s from "./hesap.module.css";

export function Guvenlik() {
  const { status } = useSession();
  const profil = useProfil(status === "authenticated");
  const eposta = profil.data?.email;
  const silKonu = encodeURIComponent("Hesabımı silmek istiyorum");
  const silGovde = encodeURIComponent(`Merhaba,\n\n${eposta ?? ""} adresli LookBeds hesabımın silinmesini istiyorum.\n`);

  return (
    <HesapKabugu kirinti="Giriş ve güvenlik">
      <h1 className={`lb-y ${s.altBaslik}`}>Giriş ve güvenlik</h1>
      <div className={s.altDuzen}>
        <div>
          <div className={s.satir}>
            <div className={s.yontem}>
              <span className={s.yontemIkon}><Ikon ad="mail" boyut={20} /></span>
              <div>
                <b>Giriş yöntemi</b>
                <div className={s.not}>
                  E-posta koduyla, şifresiz.{eposta ? <> Her girişte <b style={{ display: "inline", color: "var(--lb-yazi)" }}>{eposta}</b> adresine kod gelir.</> : null}
                </div>
              </div>
            </div>
          </div>
          <div className={s.satir}>
            <div className={s.satirUst}>
              <div>
                <b>Bu cihazdaki oturum</b>
                <span>Ortak bir bilgisayardaysan işin bitince çıkış yap.</span>
              </div>
              <button type="button" className={s.metinDugme} onClick={() => signOut({ callbackUrl: "/" })}>Çıkış yap</button>
            </div>
          </div>

          <h2 className={s.bolumBaslik}>Hesap</h2>
          <div className={s.satir}>
            <div className={s.satirUst}>
              <div>
                <b>Hesabı sil</b>
                <span>Kişisel bilgilerin ve kayıtlı misafirlerin silinir. Yaklaşan rezervasyonun varsa önce onu birlikte ele alırız.</span>
              </div>
              <a className={`${s.metinDugme} ${s.tehlike}`} href={`mailto:${DESTEK.eposta}?subject=${silKonu}&body=${silGovde}`}>Hesabı sil</a>
            </div>
          </div>
        </div>
        <aside className={s.bilgiKart}>
          <div>
            <Nesne ad="kilit" boyut={48} />
            <b>Şifre yok, derdi de yok</b>
            <span>Şifre yerine her girişte e-postana tek kullanımlık kod gönderiyoruz. Kod 10 dakika geçerli ve bir kez kullanılır.</span>
          </div>
          <div>
            <Nesne ad="zil" boyut={48} />
            <b>Şüpheli bir şey mi gördün?</b>
            <span>İstemediğin bir kod geldiyse kimseyle paylaşma. E-postana erişimin güvendeyse hesabın da güvendedir. Sorun olursa {DESTEK.telefon}.</span>
          </div>
        </aside>
      </div>
    </HesapKabugu>
  );
}
