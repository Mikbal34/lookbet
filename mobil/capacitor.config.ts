// LookBeds mobil uygulaması (Capacitor): lookbeds.com'u açan kabuk.
// Site, User-Agent'taki "LookBedsApp/" ile uygulamada olduğunu anlar
// (src/lib/uygulama-ortak.ts): alt sekmeler, büyük açılış yok, yalnız müşteri.
//
// Denemek için yerel sunucu: npm run ios:yerel (CAP_SUNUCU=http://localhost:3000).
// Android: npm run android (emülatör ya da USB'li telefon); geri tuşu, hata sayfası
// ve açılış ayarları android/app/src/main (MainActivity.java, res/values/styles.xml).

import { writeFileSync } from "node:fs";
import type { CapacitorConfig } from "@capacitor/cli";

const sunucu = process.env.CAP_SUNUCU ?? "https://lookbeds.com";

// Çevrimdışı sayfasındaki "Tekrar dene" aynı sunucuya dönsün (yerelde localhost).
writeFileSync(new URL("./www/sunucu.js", import.meta.url), `window.LB_SUNUCU = ${JSON.stringify(sunucu)};\n`);

const config: CapacitorConfig = {
  appId: "com.lookbeds.app",
  appName: "LookBeds",
  webDir: "www",
  appendUserAgent: "LookBedsApp/1.0",
  backgroundColor: "#ffffff",
  server: {
    url: sunucu,
    cleartext: sunucu.startsWith("http://"),
    // Site açılamazsa (internet yok) uygulamanın içindeki sayfa.
    errorPath: "offline.html",
  },
  ios: {
    // Sayfa ekranın tamamını kullanır; çentik ve alt çizgi payları sitenin CSS'inde (safe-area).
    contentInset: "never",
  },
  plugins: {
    SplashScreen: { launchShowDuration: 1200, backgroundColor: "#ffffff", showSpinner: false },
    // Açık zemin: saat ve pil koyu renk.
    StatusBar: { style: "LIGHT" },
  },
};

export default config;
