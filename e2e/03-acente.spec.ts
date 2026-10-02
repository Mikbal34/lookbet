// Acente yolculuğu: acente girişinden hesap → başvuru formu → yönetici onayı
// → panel (Bugün, Rezervasyonlar, Kazançlar, Şirket) → acente rezervasyonu.

import { expect, test } from "@playwright/test";
import { EPOSTA, rezervasyonlar, sorgu } from "./veri";
import { girisYap, gunSonra, odaSec, odemeyiTamamla } from "./yardimci";

test.describe.configure({ mode: "serial" });

const ACENTE = "e2e/.auth/acente.json";
const YONETICI = "e2e/.auth/yonetici.json";
const SIRKET = `E2E Turizm ${process.env.E2E_KOSU ?? ""}`.trim();
// Vergi no tekil olmalı (acente ya da bekleyen başvuru): her koşuda farklı.
const VERGI_NO = String(1_000_000_000 + (Date.now() % 8_999_999_999)).slice(0, 10);

test("aday acente girişinden hesap açar, başvuru formunu görür", async ({ page }) => {
  await girisYap(page, { eposta: EPOSTA.acente, yol: "/agency/login" });
  await expect(page).toHaveURL(/\/agency\/dashboard/);
  await expect(page.getByRole("heading", { name: "LookBeds Partner başvurusu" })).toBeVisible();
  const u = await sorgu<{ role: string }>(`SELECT role FROM users WHERE email = $1`, [EPOSTA.acente]);
  expect(u[0]?.role).toBe("AGENCY");
  await page.context().storageState({ path: ACENTE });
});

test.describe("acente oturumu", () => {
  test.use({ storageState: ACENTE });

  test("başvuru formunu doldurur ve gönderir", async ({ page }) => {
    await page.goto("/agency/dashboard");
    await page.locator("#b-contactName").fill("Deniz Acenteci");
    await page.locator("#b-phone").fill("+90 532 111 22 33");
    await page.locator("#b-companyName").fill(SIRKET);
    await page.locator("#b-taxId").fill(VERGI_NO);
    await page.locator("#b-taxOffice").fill("Muratpaşa");
    await page.locator("#b-address").fill("Lara Cad. No: 1, Muratpaşa, Antalya");
    await page.getByText(/Bilgilerin doğru olduğunu onaylıyorum/).click();
    await page.getByRole("button", { name: "Başvuruyu gönder" }).click();
    await expect(page.getByText("Başvurun bizde")).toBeVisible();
    const b = await sorgu<{ status: string }>(
      `SELECT a.status FROM agency_applications a JOIN users u ON u.id = a."userId" WHERE u.email = $1`,
      [EPOSTA.acente]
    );
    expect(b[0]?.status).toBe("PENDING");
  });
});

test.describe("yönetici oturumu", () => {
  test.use({ storageState: YONETICI });

  test("yönetici başvuruyu görür ve onaylar", async ({ page }) => {
    await page.goto("/admin/agencies");
    await page.getByRole("tab", { name: /Başvurular/ }).or(page.getByRole("button", { name: /Başvurular/ })).first().click();
    const satir = page.locator("tr, li, article, div").filter({ hasText: SIRKET }).filter({ has: page.getByRole("button", { name: "İncele ve karar ver" }) }).last();
    await satir.getByRole("button", { name: "İncele ve karar ver" }).click();
    const pencere = page.getByRole("dialog", { name: /Acente başvurusu/ });
    await expect(pencere).toBeVisible();
    await expect(pencere.locator("#k-kom")).toHaveValue("8");
    await pencere.getByRole("button", { name: "Onayla ve paneli aç" }).click();
    await expect(page.getByText(`${SIRKET} onaylandı; paneli açıldı`)).toBeVisible();
    const a = await sorgu<{ isApproved: boolean; commission: number }>(
      `SELECT g."isApproved", g.commission FROM agencies g JOIN users u ON u.id = g."userId" WHERE u.email = $1`,
      [EPOSTA.acente]
    );
    expect(a[0]?.isApproved).toBe(true);
    expect(Number(a[0]?.commission)).toBe(8);
  });
});

