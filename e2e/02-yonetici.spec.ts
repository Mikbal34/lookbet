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

test("yönetici gizli yönetim girişinden girer, panele düşer", async ({ page }) => {
  await girisYap(page, { eposta: EPOSTA.yonetici, yol: "/admin/giris" });
  await expect(page).toHaveURL(/\/admin$/);
  await page.context().storageState({ path: YONETICI });
});

test("yönetim paneli girişsiz 'bulunamadı' döner, siteden bağlantı yok", async ({ page, request }) => {
  const r = await page.goto("/admin/price-rules");
  expect(r?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Bu sayfa bulunamadı" })).toBeVisible();
  expect((await request.get("/api/admin/users")).status()).toBe(404);
  const anaSayfa = await (await request.get("/")).text();
  expect(anaSayfa).not.toContain("/admin/giris");
});

test("acente girişi yönetici hesabını kabul etmez", async ({ page }) => {
  await page.goto("/agency/login");
  const eposta = page.getByLabel("E-posta", { exact: true }).first();
  await eposta.fill(EPOSTA.yonetici);
  await eposta.press("Enter");
  const kodYazisi = page.getByText(/Geliştirme modu, kod: \d{6}/).first();
  const bekle = page.getByText(/Yeni kod için (\d+) saniye bekle/).first();
  await expect(kodYazisi.or(bekle)).toBeVisible();
  if (await bekle.isVisible()) {
    await page.waitForTimeout((Number((await bekle.textContent())?.match(/(\d+)/)?.[1] ?? 30) + 1) * 1000);
    await eposta.press("Enter");
    await expect(kodYazisi).toBeVisible();
  }
  const kod = (await kodYazisi.textContent())!.match(/(\d{6})/)![1];
  await page.getByLabel("1. hane").first().click();
  await page.keyboard.type(kod, { delay: 30 });
  await expect(page.getByText("Bu hesapla buradan giriş yapılamaz")).toBeVisible();
  await expect(page).toHaveURL(/\/agency\/login/);
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
