// Başvuru reddi, çıkış, yöneticinin hesap kapatması.

import { expect, test } from "@playwright/test";
import { EPOSTA, sorgu } from "./veri";
import { girisYap } from "./yardimci";

test.describe.configure({ mode: "serial" });

const ADAY = "e2e/.auth/aday.json";
const YONETICI = "e2e/.auth/yonetici.json";
const MUSTERI = "e2e/.auth/musteri.json";
const SIRKET = `E2E Red ${process.env.E2E_KOSU ?? ""}`.trim();
const VERGI_NO = String(2_000_000_000 + (Date.now() % 7_999_999_999)).slice(0, 10);
const SEBEP = "Vergi levhası eksik (test).";

test("ikinci aday başvurur", async ({ page }) => {
  await girisYap(page, { eposta: EPOSTA.aday, yol: "/agency/login" });
  await page.locator("#b-contactName").fill("Reddedilen Aday");
  await page.locator("#b-phone").fill("+90 533 222 33 44");
  await page.locator("#b-companyName").fill(SIRKET);
  await page.locator("#b-taxId").fill(VERGI_NO);
  await page.locator("#b-taxOffice").fill("Kadıköy");
  await page.locator("#b-address").fill("Moda Cad. No: 2, Kadıköy, İstanbul");
  await page.getByText(/Bilgilerin doğru olduğunu onaylıyorum/).click();
  await page.getByRole("button", { name: "Başvuruyu gönder" }).click();
  await expect(page.getByText("Başvurun bizde")).toBeVisible();
  await page.context().storageState({ path: ADAY });
});

test.describe("yönetici", () => {
  test.use({ storageState: YONETICI });
  test("başvuruyu sebep yazarak reddeder", async ({ page }) => {
    await page.goto("/admin/agencies");
    await page.getByRole("tab", { name: /Başvurular/ }).or(page.getByRole("button", { name: /Başvurular/ })).first().click();
    const satir = page.locator("tr, li, article, div").filter({ hasText: SIRKET }).filter({ has: page.getByRole("button", { name: "İncele ve karar ver" }) }).last();
    await satir.getByRole("button", { name: "İncele ve karar ver" }).click();
    const d = page.getByRole("dialog", { name: /Acente başvurusu/ });
    await d.getByRole("button", { name: "Reddet" }).click();
    await d.locator("#k-sebep").fill(SEBEP);
    await d.getByRole("button", { name: "Reddet" }).click();
    await expect(page.getByText(`${SIRKET} reddedildi`)).toBeVisible();
    const [b] = await sorgu<{ status: string; rejectionReason: string }>(
      `SELECT a.status, a."rejectionReason" FROM agency_applications a JOIN users u ON u.id = a."userId" WHERE u.email = $1`,
      [EPOSTA.aday]
    );
    expect(b.status).toBe("REJECTED");
    expect(b.rejectionReason).toBe(SEBEP);
  });
});

test.describe("reddedilen aday", () => {
  test.use({ storageState: ADAY });
  test("panelinde sonucu ve sebebi görür, bildirim alır", async ({ page }) => {
    await page.goto("/agency/dashboard");
    await expect(page.getByRole("heading", { name: "Başvurun onaylanmadı" })).toBeVisible();
    await expect(page.getByText(SEBEP)).toBeVisible();
    const b = await sorgu(`SELECT 1 FROM notifications n JOIN users u ON u.id = n."userId" WHERE u.email = $1 AND n.type = 'AGENCY_REJECTED'`, [EPOSTA.aday]);
    expect(b.length).toBe(1);
  });

  test("bilgileri düzeltip yeniden başvurur", async ({ page }) => {
    await page.goto("/agency/dashboard");
    await page.getByRole("button", { name: "Bilgileri düzeltip yeniden başvur" }).click();
    // Form önceki başvurunun bilgileriyle dolu açılır.
    await expect(page.locator("#b-companyName")).toHaveValue(SIRKET);
    await page.locator("#b-tursabNo").fill("12345");
    await page.getByText(/Bilgilerin doğru olduğunu onaylıyorum/).click();
    await page.getByRole("button", { name: "Başvuruyu gönder" }).click();
    await expect(page.getByText("Başvurun bizde")).toBeVisible();
    const b = await sorgu<{ status: string }>(
      `SELECT a.status FROM agency_applications a JOIN users u ON u.id = a."userId" WHERE u.email = $1 ORDER BY a."createdAt"`,
      [EPOSTA.aday]
    );
    expect(b.map((x) => x.status)).toEqual(["REJECTED", "PENDING"]);
  });
});

test.describe("müşteri çıkışı", () => {
  test.use({ storageState: MUSTERI });
  test("hesap sayfasından çıkış yapar", async ({ page }) => {
    await page.goto("/profile");
    await page.getByRole("button", { name: "Çıkış yap" }).last().click();
    await page.waitForURL((u) => u.pathname === "/", { timeout: 20_000 });
    await page.goto("/profile");
    await expect(page.getByRole("heading", { name: "Hesabını görmek için giriş yap" })).toBeVisible();
  });
});

test.describe("hesap kapatma", () => {
  test.describe("yönetici", () => {
    test.use({ storageState: YONETICI });
    test("müşterinin hesabını kapatır", async ({ page }) => {
      await page.goto("/admin/users");
      await page.getByLabel("Kullanıcılarda ara").fill("e2e-musteri");
      const satir = page.getByRole("row").filter({ hasText: EPOSTA.musteri }).first();
      await satir.getByRole("button", { name: "Yönet" }).click();
      await page.getByRole("dialog").getByRole("button", { name: "Hesabı kapat" }).click();
      // Oturumu hemen düşürdüğü için bir kez daha sorulur.
      await page.getByRole("dialog").getByRole("button", { name: "Evet, kapat" }).click();
      await expect.poll(async () => (await sorgu<{ isActive: boolean }>(`SELECT "isActive" FROM users WHERE email = $1`, [EPOSTA.musteri]))[0]?.isActive).toBe(false);
    });
  });
  test.describe("müşteri", () => {
    test.use({ storageState: MUSTERI });
    test("kapatılan hesabın açık oturumu düşer (≤15 sn önbellek)", async ({ request }) => {
      await expect.poll(async () => (await request.get("/api/profile")).status(), { timeout: 30_000, intervals: [1000] }).toBe(401);
    });
  });
});
