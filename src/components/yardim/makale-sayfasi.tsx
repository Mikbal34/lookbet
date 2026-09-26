// Tek yardım makalesi: yol gösterici, başlık, metin, geri bildirim; yanda
// ilgili makaleler ve destek kutusu. Sunucuda, isteğin dilinde üretilir
// (paylaşılabilir adres; adres dilden bağımsız).

import Link from "next/link";
import { getMessages, getTranslations } from "next-intl/server";
import { AltBilgi } from "@/components/lb/alt-bilgi";
import { Ikon } from "@/components/lb/ikon";
import { Nesne } from "@/components/lb/nesne";
import { DESTEK, makaleKur, makaleleriKur, type MakaleKaydi } from "./makaleler";
import { Geribildirim, YardimCubugu } from "./yardim-parcalari";
import s from "./yardim.module.css";

export async function MakaleSayfasi({ kayit }: { kayit: MakaleKaydi }) {
  const [t, mesajlar] = await Promise.all([getTranslations("yardim"), getMessages()]);
  const m = makaleKur(kayit, mesajlar.yardim.makale);
  const makaleler = makaleleriKur(mesajlar.yardim.makale);
  const ayni = makaleler.filter((x) => x.id !== m.id && x.kitle === m.kitle && x.konu === m.konu).slice(0, 4);
  const ek = ayni.length < 3 ? makaleler.filter((x) => x.kitle === m.kitle && x.konu !== m.konu).slice(0, 3 - ayni.length) : [];
  const kitleAdresi = m.kitle === "acente" ? "/yardim?kitle=acente" : "/yardim";
  return (
    <div className={`lb ${s.sayfa}`}>
      <YardimCubugu araGoster />
      <main className={`${s.dis} ${s.makaleDuzen}`}>
        <article className={s.makale}>
          <nav className={s.kirinti} aria-label={t("makaleSayfasi.konum")}>
            <Link href="/yardim">{t("yardimMerkezi")}</Link>
            <Ikon ad="chevron-right" boyut={14} />
            <Link href={kitleAdresi}>{t(`kitle.${m.kitle}`)}</Link>
            <Ikon ad="chevron-right" boyut={14} />
            <span>{t(`konu.${m.konu}`)}</span>
          </nav>
          <h1 className="lb-y">{m.baslik}</h1>
          {m.metin.map((p, i) => <p key={i}>{p}</p>)}
          <Geribildirim key={m.id} />
        </article>
        <aside className={s.yan}>
          <div className={s.yanKart}>
            <h2>{t("makaleSayfasi.ilgili")}</h2>
            {[...ayni, ...ek].map((x) => <Link key={x.id} href={`/yardim/${x.id}`}>{x.baslik}</Link>)}
          </div>
          <div className={s.yanYardim}>
            <Nesne ad="zil" boyut={48} />
            <b>{t("makaleSayfasi.halaYardim")}</b>
            <span>{t("makaleSayfasi.halaYardimMetin")}</span>
            <a className={`${s.dugme} ${s.siyah}`} href={`mailto:${DESTEK.eposta}`}>
              <Ikon ad="mail" boyut={18} />
              {t("makaleSayfasi.destegeYaz")}
            </a>
          </div>
        </aside>
      </main>
      <AltBilgi />
    </div>
  );
}
