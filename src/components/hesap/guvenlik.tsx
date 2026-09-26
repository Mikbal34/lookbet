"use client";

// Giriş ve güvenlik: giriş yöntemi (e-posta kodu, şifresiz), bu cihazdan çıkış
// ve hesabı silme. Silme şimdilik destek ekibi üzerinden: yaklaşan
// rezervasyonlar ve fatura kayıtları elle kontrol edilmeli.

import * as React from "react";
import { signOut, useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Ikon } from "@/components/lb/ikon";
import { Nesne } from "@/components/lb/nesne";
import { DESTEK } from "@/components/yardim/makaleler";
import { HesapKabugu } from "./kabuk";
import { useProfil } from "./veri";
import s from "./hesap.module.css";

export function Guvenlik() {
  const t = useTranslations("hesap.guvenlik");
  const { status } = useSession();
  const profil = useProfil(status === "authenticated");
  const eposta = profil.data?.email;
  const silKonu = encodeURIComponent(t("silKonu"));
  const silGovde = encodeURIComponent(t("silGovde", { eposta: eposta ?? "" }));

  return (
    <HesapKabugu kirinti={t("baslik")}>
      <h1 className={`lb-y ${s.altBaslik}`}>{t("baslik")}</h1>
      <div className={s.altDuzen}>
        <div>
          <div className={s.satir}>
            <div className={s.yontem}>
              <span className={s.yontemIkon}><Ikon ad="mail" boyut={20} /></span>
              <div>
                <b>{t("yontem")}</b>
                <div className={s.not}>
                  {eposta
                    ? t.rich("yontemEposta", { eposta, b: (c) => <b style={{ display: "inline", color: "var(--lb-yazi)" }}>{c}</b> })
                    : t("yontemSifresiz")}
                </div>
              </div>
            </div>
          </div>
          <div className={s.satir}>
            <div className={s.satirUst}>
              <div>
                <b>{t("oturum")}</b>
                <span>{t("oturumMetin")}</span>
              </div>
              <button type="button" className={s.metinDugme} onClick={() => signOut({ callbackUrl: "/" })}>{t("cikis")}</button>
            </div>
          </div>

          <h2 className={s.bolumBaslik}>{t("hesapBolumu")}</h2>
          <div className={s.satir}>
            <div className={s.satirUst}>
              <div>
                <b>{t("sil")}</b>
                <span>{t("silMetin")}</span>
              </div>
              <a className={`${s.metinDugme} ${s.tehlike}`} href={`mailto:${DESTEK.eposta}?subject=${silKonu}&body=${silGovde}`}>{t("sil")}</a>
            </div>
          </div>
        </div>
        <aside className={s.bilgiKart}>
          <div>
            <Nesne ad="kilit" boyut={48} />
            <b>{t("sifreYokBaslik")}</b>
            <span>{t("sifreYokMetin")}</span>
          </div>
          <div>
            <Nesne ad="zil" boyut={48} />
            <b>{t("supheliBaslik")}</b>
            <span>{t("supheliMetin", { telefon: DESTEK.telefon })}</span>
          </div>
        </aside>
      </div>
    </HesapKabugu>
  );
}
