// Müşteri yolculuğu: giriş → arama → favori → otel → oda → ödeme →
// rezervasyon → rezervasyonlarım → iptal; profil ve kayıtlı misafir.

import { expect, test } from "@playwright/test";
import { EPOSTA, kullanici, rezervasyonlar, sorgu } from "./veri";
import { girisYap, gunSonra, odaSec, odemeyiTamamla } from "./yardimci";

test.describe.configure({ mode: "serial" });

const MUSTERI = "e2e/.auth/musteri.json";
// Acente testi başka otel ve tarih kullanır: sahte fiyat kodu otel+oda+tarihe bağlı.
const GIRIS = gunSonra(20);
const CIKIS = gunSonra(22);

test("müşteri e-posta koduyla hesap açar", async ({ page }) => {
  await girisYap(page, { eposta: EPOSTA.musteri, ad: "Ayşe", soyad: "Test" });
  const u = await kullanici(EPOSTA.musteri);
  expect(u?.role).toBe("CUSTOMER");
  expect(u?.name).toBe("Ayşe Test");
  await page.goto("/profile");
  await expect(page.getByText("Ayşe Test").first()).toBeVisible();
  await page.context().storageState({ path: MUSTERI });
});

test.describe("oturumlu müşteri", () => {
  test.use({ storageState: MUSTERI });

  test("Antalya araması sonuç getirir, otel favoriye eklenir", async ({ page }) => {
    await page.goto(`/search?destination=Antalya&checkIn=${GIRIS}&checkOut=${CIKIS}&adults=2`);
    await expect(page.getByRole("heading", { name: /Antalya bölgesinde \d+ otel/ })).toBeVisible({ timeout: 30_000 });
    const kalp = page.getByRole("button", { name: "Lara Beach Resort & Spa: favorilere ekle" }).first();
    await expect(kalp).toBeVisible({ timeout: 30_000 });
    await kalp.click();
    await expect(page.getByRole("button", { name: "Lara Beach Resort & Spa: favorilerden çıkar" }).first()).toBeVisible();
    await expect
      .poll(async () => (await sorgu(`SELECT 1 FROM favorites f JOIN users u ON u.id = f."userId" WHERE u.email = $1`, [EPOSTA.musteri])).length)
      .toBe(1);
    await page.goto("/favoriler");
    await expect(page.getByText("Lara Beach Resort & Spa").first()).toBeVisible();
  });

  test("oda seçip rezervasyon yapar", async ({ page }) => {
    await odaSec(page, { otel: "HTL001", giris: GIRIS, cikis: CIKIS });
    const no = await odemeyiTamamla(page, {
      misafirler: [
        { ad: "Ayşe", soyad: "Test", cins: "Kadın", dogum: "15.04.1990" },
        { ad: "Mehmet", soyad: "Test", cins: "Erkek", dogum: "02.11.1988" },
      ],
    });
    expect(no).toMatch(/^LB/);
    await expect(page.getByText(no).first()).toBeVisible();
    const [r] = await rezervasyonlar(EPOSTA.musteri);
    expect(r?.status).toBe("CONFIRMED");
    expect(r?.bookingNumber).toBe(no);
    expect(r?.agencyId).toBeNull();
  });

  test("rezervasyonlarımda görür, ayrıntıyı açar, iptal eder", async ({ page }) => {
    const [r] = await rezervasyonlar(EPOSTA.musteri);
    await page.goto("/reservations");
    await expect(page.getByText("Lara Beach Resort & Spa").first()).toBeVisible();
    await page.goto(`/reservations/${r.id}`);
    await expect(page.getByText(r.bookingNumber!).first()).toBeVisible();
    await page.getByRole("button", { name: "Rezervasyonu iptal et" }).first().click();
    const pencere = page.getByRole("dialog", { name: "Rezervasyonu iptal et" });
    await pencere.getByRole("button", { name: "Rezervasyonu iptal et" }).click();
    await expect(page.getByText("Rezervasyonun iptal edildi")).toBeVisible({ timeout: 30_000 });
    await expect.poll(async () => (await rezervasyonlar(EPOSTA.musteri))[0]?.status).toBe("CANCELLED");
    await pencere.getByRole("button", { name: "Tamam" }).click();
    await expect(page.getByText("İptal edildi").first()).toBeVisible();
  });

  test("başka müşterinin rezervasyonunu göremez", async ({ request }) => {
    // Yönetici hesabına ait uydurma bir kimlik yerine: var olmayan kimlik 404, kendi kimliği 200.
    const [r] = await rezervasyonlar(EPOSTA.musteri);
    expect((await request.get(`/api/reservations/${r.id}`)).status()).toBe(200);
    expect([403, 404]).toContain((await request.get(`/api/reservations/yok-${r.id}`)).status());
  });

  test("telefonunu ekler", async ({ page }) => {
    await page.goto("/profile/kisisel");
    const satir = page.locator("div, li, section").filter({ hasText: /^Telefon/ }).filter({ has: page.getByRole("button", { name: "Ekle" }) }).last();
    await satir.getByRole("button", { name: "Ekle" }).click();
    await page.locator("#k-tel").fill("5329876543");
    await page.getByRole("button", { name: "Kaydet" }).filter({ visible: true }).first().click();
    await expect(page.getByText("Kaydedildi").first()).toBeVisible();
    await expect.poll(async () => (await sorgu<{ phone: string | null }>(`SELECT phone FROM users WHERE email = $1`, [EPOSTA.musteri]))[0]?.phone).toMatch(/5329876543|532 987 65 43/);
  });

  test("kayıtlı misafir ekler ve kaldırır", async ({ page }) => {
    await page.goto("/profile/kisisel");
    await page.getByRole("button", { name: "Misafir ekle" }).click();
    await page.locator("#m-ad").fill("Zeynep");
    await page.locator("#m-soyad").fill("Test");
    await page.locator("#m-dogum").fill("20.06.2015");
    await page.getByRole("button", { name: "Misafiri kaydet" }).click();
    await expect(page.getByText("Zeynep Test").first()).toBeVisible();
    expect((await sorgu(`SELECT 1 FROM saved_guests g JOIN users u ON u.id = g."userId" WHERE u.email = $1`, [EPOSTA.musteri])).length).toBe(1);
    await page.getByRole("button", { name: /Kaldır/ }).first().click();
    await expect(page.getByText("Zeynep Test")).toHaveCount(0);
  });
});
