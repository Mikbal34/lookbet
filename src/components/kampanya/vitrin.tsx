"use client";

// /kampanyalar vitrini: yayındaki (ya da yakında başlayacak) ve "vitrinde
// göster" işaretli otomatik indirimler. Kod yok; her kart ilgili aramaya ya
// da otele götürür, indirim fiyata kendiliğinden yansır.

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { UstCubuk } from "@/components/lb/ust-cubuk";
import { AltBilgi } from "@/components/lb/alt-bilgi";
import { Nesne } from "@/components/lb/nesne";
import { BOS_ARAMA, aramaAdresi } from "@/components/lb/arama/durum";
import { kampanyaHedefi, kampanyaNesnesi, type VitrinKampanya } from "./ortak";
import { useKampanyaMetni } from "./metin";
import s from "./vitrin.module.css";

export function KampanyaVitrini({ kampanyalar }: { kampanyalar: VitrinKampanya[] }) {
  const t = useTranslations("anaSayfa.vitrin");
  const metin = useKampanyaMetni();
  const router = useRouter();
  const [arama, setArama] = React.useState(BOS_ARAMA);
  return (
    <div className={`lb ${s.sayfa}`}>
      <UstCubuk deger={arama} onDegis={setArama} onAra={() => router.push(aramaAdresi(arama))} />
      <main className={s.dis}>
        <div className={s.bas}>
          <h1 className="lb-y">{t("baslik")}</h1>
          <p>{t("aciklama")}</p>
        </div>
        {kampanyalar.length ? (
          <div className={s.kartlar}>
            {kampanyalar.map((k, i) => {
              const nesne = kampanyaNesnesi(k);
              const { href: hedef } = kampanyaHedefi(k);
              return (
                <article key={k.id} className={s.kart} style={{ "--s": i } as React.CSSProperties}>
                  <div className={s.gorsel}>
                    <Nesne ad={nesne} boyut={150} />
                  </div>
                  <div className={s.ic}>
                    <span className={s.tarih} data-yakinda={k.yakinda || undefined}>{metin.tarih(k)}</span>
                    <h2 className="lb-y">{k.ad}</h2>
                    <p>{metin.aciklama(k)}</p>
                    {k.oteller.length > 1 && (
                      <p className={s.oteller}>
                        {k.oteller.slice(0, 4).map((o, j) => (
                          <React.Fragment key={o.kod}>
                            {j > 0 && " · "}
                            <Link href={`/hotel/${o.kod}`}>{o.ad}</Link>
                          </React.Fragment>
                        ))}
                        {k.oteller.length > 4 && ` ${t("digerOteller", { sayi: k.oteller.length - 4 })}`}
                      </p>
                    )}
                    <div className={s.alt}>
                      <b className="lb-y">{metin.yuzde(k)}</b>
                      <Link className={s.dugme} href={hedef}>{metin.dugme(k)}</Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className={s.bos}>
            <Nesne ad="indirim" boyut={96} />
            <b>{t("bosBaslik")}</b>
            <span>{t("bosAciklama")}</span>
            <Link className={s.dugme} href="/">{t("otelAra")}</Link>
          </div>
        )}
      </main>
      <AltBilgi />
    </div>
  );
}
