"use client";

// Yönetim › İçerik senkronu: otel ve konum sayıları, fiyat veren ve
// fotoğrafı eksik oteller; sunucudaki zamanlanmış işlerin (deploy/lookbet.cron)
// son çalışması ve her birini hemen başlatma (arka planda; sayfa bitene
// kadar durumu yoklar). Aynı anda tek iş koşar.

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Nesne } from "@/components/lb/nesne";
import { getir, gonder, neZaman, sayi, simdiAl, useBildiri } from "./ortak";
import s from "./yonetim.module.css";

type Adim = "revizyon" | "fiyat" | "listeler" | "oteller" | "icerik";
interface Son { zaman: string; sure: number; basarili: boolean; ozet: string }
interface Durum {
  sayilar: { aktif: number; pasif: number; konum: number; fiyatVeren: number; fotografsiz: number };
  son: Partial<Record<Adim, Son>>;
  calisan: Adim | null;
}

// Zamanlar Türkiye saati (cron UTC: 01:30 ve pazar 02:00).
const ISLER: { adim: Adim; ad: string; aciklama: string; zaman: string; uzun?: boolean }[] = [
  { adim: "revizyon", ad: "Değişen oteller", aciklama: "Son 2 günde eklenen, değişen ve silinen oteller", zaman: "Her gece 04:30" },
  { adim: "fiyat", ad: "Fiyat veren oteller", aciklama: "Şehir aramasının sıralaması buna bağlı", zaman: "Her gece, değişen otellerden sonra", uzun: true },
  { adim: "listeler", ad: "Listeler", aciklama: "Pansiyon, olanak ve oda özelliği adları", zaman: "Pazar 05:00" },
  { adim: "oteller", ad: "Otel listesi", aciklama: "Etscore'daki tüm oteller, yeni kodlar", zaman: "Pazar, listelerden sonra", uzun: true },
  { adim: "icerik", ad: "Eksik içerik", aciklama: "Fotoğrafı ya da konumu eksik oteller", zaman: "Pazar, otel listesinden sonra", uzun: true },
];
const sureYaz = (sn: number) => (sn < 60 ? `${sn} sn` : `${Math.floor(sn / 60)} dk ${sn % 60} sn`);

