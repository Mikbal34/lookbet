// Tek yardım makalesi: yol gösterici, başlık, metin, geri bildirim; yanda
// ilgili makaleler ve destek kutusu. Sunucuda üretilir (paylaşılabilir adres).

import Link from "next/link";
import { AltBilgi } from "@/components/lb/alt-bilgi";
import { Ikon } from "@/components/lb/ikon";
import { Nesne } from "@/components/lb/nesne";
import { DESTEK, MAKALELER, type Makale } from "./makaleler";
import { Geribildirim, YardimCubugu } from "./yardim-parcalari";
import s from "./yardim.module.css";

export function MakaleSayfasi({ m }: { m: Makale }) {
  const ayni = MAKALELER.filter((x) => x.id !== m.id && x.kitle === m.kitle && x.konu === m.konu).slice(0, 4);
  const ek = ayni.length < 3 ? MAKALELER.filter((x) => x.kitle === m.kitle && x.konu !== m.konu).slice(0, 3 - ayni.length) : [];
  const kitleAdresi = m.kitle === "acente" ? "/yardim?kitle=acente" : "/yardim";
  return (
    <div className={`lb ${s.sayfa}`}>
      <YardimCubugu araGoster />
      <main className={`${s.dis} ${s.makaleDuzen}`}>
        <article className={s.makale}>
          <nav className={s.kirinti} aria-label="Konum">
            <Link href="/yardim">Yardım Merkezi</Link>
            <Ikon ad="chevron-right" boyut={14} />
            <Link href={kitleAdresi}>{m.kitle === "acente" ? "Acente" : "Misafir"}</Link>
            <Ikon ad="chevron-right" boyut={14} />
            <span>{m.konu}</span>
          </nav>
          <h1 className="lb-y">{m.baslik}</h1>
          {m.metin.map((p, i) => <p key={i}>{p}</p>)}
          <Geribildirim key={m.id} />
        </article>
        <aside className={s.yan}>
          <div className={s.yanKart}>
            <h2>İlgili makaleler</h2>
            {[...ayni, ...ek].map((x) => <Link key={x.id} href={`/yardim/${x.id}`}>{x.baslik}</Link>)}
          </div>
          <div className={s.yanYardim}>
            <Nesne ad="zil" boyut={48} />
            <b>Hâlâ yardım lazım mı?</b>
            <span>Destek ekibimize yaz; rezervasyon numaranı eklersen daha hızlı yanıtlarız.</span>
            <a className={`${s.dugme} ${s.siyah}`} href={`mailto:${DESTEK.eposta}`}>
              <Ikon ad="mail" boyut={18} />
              Destek ekibine yaz
            </a>
          </div>
        </aside>
      </main>
      <AltBilgi />
    </div>
  );
}
