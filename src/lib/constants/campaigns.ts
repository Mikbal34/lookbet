// Kampanyalar — hem /kampanyalar sayfası hem uygulama ana sayfasındaki
// karusel aynı kaynağı kullansın diye burada.
//
// bg: /kampanyalar sayfasındaki kart zemini (gradyan).
// image: uygulama ana sayfasındaki karusel görseli.

export const CAMPAIGNS = [
  {
    tag: "ERKEN REZERVASYON",
    until: "30 Eylül'e kadar",
    amount: "%25",
    title: "Yaz tatilini şimdiden planla",
    desc: "Seçili tatil otellerinde erken rezervasyona %25'e varan indirim. İptal koşulları esnek, girişte ödeme seçeneği geçerli.",
    code: "ERKEN25",
    image:
      "https://images.unsplash.com/photo-1509233725247-49e657c54213?w=900&q=80&auto=format&fit=crop",
    bg: "linear-gradient(150deg,#0B63E5,#0A1F44)",
  },
  {
    tag: "HAFTA SONU",
    until: "Her hafta sonu",
    amount: "%15",
    title: "Şehir otellerinde hafta sonu kaçamağı",
    desc: "Cuma–Pazar konaklamalarında şehir otellerine özel %15 indirim. Kahvaltı dahil seçeneklerde de geçerli.",
    code: "HSONU15",
    image:
      "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=900&q=80&auto=format&fit=crop",
    bg: "linear-gradient(150deg,#9A7410,#6E4E28)",
  },
  {
    tag: "SON DAKİKA",
    until: "72 saat içinde giriş",
    amount: "%30",
    title: "Bugün ara, yarın otelde ol",
    desc: "Girişe 72 saatten az kalan rezervasyonlarda seçili otellerde %30'a varan son dakika indirimi.",
    code: "SONDK30",
    image:
      "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=900&q=80&auto=format&fit=crop",
    bg: "linear-gradient(150deg,#3D85EE,#0B63E5)",
  },
  {
    tag: "UZUN KONAKLAMA",
    until: "5 gece ve üzeri",
    amount: "%20",
    title: "Uzun kal, az öde",
    desc: "5 gece ve üzeri konaklamalarda %20 indirim. Aylık konaklamalarda ekstra avantajlar için bizi arayın.",
    code: "UZUN20",
    image:
      "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=900&q=80&auto=format&fit=crop",
    bg: "linear-gradient(150deg,#06163A,#0A1F44)",
  },
] as const;

export type Campaign = (typeof CAMPAIGNS)[number];
