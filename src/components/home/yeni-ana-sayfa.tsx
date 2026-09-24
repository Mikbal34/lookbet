"use client";

// Web (masaüstü) ana sayfa önerisi — önizleme: /onizleme/ana-sayfa.
// Uygulamanın mobil görünümü ayrı; bu sayfa lg ve üstü için tasarlandı.
//
// Kararlar:
//  • İlk ekranın işi arama. Mavi dolgu + slogan + uydurma istatistik bandı
//    ("1M+ mutlu misafir", "4,8/5 puan") kalktı; tek sayı, gerçek olan:
//    satıştaki otel sayısı.
//  • Tarih kısayolları: takvim en çok vazgeçilen adım, tatil aramalarının
//    çoğu hafta sonu. Kısayol arama formunu o tarihlerle doldurur.
//  • Şehir kartları seçili hafta sonuyla arıyor ve fiyat değil "fiyat veren
//    otel" sayısı gösteriyor — elle yazılmış "€45'ten" yerine her gece
//    güncellenen bir bilgi. Görseller o bölgedeki gerçek bir otelin.
//  • "Nasıl çalışır" yalnızca tuttuğumuz sözleri söylüyor; "en iyi fiyat
//    garantisi" gibi arkasında süreç olmayan vaat yok.

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LbBelge,
  LbKalkanOnay,
  LbSaat,
  LbSagOk,
  LbTakvimDuz,
} from "@/components/ui/icons";
import { Navbar, Footer } from "@/components/layout";
import { SearchForm } from "@/components/search";
import type { SearchFormValues } from "@/components/search/search-form";
import { addRecentSearch, getRecentSearches, type RecentSearch } from "@/lib/utils/recent-searches";
import { formatDateRange } from "@/lib/utils";
import { cn } from "@/lib/utils/cn";
import type { SehirKarti } from "@/lib/ana-sayfa-veri";

// ── Tarih kısayolları ───────────────────────────────────────────────────