export function Icerik() {
  const [simdi] = React.useState(simdiAl);
  const istemci = useQueryClient();
  const bildiri = useBildiri();
  const q = useQuery({
    queryKey: ["yonetim", "icerik"],
    queryFn: () => getir<Durum>("/api/content/sync"),
    refetchInterval: (x) => (x.state.data?.calisan ? 5_000 : false),
  });
  const calistir = useMutation({
    mutationFn: (adim: Adim) => gonder("/api/content/sync", "POST", { adim }),
    onSuccess: (_, adim) => bildiri(`${ISLER.find((i) => i.adim === adim)?.ad} başladı; bitince burada görünür`),
    onError: (e: Error) => bildiri(e.message),
    onSettled: () => istemci.invalidateQueries({ queryKey: ["yonetim", "icerik"] }),
  });
  // Çalışan iş bitince sonucu bildir.
  const oncekiCalisan = React.useRef<Adim | null>(null);
  React.useEffect(() => {
    const c = q.data?.calisan ?? null;
    const bitti = oncekiCalisan.current;
    if (bitti && !c) {
      const x = q.data?.son[bitti];
      bildiri(`${ISLER.find((i) => i.adim === bitti)?.ad} ${x?.basarili === false ? "başarısız oldu" : "tamamlandı"}`);
    }
    oncekiCalisan.current = c;
  }, [q.data, bildiri]);
  const d = q.data;
  const calisan = d?.calisan ?? (calistir.isPending ? calistir.variables : null);
  const sonlar = d ? Object.entries(d.son).sort((a, b) => (b[1]!.zaman > a[1]!.zaman ? 1 : -1)) : [];
  const enSon = sonlar[0];
  const hatali = sonlar.filter(([, x]) => !x!.basarili);

  return (
    <div className={s.dis}>
      <div className={s.sayfaBas}>
        <h1 className="lb-y">İçerik senkronu</h1>
      </div>
      {q.isPending ? (
        <div className={s.iskelet} aria-busy="true" />
      ) : q.isError || !d ? (
        <div className={s.bos}><b>İçerik bilgisi alınamadı</b><button type="button" className={`${s.dugme} ${s.siyah}`} onClick={() => q.refetch()}>Tekrar dene</button></div>
      ) : (
        <>
          <div className={s.senkron} data-calisiyor={calisan || undefined}>
            <Nesne ad="sehir" boyut={64} />
            <div>
              <b>
                {calisan
                  ? `${ISLER.find((i) => i.adim === calisan)?.ad} çalışıyor`
                  : hatali.length
                    ? `${hatali.length} iş son çalışmasında başarısız oldu`
                    : enSon ? "Etscore içeriği güncel" : "Henüz kayıtlı çalışma yok"}
              </b>
              <span>
                {calisan
                  ? "Bitince sonuç burada görünür; bu sayfadan ayrılabilirsin."
                  : enSon
                    ? `Son çalışma ${neZaman(enSon[1]!.zaman, simdi)} · ${ISLER.find((i) => i.adim === enSon[0])?.ad ?? enSon[0]}`
                    : "İşler gece kendiliğinden çalışır; ilk çalışmadan sonra durumları burada görünür."}
              </span>
            </div>
          </div>
          <div className={s.kpiler}>
            <div className={s.kpi}><span>Aktif otel</span><b className="lb-y">{sayi(d.sayilar.aktif)}</b><small>{sayi(d.sayilar.pasif)} pasif (Etscore&apos;da kapalı)</small></div>
            <div className={s.kpi}><span>Konum</span><b className="lb-y">{sayi(d.sayilar.konum)}</b><small>Ülke, il, ilçe, bölge</small></div>
            <div className={s.kpi}><span>Fiyat veren otel</span><b className="lb-y">{sayi(d.sayilar.fiyatVeren)}</b><small>Son 24 saatte aramada fiyat döndü</small></div>
            <div className={s.kpi}><span>Fotoğrafsız</span><b className="lb-y">{sayi(d.sayilar.fotografsiz)}</b><small>Aktif otellerden kapak fotoğrafı olmayan</small></div>
          </div>
          <div className={s.bolumBas}>
            <h2>Otomatik işler</h2>
            <span className={s.soluk}>Sunucuda zamanlanmış · Türkiye saati</span>
          </div>
          <div className={s.isListe}>
            {ISLER.map((i) => {
              const x = d.son[i.adim];
              const bu = calisan === i.adim;
              return (
                <div key={i.adim} className={s.islem}>
                  <span className={s.rozet} data-renk={bu ? "sari" : !x ? "gri" : x.basarili ? "yesil" : "kirmizi"}>
                    {bu ? "Çalışıyor" : !x ? "Kayıt yok" : x.basarili ? "Başarılı" : "Başarısız"}
                  </span>
                  <div>
                    <b>{i.ad}</b>
                    <span>{i.aciklama} · {i.zaman}</span>
                  </div>
                  <span className={s.soluk} title={x?.ozet}>
                    {x ? `${neZaman(x.zaman, simdi)} · ${sureYaz(x.sure)}${x.ozet ? ` · ${x.ozet.length > 60 ? `${x.ozet.slice(0, 60)}…` : x.ozet}` : ""}` : "—"}
                  </span>
                  <button
                    type="button"
                    className={s.metinDugme}
                    disabled={!!calisan}
                    title={i.uzun ? "Uzun sürebilir (dakikalar)" : undefined}
                    onClick={() => calistir.mutate(i.adim)}
                  >
                    Şimdi çalıştır
                  </button>
                </div>
              );
            })}
          </div>
          <p className={`${s.not} ${s.dar}`} style={{ marginTop: 12 }}>
            &quot;Fiyat veren oteller&quot;, &quot;Otel listesi&quot; ve &quot;Eksik içerik&quot; dakikalar sürebilir; aynı anda tek iş çalışır.
          </p>
        </>
      )}
    </div>
  );
}
