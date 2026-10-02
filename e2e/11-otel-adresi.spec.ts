// Otel sayfalarının okunur adresleri (lookbeds.com/club-hotel-sera, lib/otel-adresi):
// arama sonuçları okunur adrese bağlanır, eski /hotel/<kod> adresi tarihleri
// koruyarak yönlenir, büyük harfli adres küçük harfliye döner, olmayan adres 404.

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
  await expect(otel).toHaveAttribute("href", /^\/[a-z0-9-]+\?/);
});

test("eski /hotel/<kod> adresi okunur adrese yönlenir, tarihler korunur", async ({ page }) => {
  test.skip(!adres, `${ORNEK} veritabanında adressiz`);
  const giris = gunSonra(60);
  await page.goto(`/hotel/${ORNEK}?checkIn=${giris}&checkOut=${gunSonra(62)}&adults=2`);
  await expect(page).toHaveURL(new RegExp(`/${adres}\\?checkIn=${giris}`));
  await expect(page).toHaveTitle(/LookBeds/);
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible({ timeout: 30_000 });
});

test("büyük harfli adres küçük harfliye döner; olmayan adres bulunamadı", async ({ page }) => {
  test.skip(!adres, `${ORNEK} veritabanında adressiz`);
  await page.goto(`/${adres.toUpperCase()}`);
  await expect(page).toHaveURL(new RegExp(`/${adres}$`));
  await page.goto("/boyle-bir-otel-yok-e2e");
  await expect(page.getByText(/bulunamadı|bulamadık/i).first()).toBeVisible();
});
