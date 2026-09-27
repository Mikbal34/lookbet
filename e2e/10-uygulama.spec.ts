// Mobil uygulama görünümü (User-Agent'ta "LookBedsApp/"): alt sekmeler, büyük
// açılış yok, alt bilgi ve acente girişi yok, oteller aynı sekmede. Telefon
// tarayıcısı normal siteyi görür (09-mobil).

import { expect, test } from "@playwright/test";
import { gunSonra } from "./yardimci";

test.use({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 3,
  userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 LookBedsApp/1.0",
});

const sekmeler = (page: import("@playwright/test").Page) => page.getByRole("navigation", { name: "Uygulama sekmeleri" });

test("Keşfet: alt sekmeler var, alt bilgi ve büyük açılış yok", async ({ page }) => {
  await page.goto("/");
  await expect(sekmeler(page).getByRole("link", { name: "Keşfet" })).toHaveAttribute("aria-current", "page");
  await expect(sekmeler(page).getByRole("link", { name: "Giriş yap" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Hepsi" })).toBeVisible();
  await expect(page.locator("footer")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Menü" })).toHaveCount(0);
});

test("otel aynı sekmede açılır, otel sayfasında sekme yok, geri sonuçlara döner", async ({ page }) => {
  await page.goto(`/search?destination=Antalya&checkIn=${gunSonra(60)}&checkOut=${gunSonra(62)}&adults=2`);
  const otel = page.locator('a[href^="/hotel/"]').first();
  await expect(otel).toBeVisible({ timeout: 30_000 });
  await expect(otel).not.toHaveAttribute("target");
  await expect(sekmeler(page)).toBeVisible();
  await otel.click();
  await expect(page).toHaveURL(/\/hotel\//);
  await expect(sekmeler(page)).toHaveCount(0);
  // Uygulama içi geçişte geri düğmesi geçmişe döner: sonuçlar (bellekten) ve sekmeler yerinde.
  await page.getByRole("button", { name: "Geri" }).first().click();
  await expect(page).toHaveURL(/\/search\?/);
  await expect(sekmeler(page)).toBeVisible();
  await expect(page.locator('a[href^="/hotel/"]').first()).toBeVisible({ timeout: 3_000 });
});

test("girişsiz Profil: dil ve yardım kartları var, giriş penceresinde acente yok", async ({ page }) => {
  await page.goto("/profile");
  await expect(page.getByRole("button", { name: /Dil ve para birimi/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Yardım merkezi/ })).toBeVisible();
  await page.getByRole("button", { name: "Giriş yap ya da üye ol" }).click();
  await expect(page.getByRole("dialog").getByRole("heading", { name: /hoş geldin/ })).toBeVisible();
  await expect(page.getByText("Acente misin?")).toHaveCount(0);
});

test("yardım: geri düğmesi ve uygulamaya göre tarif", async ({ page }) => {
  await page.goto("/yardim/giris");
  await expect(page.getByText('Alttaki "Giriş yap" sekmesine dokun')).toBeVisible();
  await expect(page.getByText("Sağ üstteki menüden")).toHaveCount(0);
  // Doğrudan açılan sayfada geçmiş yok: geri düğmesi Profil'e götürür.
  await page.getByRole("button", { name: "Geri" }).click();
  await expect(page).toHaveURL(/\/profile$/);
  await expect(sekmeler(page)).toBeVisible();
});
