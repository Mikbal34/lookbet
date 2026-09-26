// Herkese açık sayfalar açılıyor mu, sunucu hatası ya da tarayıcı hatası var mı.

import { expect, test } from "@playwright/test";

const SAYFALAR = ["/", "/search?destination=Antalya", "/kampanyalar", "/yardim", "/login", "/agency/login", "/register/agency"];

for (const yol of SAYFALAR) {
  test(`açılıyor: ${yol}`, async ({ page }) => {
    const hatalar: string[] = [];
    page.on("pageerror", (e) => hatalar.push(e.message));
    page.on("response", (r) => {
      if (r.status() >= 500) hatalar.push(`${r.status()} ${r.url()}`);
    });
    const yanit = await page.goto(yol);
    expect(yanit?.status(), yol).toBeLessThan(400);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).not.toContainText("Application error");
    expect(hatalar, hatalar.join("\n")).toEqual([]);
  });
}

test("sağlık ucu", async ({ request }) => {
  const r = await request.get("/api/saglik");
  expect(r.ok()).toBeTruthy();
  expect(await r.json()).toEqual({ ok: true });
});
