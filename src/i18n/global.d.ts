// Metin anahtarlarının tip denetimi: t("yanlis.anahtar") derlemede hata
// verir. Türkçe dosyalar kaynaktır; İngilizce aynı anahtarları taşımalı
// (node scripts/ceviri-kontrol.mjs).
import type ortak from "../../messages/tr/ortak.json";
import type ust from "../../messages/tr/ust.json";
import type anaSayfa from "../../messages/tr/anaSayfa.json";
import type arama from "../../messages/tr/arama.json";
import type otel from "../../messages/tr/otel.json";
import type odeme from "../../messages/tr/odeme.json";
import type hesap from "../../messages/tr/hesap.json";
import type giris from "../../messages/tr/giris.json";
import type rezervasyon from "../../messages/tr/rezervasyon.json";
import type yardim from "../../messages/tr/yardim.json";
import type api from "../../messages/tr/api.json";

declare module "next-intl" {
  interface AppConfig {
    Locale: "tr" | "en";
    Messages: {
      ortak: typeof ortak;
      ust: typeof ust;
      anaSayfa: typeof anaSayfa;
      arama: typeof arama;
      otel: typeof otel;
      odeme: typeof odeme;
      hesap: typeof hesap;
      giris: typeof giris;
      rezervasyon: typeof rezervasyon;
      yardim: typeof yardim;
      /** Sunucunun kullanıcıya dönen mesajları ve e-postalar (yalnız sunucuda). */
      api: typeof api;
    };
  }
}