test.describe("onaylı acente", () => {
  test.use({ storageState: ACENTE });

  test("panel açılır: Bugün, Rezervasyonlar, Kazançlar, Şirket", async ({ page }) => {
    // Onay oturum önbelleğini temizler: panel API'leri hemen açık olmalı.
    await expect
      .poll(async () => (await page.request.get("/api/agency/dashboard")).status(), { timeout: 5_000, intervals: [500] })
      .toBe(200);
    await page.goto("/agency/dashboard");
    for (const sekme of ["Bugün", "Rezervasyonlar", "Kazançlar"]) await expect(page.getByRole("link", { name: sekme }).first()).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: new RegExp(`, ${SIRKET}$`) })).toBeVisible();
    await expect(page.getByRole("button", { name: /Bildirimler, 1 okunmamış/ })).toBeVisible();
    await page.goto("/agency/company");
    await expect(page.getByText("Onaylı acente")).toBeVisible();
    await page.goto("/agency/kazanclar");
    await expect(page.getByText(/komisyonun/i).first()).toBeVisible();
    await page.goto("/agency/reservations");
    await expect(page.locator("body")).not.toContainText("şu an alınamadı");
  });
});

test.describe("acente rezervasyonu", () => {
  test.use({ storageState: ACENTE });
  // Kazançlar giriş ayına göre ve yalnız bu aya kadar sayılıyor: yarın giriş.
  const GIRIS = gunSonra(1);
  const CIKIS = gunSonra(3);

  test("acente oda seçip rezervasyon yapar, komisyon yazılır", async ({ page }) => {
    await odaSec(page, { otel: "HTL002", giris: GIRIS, cikis: CIKIS });
    // İletişim acentenin başvurudaki adıyla dolu; acente konaklamadığı için misafirler boş.
    await expect(page.locator("#c-ad")).toHaveValue("Deniz");
    await expect(page.locator("#c-soyad")).toHaveValue("Acenteci");
    await expect(page.getByRole("checkbox", { name: "Rezervasyonu yapan kişi de konaklıyor" })).not.toBeChecked();
    // Acente kendi müşterisinin bilgilerini yazar (oturumdaki ad e-postadan gelir, soyadı boş).
    const no = await odemeyiTamamla(page, {
      iletisim: { ad: "Can", soyad: "Misafir" },
      misafirler: [
        { ad: "Can", soyad: "Misafir", cins: "Erkek", dogum: "10.01.1985" },
        { ad: "Elif", soyad: "Misafir", cins: "Kadın", dogum: "22.03.1987" },
      ],
    });
    expect(no).toMatch(/^LB/);
    // Onay sayfasındaki "Rezervasyonlarım" acenteyi kendi paneline götürür.
    await expect(page.getByRole("link", { name: "Rezervasyonlarım" })).toHaveAttribute("href", "/agency/reservations");
    const [r] = await rezervasyonlar(EPOSTA.acente);
    expect(r?.status).toBe("CONFIRMED");
    expect(r?.agencyId).not.toBeNull();
    expect(Number(r?.commissionAmount)).toBeGreaterThan(0);
  });

  test("rezervasyon acente panelinde, komisyonuyla görünür", async ({ page }) => {
    await page.goto("/agency/reservations");
    const satir = page.getByRole("row").filter({ hasText: "Antalya City Hotel" }).first();
    await expect(satir).toBeVisible();
    await satir.click();
    const pencere = page.getByRole("dialog", { name: "Rezervasyon" });
    await expect(pencere.getByText("Komisyonun")).toBeVisible();
  });

  test("kazançlar sayfası bu ayın komisyonunu gösterir", async ({ page }) => {
    const buAy = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(new Date()).slice(0, 7);
    test.skip(GIRIS.slice(0, 7) !== buAy, "giriş gelecek ayda: kazanç bu ay görünmez");
    const [r] = await rezervasyonlar(EPOSTA.acente);
    const k = await (await page.request.get("/api/agency/kazanc")).json();
    const ay = (k.aylar as { ay: string; komisyon: number; adet: number }[]).find((a) => a.ay === buAy);
    expect(ay?.adet).toBe(1);
    expect(ay?.komisyon).toBeCloseTo(Number(r.commissionAmount), 2);
    await page.goto("/agency/kazanclar");
    await expect(page.getByText(/komisyonun/i).first()).toBeVisible();
  });
});

