// Kampanyalar — hem /kampanyalar sayfası hem uygulama ana sayfasındaki
// karusel aynı kaynağı kullansın diye burada.

export const CAMPAIGNS = [
  {
    tag: "ERKEN REZERVASYON",
    until: "30 Eylül'e kadar",
    amount: "%25",
    title: "Yaz tatilini şimdiden planla",
    desc: "Seçili tatil otellerinde erken rezervasyona %25'e varan indirim. İptal koşulları esnek, girişte ödeme seçeneği geçerli.",
    code: "ERKEN25",
    bg: "linear-gradient(150deg,#E06028,#8F3A12)",
  },
  {
    tag: "HAFTA SONU",
    until: "Her hafta sonu",
    amount: "%15",
    title: "Şehir otellerinde hafta sonu kaçamağı",
    desc: "Cuma–Pazar konaklamalarında şehir otellerine özel %15 indirim. Kahvaltı dahil seçeneklerde de geçerli.",
    code: "HSONU15",
    bg: "linear-gradient(150deg,#9A7410,#6E4E28)",
  },
  {
    tag: "SON DAKİKA",
    until: "72 saat içinde giriş",
    amount: "%30",
    title: "Bugün ara, yarın otelde ol",
    desc: "Girişe 72 saatten az kalan rezervasyonlarda seçili otellerde %30'a varan son dakika indirimi.",
    code: "SONDK30",
    bg: "linear-gradient(150deg,#ED7B45,#E06028)",
  },
  {
    tag: "UZUN KONAKLAMA",
    until: "5 gece ve üzeri",
    amount: "%20",
    title: "Uzun kal, az öde",
    desc: "5 gece ve üzeri konaklamalarda %20 indirim. Aylık konaklamalarda ekstra avantajlar için bizi arayın.",
    code: "UZUN20",
    bg: "linear-gradient(150deg,#14202E,#8F3A12)",
  },
] as const;

export type Campaign = (typeof CAMPAIGNS)[number];
