"use client";

// Yönetim › Raporlar: son 12 ayın satışı, rezervasyon sayısı, ortalama
// sepet ve iptal oranı; satışın müşteri/acente dağılımı, acenteler ve en çok
// satan oteller. Yalnız onaylı rezervasyonlar (iptal oranı hariç).

import { useQuery } from "@tanstack/react-query";
import { Nesne } from "@/components/lb/nesne";
import { AYLAR } from "@/components/lb/arama/durum";
import { AYK, CubukGrafik, OtelFoto, eur, getir, sayi } from "./ortak";
import s from "./yonetim.module.css";

interface Rapor {
  ozet: { satis: number; adet: number; ortSepet: number; iptalOrani: number; musteriPayi: number };
  aylar: { ay: string; satis: number; adet: number }[];
  acenteler: { id: string; ad: string; satis: number; adet: number }[];
  oteller: { hotelCode: string; hotelName: string | null; satis: number; adet: number; image: string | null }[];
}
const ayAdi = (a: string, uzun = false) => (uzun ? `${AYLAR[Number(a.slice(5)) - 1]} ${a.slice(0, 4)}` : AYK[Number(a.slice(5)) - 1]);

export function Raporlar() {
  const q = useQuery({ queryKey: ["yonetim", "rapor"], queryFn: () => getir<Rapor>("/api/admin/reports"), staleTime: 5 * 60_000 });
  const r = q.data;
  const ilk = r?.aylar[0]?.ay;
  const son = r?.aylar[r.aylar.length - 1]?.ay;
  return (
    <div className={s.dis}>
      <div className={s.sayfaBas}>
        <h1 className="lb-y">Raporlar</h1>
        <span className={s.soluk}>{ilk && son ? `${ayAdi(ilk, true)} – ${ayAdi(son, true)} · onaylı rezervasyonlar` : "Son 12 ay"}</span>
      </div>
      {q.isPending ? (
        <div className={s.iskelet} aria-busy="true" />
      ) : q.isError || !r ? (
        <div className={s.bos}><b>Rapor alınamadı</b><button type="button" className={`${s.dugme} ${s.siyah}`} onClick={() => q.refetch()}>Tekrar dene</button></div>
      ) : (
        <>
          <div className={s.kpiler}>
            <div className={s.kpi}><span>Satış</span><b className="lb-y">{eur(r.ozet.satis)}</b><small>Son 12 ay</small></div>
            <div className={s.kpi}><span>Rezervasyon</span><b className="lb-y">{sayi(r.ozet.adet)}</b><small>Ayda ortalama {sayi(Math.round(r.ozet.adet / 12))}</small></div>
            <div className={s.kpi}><span>Ortalama sepet</span><b className="lb-y">{eur(r.ozet.ortSepet)}</b><small>Rezervasyon başına</small></div>
            <div className={s.kpi}><span>İptal oranı</span><b className="lb-y">%{r.ozet.iptalOrani.toLocaleString("tr-TR")}</b><small>Onaylanan ve iptal edilenlerden</small></div>
          </div>
          <section className={s.kutu} style={{ marginTop: 16 }} aria-labelledby="aylik-baslik">
            <div className={s.bolumBas}>
              <h2 id="aylik-baslik">Aylık satış</h2>
              {r.ozet.satis > 0 && (
                <div className={s.dagilim} title="Satışın kaynağa göre dağılımı">
                  <span>Müşteri %{r.ozet.musteriPayi}</span>
                  <div><i style={{ width: `${r.ozet.musteriPayi}%` }} /></div>
                  <span>Acente %{100 - r.ozet.musteriPayi}</span>
                </div>
              )}
            </div>
            <CubukGrafik
              etiket="Son 12 ayın satışı"
              genislik={720}
              yukseklik={240}
              cubuklar={r.aylar.map((a, i) => ({
                etiket: ayAdi(a.ay),
                ipucu: `${ayAdi(a.ay, true)}: ${eur(a.satis)} · ${a.adet} rezervasyon`,
                vurgu: i === r.aylar.length - 1,
                dilimler: [{ deger: a.satis, renk: i === r.aylar.length - 1 ? "var(--lb-turuncu)" : "#cfcfcc" }],
              }))}
            />
          </section>
          <div className={s.ikiKolon}>
            <section className={s.kutu} aria-labelledby="ac-rapor">
              <div className={s.bolumBas}><h2 id="ac-rapor">Acenteler</h2></div>
              {r.acenteler.length ? (
                <div className={s.cubuklar}>
                  {r.acenteler.map((a) => (
                    <div key={a.id} className={s.cubukSatir}>
                      <div className={s.csBas}><b>{a.ad}</b><span>{a.adet} rezervasyon · ort. {eur(a.satis / a.adet)}</span></div>
                      <div className={s.csIz}><i style={{ width: `${(a.satis / r.acenteler[0].satis) * 100}%` }} /></div>
                      <span className={s.csDeger}>{eur(a.satis)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={s.soluk}>Son 12 ayda acente satışı yok.</p>
              )}
            </section>
            <section className={s.kutu} aria-labelledby="otel-rapor">
              <div className={s.bolumBas}><h2 id="otel-rapor">En çok satan oteller</h2></div>
              {r.oteller.length ? (
                <div className={s.oteller}>
                  {r.oteller.map((o, i) => (
                    <div key={o.hotelCode} className={s.otelSatir}>
                      <span className={`lb-y ${s.sira}`}>{i + 1}</span>
                      <OtelFoto src={o.image} />
                      <div><b>{o.hotelName ?? o.hotelCode}</b><span>{o.adet} rezervasyon</span></div>
                      <span className={s.tutar}>{eur(o.satis)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={s.bos} style={{ border: 0, padding: 16 }}>
                  <Nesne ad="bavul" boyut={56} />
                  <span>Onaylı rezervasyon gelince burada sıralanır.</span>
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