/** Yerel takvim günü → yyyy-MM-dd (toISOString UTC'ye kaydırırdı). */
function gun(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function ekle(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

interface Aralik {
  etiket: string;
  checkIn: string;
  checkOut: string;
}

/**
 * Cuma girişli, pazar çıkışlı iki hafta sonu. Cumartesi ya da pazar
 * açılırsa "bu hafta sonu" zaten yarıda: ilk kısayol gelecek haftanınki.
 */
function haftaSonlari(bugun: Date): Aralik[] {
  const g = bugun.getDay(); // 0 pazar … 6 cumartesi
  const ilkCuma = ekle(bugun, (5 - g + 7) % 7);
  const aralik = (cuma: Date, etiket: string): Aralik => ({
    etiket,
    checkIn: gun(cuma),
    checkOut: gun(ekle(cuma, 2)),
  });
  return g !== 6 && g !== 0
    ? [aralik(ilkCuma, "Bu hafta sonu"), aralik(ekle(ilkCuma, 7), "Gelecek hafta sonu")]
    : [aralik(ilkCuma, "Gelecek hafta sonu"), aralik(ekle(ilkCuma, 7), "İki hafta sonra")];
}

function aramaAdresi(v: { destination: string; checkIn: string; checkOut: string; adults: number; childAges?: number[] }) {
  const p = new URLSearchParams({
    destination: v.destination,
    checkIn: v.checkIn,
    checkOut: v.checkOut,
    adults: String(v.adults),
    nationality: "TR",
    currency: "EUR",
  });
  if (v.childAges?.length) p.set("childAges", v.childAges.join(","));
  return `/search?${p.toString()}`;
}

const sayi = (n: number) => n.toLocaleString("tr-TR");

// ── Sayfa ──────────────────────────────────────────────────────────────

export interface YeniAnaSayfaProps {
  sehirler: SehirKarti[];
  aktifOtel: number;
}

export function YeniAnaSayfa({ sehirler, aktifOtel }: YeniAnaSayfaProps) {
  const router = useRouter();
  // "Bugün" bir kez: render gövdesinde Date.now() her seferinde değişir.
  const [kisayollar] = React.useState(() => haftaSonlari(new Date()));
  const [secili, setSecili] = React.useState<number | null>(null);
  const [sehirTarihi, setSehirTarihi] = React.useState(0);
  const [sonAramalar, setSonAramalar] = React.useState<RecentSearch[]>([]);

  // localStorage yalnızca istemcide; sunucu çıktısında liste boş.
  React.useEffect(() => setSonAramalar(getRecentSearches().slice(0, 3)), []);

  const formTarihi = secili === null ? undefined : kisayollar[secili];
  const kartTarihi = kisayollar[sehirTarihi];

  const ara = (v: SearchFormValues) => {
    addRecentSearch({ destination: v.destination, checkIn: v.checkIn, checkOut: v.checkOut, adults: v.guests.adult });
    router.push(
      aramaAdresi({
        destination: v.destination,
        checkIn: v.checkIn,
        checkOut: v.checkOut,
        adults: v.guests.adult,
        childAges: v.guests.childAges,
      })
    );
  };

  const [buyuk, ...kucukler] = sehirler;

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <Navbar variant="deep" />

      <main className="flex-1">
        {/* ── Arama ─────────────────────────────────────────────────── */}
        <section className="bg-navy-deep pb-14 pt-16 text-white">
          <div className="mx-auto max-w-[1200px] px-6">
            <h1 className="max-w-3xl text-[52px] font-extrabold leading-[1.05] tracking-[-0.02em]">
              Kalacak yeri bul, fiyatı anında gör.
            </h1>
            <p className="mt-4 text-[17px] text-white/75">
              Türkiye&apos;de {sayi(aktifOtel)} otel. Fiyat, aradığın anda otelden geliyor.
            </p>

            <div className="mt-10 rounded-xl bg-paper p-1.5 text-ink shadow-[0_24px_48px_-24px_rgb(0_0_0/0.55)]">
              {/* Kısayol seçilince form o tarihlerle yeniden kurulur. */}
              <SearchForm
                key={secili ?? "bos"}
                initialValues={formTarihi ? { checkIn: formTarihi.checkIn, checkOut: formTarihi.checkOut } : undefined}
                onSearch={ara}
              />
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-x-8 gap-y-3">
              <div className="flex items-center gap-2">
                <span className="mr-1 text-[13px] font-semibold text-white/60">Hızlı tarih</span>
                {kisayollar.map((k, i) => (
                  <button
                    key={k.etiket}
                    type="button"
                    aria-pressed={secili === i}
                    onClick={() => setSecili(secili === i ? null : i)}
                    className={cn(
                      "inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-[13.5px] font-bold transition-colors",
                      secili === i
                        ? "border-gold bg-gold text-ink"
                        : "border-white/25 text-white hover:border-white/60"
                    )}
                  >
                    <LbTakvimDuz size={15} />
                    {k.etiket}
                    <span className={cn("font-semibold", secili === i ? "text-ink/70" : "text-white/60")}>
                      {formatDateRange(k.checkIn, k.checkOut)}
                    </span>
                  </button>
                ))}
              </div>

              {sonAramalar.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="mr-1 text-[13px] font-semibold text-white/60">Son aramaların</span>
                  {sonAramalar.map((a) => (
                    <Link
                      key={`${a.destination}-${a.checkIn}-${a.ts}`}
                      href={aramaAdresi(a)}
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-white/10 px-4 text-[13.5px] font-bold hover:bg-white/15"
                    >
                      {a.destination}
                      <span className="font-semibold text-white/60">{formatDateRange(a.checkIn, a.checkOut)}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── Şehirler ──────────────────────────────────────────────── */}
        <section className="mx-auto max-w-[1200px] px-6 pt-20" aria-labelledby="sehirler-baslik">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <h2 id="sehirler-baslik" className="text-[34px] font-extrabold tracking-[-0.01em] text-ink">
                Nereye gitsek?
              </h2>
              <p className="mt-2 text-[15px] text-muted">
                Bir şehre tıkla, seçili tarihteki müsait otelleri gör.
              </p>
            </div>
            <div role="group" aria-label="Kartların tarihi" className="flex rounded-full bg-chip p-1">
              {kisayollar.map((k, i) => (
                <button
                  key={k.etiket}
                  type="button"
                  aria-pressed={sehirTarihi === i}
                  onClick={() => setSehirTarihi(i)}
                  className={cn(
                    "min-h-10 rounded-full px-4 text-[13.5px] font-bold transition-colors",
                    sehirTarihi === i ? "bg-paper text-ink shadow-sm" : "text-muted hover:text-ink"
                  )}
                >
                  {k.etiket} · {formatDateRange(k.checkIn, k.checkOut)}
                </button>
              ))}
            </div>
          </div>

          <ul className="mt-8 grid grid-cols-4 grid-rows-2 gap-4" style={{ height: 560 }}>
            {buyuk && (
              <li className="col-span-2 row-span-2">
                <SehirKartiBileseni sehir={buyuk} tarih={kartTarihi} buyuk />
              </li>
            )}
            {kucukler.map((s) => (
              <li key={s.ad}>
                <SehirKartiBileseni sehir={s} tarih={kartTarihi} />
              </li>
            ))}
          </ul>
        </section>

        {/* ── Nasıl çalışır: yalnızca tuttuğumuz sözler ───────────────── */}
        <section className="mx-auto max-w-[1200px] px-6 pt-24" aria-labelledby="nasil-baslik">
          <h2 id="nasil-baslik" className="text-[34px] font-extrabold tracking-[-0.01em] text-ink">
            Rezervasyon, sürprizsiz
          </h2>
          <ul className="mt-8 grid grid-cols-3 gap-10 border-t border-line pt-8">
            <li>
              <LbSaat size={26} className="text-navy" />
              <h3 className="mt-4 text-[18px] font-extrabold text-ink">Fiyat arama anında</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-slate-text">
                Listede gördüğün fiyatı o an otelden alıyoruz. Önbellekte kalmış eski bir fiyatla
                karşılaşmazsın; oda seçtiğinde bir kez daha doğrulanır.
              </p>
            </li>
            <li>
              <LbKalkanOnay size={26} className="text-navy" />
              <h3 className="mt-4 text-[18px] font-extrabold text-ink">İptal koşulu seçmeden önce</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-slate-text">
                Ücretsiz iptalin son günü ve saati oda kartında yazıyor. İade edilemeyen fiyatlar açıkça
                işaretli.
              </p>
            </li>
            <li>
              <LbBelge size={26} className="text-navy" />
              <h3 className="mt-4 text-[18px] font-extrabold text-ink">Her şey tek yerde</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-slate-text">
                Onay numarası, otel bilgileri ve iptal koşulları Rezervasyonlarım sayfasında; iptali de
                oradan yaparsın.
              </p>
            </li>
          </ul>
        </section>

        {/* ── Acenteler ────────────────────────────────────────────── */}
        <section className="mx-auto max-w-[1200px] px-6 py-24" aria-labelledby="acente-baslik">
          <div className="flex items-center justify-between gap-10 rounded-2xl bg-navy-deep px-12 py-10 text-white">
            <div className="max-w-xl">
              <h2 id="acente-baslik" className="text-[26px] font-extrabold">
                Acente misin?
              </h2>
              <p className="mt-2 text-[15px] leading-relaxed text-white/75">
                Partner hesabıyla müşterilerin adına rezervasyon yap, hepsini tek panelden izle.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <Link
                href="/agency/login"
                className="inline-flex min-h-12 items-center rounded-lg border border-white/30 px-5 text-[15px] font-bold hover:border-white/70"
              >
                Partner girişi
              </Link>
              <Link
                href="/register/agency"
                className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-gold px-5 text-[15px] font-extrabold text-ink hover:bg-gold-dark"
              >
                Başvur
                <LbSagOk size={16} />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function SehirKartiBileseni({
  sehir,
  tarih,
  buyuk = false,
}: {
  sehir: SehirKarti;
  tarih: Aralik;
  buyuk?: boolean;
}) {
  const hedef = { destination: sehir.sorgu, checkIn: tarih.checkIn, checkOut: tarih.checkOut, adults: 2 };
  // Tedarikçinin görsel adresi kırık olabiliyor; alt metin kutuya basılmasın.
  const [gorselHatali, setGorselHatali] = React.useState(false);
  return (
    <Link
      href={aramaAdresi(hedef)}
      onClick={() => addRecentSearch(hedef)}
      className="group relative block h-full overflow-hidden rounded-2xl bg-navy-deep"
    >
      {sehir.gorsel && !gorselHatali && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={sehir.gorsel}
          onError={() => setGorselHatali(true)}
          alt={sehir.gorselOtel ? `${sehir.ad}: ${sehir.gorselOtel}` : ""}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
      )}
      {/* Okunabilirlik: yalnızca alttaki metnin arkası koyulaşıyor. */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/75 to-transparent" />
      <div className={cn("absolute inset-x-5 bottom-5 text-white", buyuk && "inset-x-7 bottom-7")}>
        <p className={cn("font-extrabold leading-tight", buyuk ? "text-[34px]" : "text-[21px]")}>{sehir.ad}</p>
        <p className={cn("mt-1 text-white/85", buyuk ? "text-[15px]" : "text-[13px]")}>{sehir.yerler}</p>
        {sehir.otel > 0 && (
          <p className={cn("mt-3 inline-flex items-center gap-1.5 font-bold", buyuk ? "text-[15px]" : "text-[13px]")}>
            {sayi(sehir.otel)} otel fiyat veriyor
            <LbSagOk size={buyuk ? 16 : 14} className="transition-transform group-hover:translate-x-0.5" />
          </p>
        )}
      </div>
    </Link>
  );
}
