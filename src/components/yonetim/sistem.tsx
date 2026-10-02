"use client";

// Yönetim › Sistem: çalışan yapılandırma, salt okunur. Tedarikçi adresi,
// fiyat kaynakları (feed) ve bağlı servisler sunucunun ortam
// değişkenlerinden (.env.production) gelir; gizli anahtarların yalnız
// tanımlı olup olmadığı görünür. Değiştirmek için sunucudaki dosya
// güncellenip uygulama yeniden başlatılır.

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Nesne } from "@/components/lb/nesne";
import { getir } from "./ortak";
import s from "./yonetim.module.css";

interface Sistem {
  tedarikci: { adres: string | null; ornekVeri: boolean; b2cFeed: string | null; b2bFeed: string | null };
  servisler: { eposta: boolean; harita: boolean; zamanlanmisIsler: boolean; googleGiris: boolean; appleGiris: boolean };
  ortam: string;
}

function Satir({ ad, deger, aciklama, durum }: { ad: string; deger: string; aciklama?: string; durum?: boolean }) {
  return (
    <div className={s.satir}>
      <div>
        <b>{ad}</b>
        <span>{aciklama ?? deger}</span>
      </div>
      {durum === undefined ? (
        <span className={s.no}>{aciklama ? deger : ""}</span>
      ) : (
        <span className={s.rozet} data-renk={durum ? "yesil" : "gri"}>{durum ? "Açık" : "Kapalı"}</span>
      )}
    </div>
  );
}

export function SistemAyarlari() {
  const q = useQuery({ queryKey: ["yonetim", "sistem"], queryFn: () => getir<Sistem>("/api/admin/sistem") });
  const d = q.data;
  return (
    <div className={s.dis}>
      <div className={s.sayfaBas}>
        <h1 className="lb-y">Sistem</h1>
        {d && <span className={s.soluk}>{d.ortam === "production" ? "Canlı sunucu" : "Geliştirme"}</span>}
      </div>
      {q.isPending ? (
        <div className={s.iskelet} aria-busy="true" />
      ) : q.isError || !d ? (
        <div className={s.bos}><b>Sistem bilgisi alınamadı</b><button type="button" className={`${s.dugme} ${s.siyah}`} onClick={() => q.refetch()}>Tekrar dene</button></div>
      ) : (
        <div className={s.altDuzen}>
          <div>
            <h2 className={s.bolum} style={{ marginTop: 0 }}>Tedarikçi (Etscore)</h2>
            <Satir ad="API adresi" deger={d.tedarikci.adres ?? "Tanımlı değil"} />
            <Satir ad="Örnek veri modu" deger="" aciklama="Açıkken gerçek Etscore yerine örnek oteller döner" durum={d.tedarikci.ornekVeri} />
            <Satir ad="Müşteri fiyat kaynağı (B2C feed)" deger={d.tedarikci.b2cFeed ?? "Tanımlı değil"} />
            <Satir ad="Acente fiyat kaynağı (B2B feed)" deger={d.tedarikci.b2bFeed ?? "Tanımlı değil"} />
            <Satir ad="Varsayılan para birimi ve uyruk" deger="EUR · TR" aciklama="Etscore oda aramasında TRY kabul etmiyor; aramada uyruk seçilmezse Türkiye" />
            <h2 className={s.bolum}>Servisler</h2>
            <Satir ad="E-posta gönderimi" deger="" aciklama="Giriş kodları ve rezervasyon e-postaları. Kapalıyken kod gönderilemez" durum={d.servisler.eposta} />
            <Satir ad="Harita" deger="" aciklama="Otel sayfasındaki Google haritası" durum={d.servisler.harita} />
            <Satir ad="Zamanlanmış içerik işleri" deger="" aciklama="Gece çalışan senkron işlerinin anahtarı" durum={d.servisler.zamanlanmisIsler} />
            <Satir ad="Google ile giriş" deger="" aciklama="Müşteri girişinde Google düğmesi" durum={d.servisler.googleGiris} />
            <Satir ad="Apple ile giriş" deger="" aciklama="Müşteri girişinde Apple düğmesi" durum={d.servisler.appleGiris} />
          </div>
          <aside className={s.bilgiKart}>
            <Nesne ad="kilit" boyut={48} />
            <b>Buradaki ayarlar sunucuda</b>
            <span>Değerler sunucudaki .env.production dosyasından okunur; değiştirmek için dosya güncellenip uygulama yeniden başlatılır. Gizli anahtarlar burada gösterilmez.</span>
            <Link className={s.metinDugme} href="/admin/audit-logs">Denetim kaydı</Link>
          </aside>
        </div>
      )}
    </div>
  );
}
