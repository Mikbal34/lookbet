"use client";

// /kampanyalar vitrini: yayındaki (ya da yakında başlayacak) ve "vitrinde
// göster" işaretli otomatik indirimler. Kod yok; her kart ilgili aramaya ya
// da otele götürür, indirim fiyata kendiliğinden yansır.

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UstCubuk } from "@/components/lb/ust-cubuk";
import { AltBilgi } from "@/components/lb/alt-bilgi";
import { Nesne } from "@/components/lb/nesne";
import { BOS_ARAMA, aramaAdresi } from "@/components/lb/arama/durum";
import { kampanyaHedefi, kampanyaNesnesi, type VitrinKampanya } from "./ortak";
import s from "./vitrin.module.css";

export function KampanyaVitrini({ kampanyalar }: { kampanyalar: VitrinKampanya[] }) {
  const router = useRouter();
  const [arama, setArama] = React.useState(BOS_ARAMA);
  return (
    <div className={`lb ${s.sayfa}`}>
      <UstCubuk deger={arama} onDegis={setArama} onAra={() => router.push(aramaAdresi(arama))} />
      <main className={s.dis}>
        <div className={s.bas}>
          <h1 className="lb-y">Kampanyalar</h1>
          <p>Kod gerekmez: koşulu tutan rezervasyonda indirim fiyata kendiliğinden yansır, aramada üstü çizili fiyatla görürsün.</p>
        </div>
        {kampanyalar.length ? (
          <div className={s.kartlar}>
            {kampanyalar.map((k, i) => {
              const nesne = kampanyaNesnesi(k);
              const { href: hedef, dugme } = kampanyaHedefi(k);
              return (
                <article key={k.id} className={s.kart} style={{ "--s": i } as React.CSSProperties}>
                  <div className={s.gorsel}>
                    <Nesne ad={nesne} boyut={150} />
                  </div>
                  <div className={s.ic}>
                    <span className={s.tarih} data-yakinda={k.yakinda || undefined}>{k.tarih}</span>
                    <h2 className="lb-y">{k.ad}</h2>
                    <p>{k.aciklama}</p>
                    {k.oteller.length > 1 && (
                      <p className={s.oteller}>
                        {k.oteller.slice(0, 4).map((o, j) => (
                          <React.Fragment key={o.kod}>
                            {j > 0 && " · "}
                            <Link href={`/hotel/${o.kod}`}>{o.ad}</Link>
                          </React.Fragment>
                        ))}
                        {k.oteller.length > 4 && ` ve ${k.oteller.length - 4} otel daha`}
                      </p>
                    )}
                    <div className={s.alt}>
                      <b className="lb-y">%{k.yuzde.toLocaleString("tr-TR")}</b>
                      <Link className={s.dugme} href={hedef}>{dugme}</Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className={s.bos}>
            <Nesne ad="indirim" boyut={96} />
            <b>Şu an yayında kampanya yok</b>
            <span>Yeni kampanyalar burada görünür. Bu arada otellere göz at.</span>
            <Link className={s.dugme} href="/">Otel ara</Link>
          </div>
        )}
      </main>
      <AltBilgi />
    </div>
  );
}
