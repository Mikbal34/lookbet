// Yetki: oturumsuz ziyaretçi ve müşteri, yönetim ve acente alanına giremez.
// (01 ve 02 oturumları kaydetmiş olmalı: tüm takım birlikte koşulur.)

import { expect, test } from "@playwright/test";

const YONETIM_API = ["/api/admin/users", "/api/admin/reservations", "/api/admin/dashboard", "/api/admin/coupons", "/api/admin/price-rules", "/api/admin/agency-applications"];
const ACENTE_API = ["/api/agency/dashboard", "/api/agency/kazanc"];

test.describe("oturumsuz", () => {
  for (const yol of [...YONETIM_API, ...ACENTE_API, "/api/reservations", "/api/profile", "/api/favoriler"]) {
    test(`API reddeder: ${yol}`, async ({ request }) => {
      const r = await request.get(yol);
      expect([401, 403], `${yol} → ${r.status()}`).toContain(r.status());
    });
  }
  for (const yol of ["/admin", "/admin/users", "/agency/dashboard", "/reservations"]) {
    test(`sayfa içeriği göstermez: ${yol}`, async ({ page }) => {
      await page.goto(yol);
      await page.waitForLoadState("networkidle");
      expect(new URL(page.url()).pathname, `${yol} açık kaldı`).not.toBe(yol);
    });
  }
  test("hesap sayfası giriş ister, veri göstermez", async ({ page }) => {
    await page.goto("/profile");
    await expect(page.getByRole("heading", { name: "Hesabını görmek için giriş yap" })).toBeVisible();
  });
});

test.describe("müşteri", () => {
  test.use({ storageState: "e2e/.auth/musteri.json" });
  for (const yol of [...YONETIM_API, ...ACENTE_API]) {
    test(`API reddeder: ${yol}`, async ({ request }) => {
      const r = await request.get(yol);
      expect([401, 403], `${yol} → ${r.status()}`).toContain(r.status());
    });
  }
  for (const yol of ["/admin", "/admin/reservations", "/agency/dashboard", "/agency/kazanclar"]) {
    test(`sayfa içeriği göstermez: ${yol}`, async ({ page }) => {
      await page.goto(yol);
      await page.waitForLoadState("networkidle");
      expect(new URL(page.url()).pathname, `${yol} açık kaldı`).not.toBe(yol);
    });
  }
});
