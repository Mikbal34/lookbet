// Yardım merkezi makaleleri. Sitenin bugünkü işleyişine göre yazıldı; bir özellik
// değişince ilgili makale de güncellenmeli (ör. tarih değiştirme gelince "tarih").

import type { NesneAdi } from "@/components/lb/nesne";

export type Kitle = "misafir" | "acente";

export interface Makale {
  id: string;
  kitle: Kitle;
  konu: string;
  baslik: string;
  metin: string[];
}

export const MAKALELER: Makale[] = [
  {
    id: "giris",
    kitle: "misafir",
    konu: "Hesap ve giriş",
    baslik: "Şifre olmadan nasıl giriş yaparım?",
    metin: [
      "Sağ üstteki menüden \"Giriş yap ya da üye ol\"u seç. E-posta adresini yaz ve \"Devam et\"e bas.",
      "E-postana 6 haneli bir kod gelir. Kodu kutulara yazdığında giriş tamamlanır; şifre hatırlaman gerekmez.",
      "Bu e-postayla hesabın yoksa aynı adımda açılır. İlk girişte adını ve soyadını soruyoruz; rezervasyonlarda ve otelde bu ad görünür.",
    ],
  },
  {
    id: "kod",
    kitle: "misafir",
    konu: "Hesap ve giriş",
    baslik: "Giriş kodu gelmedi",
    metin: [
      "Önce gereksiz (spam) klasörüne bak. Kod birkaç saniye içinde gelir.",
      "60 saniye sonra \"Kodu yeniden gönder\" çıkar. Yeni kod gönderilince eskisi geçersiz olur; her zaman en son gelen kodu kullan.",
      "Kod 10 dakika geçerlidir. Beş kez yanlış girilirse yeni kod istemen gerekir.",
      "E-posta adresini yanlış yazdıysan kod ekranındaki \"E-postayı değiştir\"e bas.",
    ],
  },
  {
    id: "hesap-bilgi",
    kitle: "misafir",
    konu: "Hesap ve giriş",
    baslik: "Adımı ya da telefonumu nasıl değiştiririm?",
    metin: [
      "Menüden \"Hesabım\"a git. Ad ve telefon oradan değiştirilir.",
      "E-posta adresin girişin anahtarı olduğu için değiştirmek istersen destek ekibine yaz.",
    ],
  },
  {
    id: "rezervasyonlarim",
    kitle: "misafir",
    konu: "Rezervasyon",
    baslik: "Rezervasyonlarımı nerede görürüm?",
    metin: [
      "Menüden \"Rezervasyonlarım\"a git. Yaklaşan, Geçmiş ve İptal edilen sekmeleri var.",
      "Sıradaki konaklaman üstte büyük kartta durur: kaç gün kaldığı, giriş ve çıkış günleri, ücretsiz iptalin son günü.",
      "Bir karta basınca rezervasyonun tüm ayrıntıları açılır: oda, misafirler, konum, otelin iletişim bilgileri ve iptal koşulları.",
    ],
  },
  {
    id: "onay-bekliyor",
    kitle: "misafir",
    konu: "Rezervasyon",
    baslik: "\"Otel onayı bekleniyor\" ne demek?",
    metin: [
      "Bazı oteller rezervasyonu hemen değil, kısa bir süre içinde onaylar. Bu sürede rezervasyonun \"Otel onayı bekleniyor\" olarak görünür.",
      "Otel onaylayınca durum \"Onaylandı\"ya döner ve otelin onay numarası rezervasyon ayrıntılarında çıkar.",
      "Otel onaylamazsa rezervasyon tamamlanmaz ve ücret alınmaz.",
    ],
  },
  {
    id: "rez-no",
    kitle: "misafir",
    konu: "Rezervasyon",
    baslik: "Rezervasyon numaram nerede?",
    metin: [
      "Rezervasyonlarım'daki kartta ve rezervasyon ayrıntılarında \"Rezervasyon no\" olarak yazar; yanındaki düğmeyle kopyalayabilirsin.",
      "Otel onayladıktan sonra ayrıca otelin kendi onay numarası da görünür. Otelde ikisinden biri sorulabilir.",
    ],
  },
  {
    id: "ozel-istek",
    kitle: "misafir",
    konu: "Rezervasyon",
    baslik: "Özel isteğim otele iletilir mi?",
    metin: [
      "Ödeme adımındaki \"Özel istek\" alanına yazdıkların otele iletilir ve rezervasyon ayrıntılarında görünür.",
      "Yüksek kat, erken giriş gibi istekler otelin müsaitliğine bağlıdır; garanti edilmez.",
    ],
  },
  {
    id: "iptal",
    kitle: "misafir",
    konu: "İptal ve değişiklik",
    baslik: "Rezervasyonumu nasıl iptal ederim?",
    metin: [
      "Rezervasyonlarım'dan rezervasyonu aç, \"İptal koşulları\" bölümündeki \"Rezervasyonu iptal et\"e bas.",
      "Açılan pencerede şu an iptal edersen kesilecek ücret gösterilir. Onaylarsan iptal otele iletilir ve sonucu aynı pencerede görürsün.",
      "İptal edilen rezervasyon \"İptal edilen\" sekmesine geçer; iptal ücreti orada da yazar.",
    ],
  },
  {
    id: "ucretsiz-iptal",
    kitle: "misafir",
    konu: "İptal ve değişiklik",
    baslik: "Ücretsiz iptal süresi nedir?",
    metin: [
      "Oda seçerken ve rezervasyonunda \"… tarihine kadar ücretsiz iptal\" yazar. Bu saate kadar iptal edersen ücret alınmaz.",
      "Saatler Türkiye saatine göredir. Süre geçtikten sonra otelin koşuldaki iptal ücreti uygulanır.",
      "Bazı odalar iade edilmezdir; bu, oda seçerken ve rezervasyonda açıkça yazar.",
    ],
  },
  {
    id: "iptal-ucreti",
    kitle: "misafir",
    konu: "İptal ve değişiklik",
    baslik: "İptal ücreti nasıl belirlenir?",
    metin: [
      "Ücret, rezervasyonu yaparken seçtiğin odanın iptal koşuluna göre belirlenir; iptal zamanına göre değişir.",
      "İptal penceresinde gördüğün tutar bu koşula göre hesaplanır. Kesin tutar otelden gelen yanıtla belirlenir ve iptalden sonra gösterilir.",
    ],
  },
  {
    id: "tarih",
    kitle: "misafir",
    konu: "İptal ve değişiklik",
    baslik: "Tarihleri değiştirebilir miyim?",
    metin: [
      "Şu an rezervasyonun tarihleri doğrudan değiştirilemiyor.",
      "Ücretsiz iptal süresindeysen rezervasyonu ücretsiz iptal edip yeni tarihlerle yeniden rezervasyon yapabilirsin.",
    ],
  },
  {
    id: "vergi",
    kitle: "misafir",
    konu: "Fiyat ve ödeme",
    baslik: "Fiyatlara vergiler dahil mi?",
    metin: [
      "Evet. Arama sonuçlarında, otel sayfasında ve ödeme adımında gösterilen toplam tutara vergiler dahildir.",
      "Otelin girişte isteyebileceği depozito ya da tesiste yaptığın ekstra harcamalar bu tutara dahil değildir.",
    ],
  },
  {
    id: "uyruk",
    kitle: "misafir",
    konu: "Fiyat ve ödeme",
    baslik: "Uyruk fiyatı neden değiştiriyor?",
    metin: [
      "Oteller bazı ülkelerden gelen misafirlere farklı fiyat verebilir. Bu yüzden arama, misafirin uyruğuna göre yapılır.",
      "Uyruğu arama sonuçlarındaki \"Filtreler\"den değiştirebilirsin; değiştirince arama yeniden yapılır.",
    ],
  },
  {
    id: "fatura",
    kitle: "misafir",
    konu: "Fiyat ve ödeme",
    baslik: "Faturamı nasıl alırım?",
    metin: [
      "Konaklama faturası otel tarafından düzenlenir.",
      "Kurumsal fatura gerekiyorsa rezervasyonu yaparken özel istek alanına şirket ve vergi bilgilerini yaz ya da destek ekibine ulaş.",
    ],
  },
  {
    id: "giris-cikis",
    kitle: "misafir",
    konu: "Konaklama",
    baslik: "Giriş ve çıkış saatleri",
    metin: [
      "Otelin giriş ve çıkış saatleri otel sayfasındaki \"Bilinmesi gerekenler\" bölümünde ve rezervasyon ayrıntılarında yazar.",
      "Girişte kimlik istenir. Bazı oteller girişte depozito alır; harcama yapılmazsa çıkışta iade edilir.",
    ],
  },
  {
    id: "otel-iletisim",
    kitle: "misafir",
    konu: "Konaklama",
    baslik: "Otelle nasıl iletişime geçerim?",
    metin: [
      "Rezervasyon ayrıntılarındaki \"Konum ve iletişim\" bölümünde otelin telefonu ve e-postası, yanında yol tarifi bağlantısı var.",
    ],
  },
  {
    id: "a-giris",
    kitle: "acente",
    konu: "Giriş",
    baslik: "Acente girişi nasıl yapılır?",
    metin: [
      "Menüden \"Acente girişi\"ne ya da doğrudan acente giriş sayfasına git. Hesabına kayıtlı e-postayı yaz.",
      "E-postana 6 haneli bir kod gelir; kodla girersin, şifre yoktur. Kod 10 dakika geçerlidir.",
      "Acente hesabı LookBeds ile anlaşma yapılınca açılır. \"Bu e-postayla kayıtlı bir acente hesabı yok\" diyorsa temsilcine yaz.",
    ],
  },
  {
    id: "a-rezervasyon",
    kitle: "acente",
    konu: "Rezervasyon",
    baslik: "Müşterim için nasıl rezervasyon yaparım?",
    metin: [
      "Partner panelindeki \"Bugün\" sayfasında \"Müşterin için otel ara\" çubuğunu ya da sağ üstteki \"Otel ara\"yı kullan.",
      "Acente hesabıyla giriş yapmışken aramada acente fiyatların görünür. Ödeme adımında iletişim ve misafir bilgilerine müşterinin bilgilerini yaz.",
      "Rezervasyon panelde Rezervasyonlar ve Bugün sayfalarına düşer.",
    ],
  },
  {
    id: "a-bugun",
    kitle: "acente",
    konu: "Rezervasyon",
    baslik: "\"İptal süresi dolmak üzere\" ne gösterir?",
    metin: [
      "Bugün sayfasındaki bu çip, ücretsiz iptal süresi 2 gün içinde bitecek yaklaşan rezervasyonları toplar.",
      "Müşterin vazgeçebilecekse bu süre dolmadan iptal etmek ücret ödenmemesini sağlar.",
    ],
  },
  {
    id: "a-iptal",
    kitle: "acente",
    konu: "Rezervasyon",
    baslik: "Bir rezervasyonu nasıl iptal ederim?",
    metin: [
      "Rezervasyonlar ya da Bugün sayfasında rezervasyona bas; ayrıntı penceresindeki \"Rezervasyonu iptal et\"i seç.",
      "Pencerede şu an kesilecek ücret gösterilir; onaylayınca iptal otele iletilir.",
    ],
  },
  {
    id: "a-belge",
    kitle: "acente",
    konu: "Rezervasyon",
    baslik: "Rezervasyon belgesini müşteriye nasıl iletirim?",
    metin: [
      "Rezervasyonun ayrıntı penceresindeki \"Rezervasyon belgesi\" rezervasyon sayfasını yeni sekmede açar: otel, tarihler, misafirler, iptal koşulları.",
      "Bu sayfayı yazdırabilir ya da PDF olarak kaydedip müşterine gönderebilirsin.",
    ],
  },
  {
    id: "a-excel",
    kitle: "acente",
    konu: "Rezervasyon",
    baslik: "Rezervasyonları Excel'e nasıl aktarırım?",
    metin: [
      "Rezervasyonlar sayfasında durum filtresini ve aramayı istediğin gibi ayarla, sonra \"Excel'e aktar\"a bas.",
      "Ekrandaki liste Excel'in doğrudan açtığı bir dosya olarak iner.",
    ],
  },
  {
    id: "a-komisyon",
    kitle: "acente",
    konu: "Kazanç",
    baslik: "Komisyonum nasıl hesaplanır?",
    metin: [
      "Komisyon, anlaşmandaki oran ile onaylı rezervasyonların tutarı çarpılarak hesaplanır. Rezervasyon, girişinin olduğu aya yazılır.",
      "İptal edilen ve tamamlanamayan rezervasyonlar sayılmaz.",
      "Kazançlar sayfasındaki tutarlar bu hesaba göre tahminidir; ödemeler anlaşmana göre yapılır.",
    ],
  },
  {
    id: "a-sirket",
    kitle: "acente",
    konu: "Şirket",
    baslik: "Şirket bilgilerimi nasıl değiştiririm?",
    metin: [
      "Şirket bilgileri ve anlaşmadaki oranlar panelde yalnızca görüntülenir.",
      "Adres, telefon ya da oranlarda değişiklik için LookBeds temsilcine yaz.",
    ],
  },
];

