// Otel sayfalarının okunur adresleri (lookbeds.com/antalya/club-hotel-sera, lib/otel-adresi):
// arama sonuçları okunur adrese bağlanır; eski /hotel/<kod>, ilk sürümün tek
// parçalı adresi (/club-hotel-sera) ve ili yanlış adres tarihleri koruyarak
// yönlenir; büyük harfli adres küçük harfliye döner; olmayan adres 404.

import { expect, test } from "@playwright/test";
import { sorgu } from "./veri";
import { gunSonra } from "./yardimci";

const ORNEK = "HTL004";
let adres = "";

test.beforeAll(async () => {
  const [satir] = await sorgu<{ slug: string | null }>(`SELECT slug FROM hotels WHERE "hotelCode" = $1`, [ORNEK]);
  adres = satir?.slug ?? "";
});

test("arama sonucundaki otel bağlantısı okunur adres", async ({ page }) => {
  await page.goto(`/search?destination=Antalya&checkIn=${gunSonra(60)}&checkOut=${gunSonra(62)}&adults=2`);
  const otel = page.locator('a[href*="checkIn="]').first();
  await expect(otel).toBeVisible({ timeout: 30_000 });
  await expect(otel).toHaveAttribute("href", /^\/[a-z0-9-]+\/[a-z0-9-]+\?/);
});

test("eski /hotel/<kod> adresi okunur adrese yönlenir, tarihler korunur", async ({ page }) => {
  test.skip(!adres, `${ORNEK} veritabanında adressiz`);
  const giris = gunSonra(60);
  await page.goto(`/hotel/${ORNEK}?checkIn=${giris}&checkOut=${gunSonra(62)}&adults=2`);
  await expect(page).toHaveURL(new RegExp(`/${adres}\\?checkIn=${giris}`));
  await expect(page).toHaveTitle(/LookBeds/);
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible({ timeout: 30_000 });
});

test("büyük harfli, tek parçalı ve ili yanlış adres doğrusuna döner; olmayan adres 404", async ({ page }) => {
  test.skip(!adres, `${ORNEK} veritabanında adressiz`);
  const [, ad] = adres.split("/");
  await page.goto(`/${adres.toUpperCase()}`);
  await expect(page).toHaveURL(new RegExp(`/${adres}$`));
  await page.goto(`/${ad}?adults=2`);
  await expect(page).toHaveURL(new RegExp(`/${adres}\\?adults=2$`));
  await page.goto(`/yanlis-il/${ad}`);
  await expect(page).toHaveURL(new RegExp(`/${adres}$`));
  const r = await page.goto("/antalya/boyle-bir-otel-yok-e2e");
  expect(r?.status()).toBe(404);
  await expect(page.getByText(/bulunamadı/i).first()).toBeVisible();
});
