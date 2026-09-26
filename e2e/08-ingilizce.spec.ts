// İngilizce: dil çerezi (NEXT_LOCALE=en) ile arayüz ve sunucu mesajları.

import { expect, test } from "@playwright/test";
import { gunSonra } from "./yardimci";

test.use({
  storageState: { cookies: [{ name: "NEXT_LOCALE", value: "en", domain: "localhost", path: "/", expires: -1, httpOnly: false, secure: false, sameSite: "Lax" }], origins: [] },
});

test("ana sayfa ve başlık İngilizce", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("LookBeds — Hotel Booking");
  await expect(page.getByText("Where", { exact: true }).first()).toBeVisible();
});

test("arama sonuç başlığı İngilizce", async ({ page }) => {
  await page.goto(`/search?destination=Antalya&checkIn=${gunSonra(50)}&checkOut=${gunSonra(52)}&adults=2`);
  await expect(page.getByRole("heading", { name: /hotels? in Antalya/i })).toBeVisible({ timeout: 30_000 });
});

test("giriş penceresi İngilizce", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Log in or sign up" }).first()).toBeVisible();
});

test("sunucu doğrulama mesajı İngilizce", async ({ request }) => {
  const r = await request.post("/api/hotels/search", { data: { destination: "", checkIn: "2020-01-01", checkOut: "2020-01-02", rooms: [{ adult: 2 }] } });
  expect(r.status()).toBe(400);
  const d = await r.json();
  expect(d.error).toBe("Invalid request");
  expect(JSON.stringify(d.details)).toContain("Choose a destination");
});

test("bulunamadı sayfası İngilizce", async ({ page }) => {
  const r = await page.goto("/boyle-bir-sayfa-yok");
  expect(r?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "We couldn't find this page" })).toBeVisible();
});