/** "Başlarken" rehberleri: nesne, başlık, açıklama, açtığı makale. */
export const REHBERLER: Record<Kitle, { nesne: NesneAdi; baslik: string; aciklama: string; makale: string }[]> = {
  misafir: [
    { nesne: "kapi", baslik: "Giriş ve hesap", aciklama: "Şifresiz giriş, kod ve hesap bilgileri", makale: "giris" },
    { nesne: "bavul", baslik: "Rezervasyonun", aciklama: "Rezervasyonlarım, onay ve rezervasyon numarası", makale: "rezervasyonlarim" },
    { nesne: "iptal", baslik: "İptal ve değişiklik", aciklama: "Ücretsiz iptal süresi ve iptal ücreti", makale: "iptal" },
  ],
  acente: [
    { nesne: "anahtar-karti", baslik: "Partner paneline giriş", aciklama: "Kodla giriş ve hesabın", makale: "a-giris" },
    { nesne: "pasaport", baslik: "Müşterin için rezervasyon", aciklama: "Arama, rezervasyon ve belge", makale: "a-rezervasyon" },
    { nesne: "havale", baslik: "Komisyon ve kazanç", aciklama: "Komisyon nasıl hesaplanır", makale: "a-komisyon" },
  ],
};

export const makaleBul = (id: string) => MAKALELER.find((m) => m.id === id) ?? null;

/** Kitlenin konuları, makale sırasına göre. */
export const konular = (k: Kitle) => [...new Set(MAKALELER.filter((m) => m.kitle === k).map((m) => m.konu))];

export const DESTEK = { eposta: "destek@lookbet.com", telefon: "0850 255 00 00", telefonHref: "tel:+908502550000" };
