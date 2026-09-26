// Rezervasyonlar ödeme altyapısı gelene kadar kapalı. REZERVASYON_ACIK=1
// değilse yalnız yöneticiler (test için) rezervasyon yapabilir; müşteri ve
// acentelere kapalı. Sunucu tarafı kontrol /api/booking'de; ödeme sayfası
// da aynı bayrağa bakıp onay düğmesini kapatır.

export const rezervasyonAcik = () => process.env.REZERVASYON_ACIK === "1";

export const rezervasyonYapabilir = (rol: string | undefined) => rezervasyonAcik() || rol === "ADMIN";

export const REZERVASYON_KAPALI_MESAJI =
  "Rezervasyonlar şu an kapalı: ödeme altyapımız hazırlanıyor. Çok yakında buradan rezervasyon yapabileceksin.";
