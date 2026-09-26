// Telefon boyutu: ana sayfa, mobil arama penceresi, otel sayfası hatasız.

import { expect, test } from "@playwright/test";
import { gunSonra } from "./yardimci";

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });

function hataToplayici(page: import("@playwright/test").Page) {
  const hatalar: string[] = [];
  page.on("pageerror", (e) => hatalar.push(e.message));
  return hatalar;
}

test("ana sayfa ve mobil arama penceresi", async ({ page }) => {
  const hatalar = hataToplayici(page);
  await page.goto("/");
  await page.getByRole("button", { name: /Nereye gidiyorsun/ }).first().tap();
  await expect(page.getByRole("dialog").getByRole("heading", { name: /Nereye/ }).first()).toBeVisible();
  await expect(page.getByRole("dialog").getByText("Antalya").first()).toBeVisible();
  expect(hatalar).toEqual([]);
});

test("otel sayfası odalarla açılır, oda penceresi çalışır", async ({ page }) => {
  const hatalar = hataToplayici(page);
  await page.goto(`/hotel/HTL004?checkIn=${gunSonra(60)}&checkOut=${gunSonra(62)}&adults=2`);
  const kart = page.getByRole("button").filter({ hasText: "Standart Oda" }).filter({ hasText: /toplam/ }).first();
  await expect(kart).toBeVisible({ timeout: 30_000 });
  await kart.tap();
  await expect(page.getByRole("button", { name: "Bu odayı seç" }).filter({ visible: true })).toBeVisible();
  expect(hatalar).toEqual([]);
});

test("sayfa yatay kaymıyor (ana sayfa, arama, otel)", async ({ page }) => {
  for (const yol of ["/", `/search?destination=Antalya&checkIn=${gunSonra(60)}&checkOut=${gunSonra(62)}&adults=2`, `/hotel/HTL004?checkIn=${gunSonra(60)}&checkOut=${gunSonra(62)}&adults=2`]) {
    await page.goto(yol);
    await page.waitForLoadState("networkidle");
    const tasma = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(tasma, `${yol} yatay taşma`).toBeLessThanOrEqual(1);
  }
});
