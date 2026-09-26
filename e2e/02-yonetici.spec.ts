// Yönetim paneli: giriş, tüm sayfalar hatasız açılıyor mu, sonra işlemler.

import { expect, test, type Page } from "@playwright/test";
import { EPOSTA } from "./veri";
import { girisYap } from "./yardimci";

test.describe.configure({ mode: "serial" });

const YONETICI = "e2e/.auth/yonetici.json";

/** Sayfadaki tarayıcı hatalarını ve 5xx/4xx API yanıtlarını toplar. */
export function hataToplayici(page: Page) {
  const hatalar: string[] = [];
  page.on("pageerror", (e) => hatalar.push(`sayfa hatası: ${e.message}`));
  page.on("response", (r) => {
    const u = new URL(r.url());
    if (u.pathname.startsWith("/api/") && r.status() >= 400 && r.status() !== 401) hatalar.push(`${r.status()} ${r.request().method()} ${u.pathname}`);
    else if (r.status() >= 500) hatalar.push(`${r.status()} ${u.pathname}`);
  });
  return hatalar;
}

test("yönetici acente girişinden girer, panele düşer", async ({ page }) => {
  await girisYap(page, { eposta: EPOSTA.yonetici, yol: "/agency/login" });
  await expect(page).toHaveURL(/\/admin/);
  await page.context().storageState({ path: YONETICI });
});

test("derin bağlantı girişten sonra korunur", async ({ page }) => {
  await page.goto("/admin/price-rules?x=1");
  await expect(page).toHaveURL(/\/agency\/login\?callbackUrl=%2Fadmin%2Fprice-rules%3Fx%3D1/);
  await girisYap(page, { eposta: EPOSTA.yonetici, yol: page.url().replace(/^https?:\/\/[^/]+/, "") });
  await expect(page).toHaveURL(/\/admin\/price-rules\?x=1$/);
});

test.describe("oturumlu", () => {
  test.use({ storageState: YONETICI });

  const SAYFALAR = [
    "/admin",
    "/admin/reservations",
    "/admin/users",
    "/admin/agencies",
    "/admin/price-rules",
    "/admin/campaigns",
    "/admin/reports",
    "/admin/notifications",
    "/admin/audit-logs",
    "/admin/content",
    "/admin/settings",
  ];
  test("eski komisyon adresi Fiyatlar sayfasına yönlenir", async ({ page }) => {
    await page.goto("/admin/commissions");
    await expect(page).toHaveURL(/\/admin\/price-rules$/);
  });

  for (const yol of SAYFALAR) {
    test(`yönetim sayfası açılıyor: ${yol}`, async ({ page }) => {
      const hatalar = hataToplayici(page);
      const r = await page.goto(yol);
      expect(r?.status()).toBeLessThan(400);
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveURL(new RegExp(`${yol}$`));
      await expect(page.locator("body")).not.toContainText("Application error");
      expect(hatalar, hatalar.join("\n")).toEqual([]);
    });
  }
});
