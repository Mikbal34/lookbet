"use client";

// Yardım merkezi — lookbet. tasarım dili: koyu gradyan arama bandı,
// kategori kartları, akordeon SSS, iletişim kartı.

import { useState } from "react";
import {AppHeader, Navbar, Footer } from "@/components/layout";

const helpCats = [
  { title: "Rezervasyon işlemleri", count: 12 },
  { title: "İptal & iade", count: 9 },
  { title: "Ödeme & fatura", count: 7 },
  { title: "Üyelik & hesap", count: 6 },
  { title: "Acente / partner", count: 8 },
  { title: "Otel bilgileri", count: 5 },
];

const faqs = [
  {
    q: "Rezervasyonumu nasıl iptal ederim?",
    a: "Hesabım → Rezervasyonlarım bölümünden ilgili rezervasyonu açıp \"İptal et\" butonunu kullanabilirsin. Ücretsiz iptal süresi içindeysen ücret alınmaz; süre otelin iptal politikasına göre değişir.",
  },
  {
    q: "Onay kodum nerede?",
    a: "Rezervasyon tamamlandığında onay kodun ekranda gösterilir ve e-posta adresine gönderilir. Hesabım → Rezervasyonlarım bölümünden de her zaman ulaşabilirsin.",
  },
  {
    q: "Girişte ödeme nasıl çalışır?",
    a: "\"Girişte ödeme\" seçeneği olan otellerde rezervasyon sırasında ödeme alınmaz; konaklama bedelini otele girişte ödersin. Kart bilgin yalnızca garanti amaçlı alınır.",
  },
  {
    q: "Fiyatlar neden değişiyor?",
    a: "Otel fiyatları doluluk, tarih ve misafir uyruğuna göre dinamik olarak değişir. Gördüğün fiyat, arama kriterlerin için o anki en güncel fiyattır.",
  },
  {
    q: "Faturamı nasıl alırım?",
    a: "Konaklama faturası otel tarafından düzenlenir ve çıkışta iletilir. Kurumsal fatura ihtiyacın varsa rezervasyon notuna vergi bilgilerini ekleyebilir veya destek ekibimize yazabilirsin.",
  },
];

export default function HelpPage() {
  const [acikSoru, setAcikSoru] = useState<string | null>(faqs[0]?.q ?? null);
  const [sorgu, setSorgu] = useState("");

  // Arama kutusu eskiden hiçbir şeye bağlı değildi; yazılan şey hiçbir yeri
  // etkilemiyordu. Artık SSS listesini süzüyor.
  const kucult = (t: string) => t.toLocaleLowerCase("tr");
  const gorunenSSS = sorgu.trim()
    ? faqs.filter((f) => kucult(f.q + " " + f.a).includes(kucult(sorgu.trim())))
    : faqs;

  return (
    <div className="min-h-screen flex flex-col bg-paper">
      <AppHeader geri baslik="Yardım" />
      <div className="web-only">
        <Navbar />
      </div>

      {/* Arama bandı */}
      <div
        className="px-6 py-10 lg:py-14 text-center"
        style={{ background: "linear-gradient(150deg,#E06028,#8F3A12)" }}
      >
        <h1 className="font-serif text-3xl lg:text-[34px] font-normal text-paper mb-5">
          Nasıl yardımcı olabiliriz?
        </h1>
        <input
          type="search"
          value={sorgu}
          onChange={(e) => setSorgu(e.target.value)}
          aria-label="Yardım konularında ara"
          placeholder="Soru veya konu ara — örn. iptal, fatura, onay kodu"
          className="w-full max-w-[560px] rounded-md px-[22px] py-[17px] font-sans text-[15px] outline-none shadow-[0_10px_30px_rgba(14,42,69,0.4)] bg-white text-ink placeholder:text-muted/70"
        />
      </div>

      <main className="flex-1 max-w-[1080px] w-full mx-auto px-4 sm:px-6 lg:px-10 py-11">
        {/* Kategoriler */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-11">
          {helpCats.map((c) => (
            <div
              key={c.title}
              className="bg-white border border-line rounded-md px-[22px] py-5 cursor-pointer hover:border-navy hover:shadow-[0_8px_24px_rgba(20,32,46,0.08)] transition-all"
            >
              <div className="text-[15px] font-bold">{c.title}</div>
              <div className="text-[13px] text-muted mt-1">
                {c.count} makale
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-9 items-start">
          {/* SSS */}
          <div className="flex-[999_1_300px] min-w-0">
            <h2 className="font-serif text-2xl font-normal mb-4">
              Sık sorulanlar
            </h2>
            <div className="flex flex-col gap-2.5">
              {gorunenSSS.map((f) => (
                <div
                  key={f.q}
                  className="bg-white border border-line rounded-md overflow-hidden"
                >
                  <button
                    onClick={() =>
                      setAcikSoru(acikSoru === f.q ? null : f.q)
                    }
                    className="w-full min-h-14 flex justify-between items-center px-5 py-4 cursor-pointer text-[14.5px] font-semibold text-left"
                    aria-expanded={acikSoru === f.q}
                  >
                    {f.q}
                    <span className="text-navy text-lg shrink-0 ml-3">
                      {acikSoru === f.q ? "−" : "+"}
                    </span>
                  </button>
                  {acikSoru === f.q && (
                    <div className="px-5 pb-[18px] text-sm text-slate-text leading-relaxed">
                      {f.a}
                    </div>
                  )}
                </div>
              ))}

              {gorunenSSS.length === 0 && (
                <p className="rounded-md border border-line bg-white px-5 py-6 text-center text-sm text-muted">
                  &ldquo;{sorgu}&rdquo; için sonuç bulunamadı. Aşağıdan canlı
                  desteğe yazabilirsin.
                </p>
              )}
            </div>
          </div>

          {/* İletişim */}
          <div className="flex flex-col gap-3.5 flex-[1_1_280px]">
            <div className="bg-white rounded-md p-[22px] border border-[rgb(26_24_20/0.08)]">
              <div className="text-xs font-bold tracking-[1.5px] uppercase text-muted mb-3.5">
                Bize ulaş
              </div>
              <div className="flex flex-col gap-3 text-sm">
                <div>
                  <div className="text-xs text-muted">Çağrı merkezi (7/24)</div>
                  <b>0850 255 00 00</b>
                </div>
                <div>
                  <div className="text-xs text-muted">E-posta</div>
                  <b>destek@lookbet.com</b>
                </div>
                <div>
                  <div className="text-xs text-muted">WhatsApp</div>
                  <b>+90 530 000 00 00</b>
                </div>
              </div>
              <a
                href="mailto:destek@lookbet.com"
                className="block w-full text-center bg-navy text-paper rounded-md py-[13px] text-sm font-bold cursor-pointer mt-[18px] hover:bg-navy-dark transition-colors"
              >
                Canlı destek başlat
              </a>
            </div>
            <div className="bg-gold-soft rounded-md px-5 py-[18px] text-[13px] text-gold-text leading-relaxed">
              <b>Ortalama yanıt süresi:</b> canlı destekte 2 dk, e-postada 4
              saat.
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
