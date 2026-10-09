// Uçtan uca testler (e2e/). Yerel veritabanı ve SAHTE tedarikçiyle çalışır:
// Etscore'a gerçek rezervasyon gitmesin diye sunucu ROYAL_API_MOCK=true,
// rezervasyon kapalı bayrağı test için açık (REZERVASYON_ACIK=1).
//
//   npx playwright test            → sunucu yoksa 3100'de kendisi açar
//   npx playwright test --ui       → adım adım izleyerek
//
// Test hesapları @lookbeds.test; kurulum eski test verisini siler, bitişte
// tekrar temizler (e2e/veri.ts).

import { defineConfig } from "@playwright/test";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const PORT = 3100;

export default defineConfig({
  testDir: "e2e",
  // Senaryolar birbirine bağlı (yönetici kupon açar, müşteri kullanır): sırayla.
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  globalSetup: "./e2e/kurulum.ts",
  globalTeardown: "./e2e/temizlik.ts",
  use: {
    baseURL: `http://localhost:${PORT}`,
    // Makinedeki Google Chrome (ayrı tarayıcı indirmeden).
    channel: "chrome",
    locale: "tr-TR",
    timezoneId: "Europe/Istanbul",
    viewport: { width: 1440, height: 900 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: `npx next dev -p ${PORT}`,
    env: { ROYAL_API_MOCK: "true", REZERVASYON_ACIK: "1", NEXTAUTH_URL: `http://localhost:${PORT}` },
    url: `http://localhost:${PORT}/api/saglik`,
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
