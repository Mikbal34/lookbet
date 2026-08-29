// ── APP MODU ──────────────────────────────────────────────────────────
// Aynı Next.js sitesi üç yerde birden çalışıyor:
//
//   web      → normal tarayıcı (mobil veya masaüstü)
//   b2c      → LookBeds tüketici uygulaması (WebView)
//   partner  → LookBeds Partner, acenteler için ayrı uygulama (WebView)
//
// Site bunu kendi başına anlayamaz (ekran, CSS, JS aynı), bu yüzden native
// kabuk kendini User-Agent'a eklediği bir imzayla tanıtır:
//
//   Mozilla/5.0 (iPhone …) Safari/604.1 LookBedsApp/1.0        → b2c
//   Mozilla/5.0 (iPhone …) Safari/604.1 LookBedsPartner/1.0    → partner
//
// Tespit <head> içindeki senkron script'te yapılır ve sonuç
// <html data-app="b2c"> / <html data-app="partner"> olarak işaretlenir;
// web'de attribute hiç konmaz. Böylece:
//   • Sayfalar statik üretilmeye devam eder (headers() okumak gerekmez).
//   • İşaret ilk boyamadan ÖNCE konduğu için gizlenen öğeler bir an görünüp
//     kaybolmaz.
//
// Kullanım:
//   • Görsel fark için CSS sınıfı — titremesiz olan yol budur:
//       web-only      yalnızca tarayıcıda
//       app-only      her iki uygulamada (web'de gizli)
//       b2c-only      yalnızca tüketici uygulamasında
//       partner-only  yalnızca partner uygulamasında
//   • Davranış farkı için useAppMode() hook'u (./use-app-mode).
//
// Tarayıcıda test: geliştirmede ?app=b2c / ?app=partner / ?app=0. Bu kısayol
// üretim derlemesine HİÇ girmiyor (bkz. APP_MODE_SCRIPT).
//
// NOT: Partner kabuğu yazılırken User-Agent'a 'LookBedsPartner' eklemek
// ZORUNLU. Eklenmezse React Native köprüsü üzerinden b2c'ye düşer ve
// tüketici sekme çubuğunu görür.
//
// Bu dosyada bilerek "use client" yok: root layout (sunucu bileşeni)
// APP_MODE_SCRIPT'i import ediyor; client modülünden import edilen değerler
// sunucuda client-reference'a dönüşeceği için string'e erişilemezdi.

/** Sitenin çalışabileceği ortamlar. */
export type AppMode = "web" | "b2c" | "partner";

/** Native kabukların User-Agent'a eklemesi gereken imzalar. */
export const APP_UA_TOKENS = {
  b2c: "LookBedsApp",
  partner: "LookBedsPartner",
} as const;

/**
 * <head> içine gömülen senkron script.
 *
 * Üretimde modu YALNIZCA User-Agent imzası (ve React Native köprüsü)
 * belirler. `?app=` kısayolu ve localStorage'a yazılan tercih sadece
 * geliştirmede çalışır: canlıda `?app=1` içeren bir bağlantıya tıklayan
 * gerçek bir kullanıcı tarayıcıda app modunda kilitli kalırdı (hamburger
 * menü yok, alt sekme çubuğu var, footer yok) ve siteyi bozuk sanardı.
 *
 * Geliştirmede sıra: 1) ?app=b2c|partner|0 (1 eski yazım, b2c'ye eşlenir)
 * 2) kalıcılaşmış tercih  3) User-Agent / RN köprüsü.
 */
export const APP_MODE_SCRIPT = `(function(){try{
var ua=navigator.userAgent;
var t=ua.indexOf('${APP_UA_TOKENS.partner}')!==-1?'partner'
  :(ua.indexOf('${APP_UA_TOKENS.b2c}')!==-1||!!window.ReactNativeWebView)?'b2c':null;
var m=t;
${
  process.env.NODE_ENV === "development"
    ? `var q=/[?&]app=(b2c|partner|0|1)/.exec(location.search);
if(q){var v=q[1]==='1'?'b2c':q[1];try{localStorage.setItem('lb_app',v)}catch(e){}}
var s=null;try{s=localStorage.getItem('lb_app')}catch(e){}
m=(s==='b2c'||s==='partner')?s:(s==='0'?null:t);`
    : ``
}
if(m){document.documentElement.setAttribute('data-app',m)}
}catch(e){}})();`;
