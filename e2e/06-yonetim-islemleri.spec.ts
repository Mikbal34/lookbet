// Yönetim panelinin işlem tarafı (01 ve 03'ün rezervasyonlarıyla):
// rezervasyon listesi, süzgeç, ayrıntı, yönetici iptali, CSV; kullanıcılar;
// bildirimler; denetim kaydı; özet.

import { expect, test } from "@playwright/test";
import { EPOSTA, rezervasyonlar, sorgu } from "./veri";

test.describe.configure({ mode: "serial" });
test.use({ storageState: "e2e/.auth/yonetici.json" });

test("özet sayfası son rezervasyonları gösterir", async ({ page }) => {
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Seni bekleyenler" })).toBeVisible();
  await expect(page.getByText("Antalya City Hotel").first()).toBeVisible();
});

test("rezervasyonlar: acente süzgeci, ayrıntı ve yönetici iptali", async ({ page }) => {
  const [acenteRez] = await rezervasyonlar(EPOSTA.acente);
  expect(acenteRez?.status).toBe("CONFIRMED");
  await page.goto("/admin/reservations");
  await page.getByRole("radiogroup", { name: "Kaynak" }).getByRole("radio", { name: "Acente" }).check();
  const satir = page.getByRole("row", { name: /Antalya City Hotel/ }).or(page.getByRole("button", { name: /Antalya City Hotel/ })).first();
  await expect(satir).toBeVisible();
  await expect(page.getByText("Lara Beach Resort & Spa")).toHaveCount(0); // müşteri rezervasyonu süzüldü
  await satir.click();
  await page.getByRole("button", { name: "İptal et" }).click();
  const onay = page.getByRole("dialog", { name: "Rezervasyonu iptal et" });
  await onay.getByRole("button", { name: "Rezervasyonu iptal et" }).click();
  await expect.poll(async () => (await rezervasyonlar(EPOSTA.acente))[0]?.status, { timeout: 30_000 }).toBe("CANCELLED");
});

test("CSV dışa aktarım rezervasyonları içerir", async ({ page }) => {
  const [r] = await rezervasyonlar(EPOSTA.acente);
  const y = await page.request.get("/api/admin/reservations/export");
  expect(y.ok(), `${y.status()}`).toBeTruthy();
  expect(y.headers()["content-type"]).toContain("csv");
  expect(await y.text()).toContain(r.bookingNumber!);
});

test("kullanıcılar: arama ve rol penceresi", async ({ page }) => {
  await page.goto("/admin/users");
  await page.getByRole("searchbox", { name: "Kullanıcılarda ara" }).or(page.getByLabel("Kullanıcılarda ara")).first().fill("e2e-musteri");
  const satir = page.getByRole("row").filter({ hasText: EPOSTA.musteri }).first();
  await expect(satir).toBeVisible();
  await satir.getByRole("button", { name: "Yönet" }).click();
  const d = page.getByRole("dialog");
  await expect(d.getByLabel("Rol")).toHaveValue("CUSTOMER");
  await d.getByRole("button", { name: "Kapat" }).first().click();
});

test("bildirimler: başvuru bildirimi var, tümü okundu yapılır", async ({ page }) => {
  await page.goto("/admin/notifications");
  await expect(page.getByText("Yeni Acente Başvurusu").first()).toBeVisible();
  await page.getByRole("button", { name: "Tümünü okundu yap" }).click();
  const [u] = await sorgu<{ id: string }>(`SELECT id FROM users WHERE email = $1`, [EPOSTA.yonetici]);
  await expect.poll(async () => (await sorgu(`SELECT 1 FROM notifications WHERE "userId" = $1 AND "isRead" = false`, [u.id])).length).toBe(0);
});

test("denetim kaydı yöneticinin işlemlerini tutar", async ({ page }) => {
  const [u] = await sorgu<{ id: string }>(`SELECT id FROM users WHERE email = $1`, [EPOSTA.yonetici]);
  const eylemler = (await sorgu<{ action: string }>(`SELECT DISTINCT action FROM audit_logs WHERE "userId" = $1`, [u.id])).map((x) => x.action);
  expect(eylemler).toEqual(expect.arrayContaining(["APPROVE_AGENCY_APPLICATION"]));
  await page.goto("/admin/audit-logs");
  await expect(page.getByText(/E2E Yönetici/).first()).toBeVisible();
});

test.describe("API doğrulamaları", () => {
  test("bozuk gövde 500 değil 400 döner", async ({ page }) => {
    for (const [yol, metot] of [["/api/admin/price-rules", "POST"], ["/api/admin/commissions", "POST"], ["/api/admin/notifications", "POST"]] as const) {
      const r = await page.request.fetch(yol, { method: metot, headers: { "Content-Type": "application/json" }, data: "{bozuk" });
      expect(r.status(), `${metot} ${yol}`).toBe(400);
    }
  });

  test("fiyat kuralı: tek acente acentesiz, bitiş başlangıçtan önce olamaz", async ({ page }) => {
    const temel = { name: "E2E geçersiz", type: "MARKUP", value: 10 };
    const r1 = await page.request.post("/api/admin/price-rules", { data: { ...temel, appliesTo: "SPECIFIC_AGENCY" } });
    expect(r1.status()).toBe(400);
    expect((await r1.json()).error).toBe("Acente seçin");
    const r2 = await page.request.post("/api/admin/price-rules", { data: { ...temel, appliesTo: "ALL_CUSTOMERS", startDate: "2026-12-10", endDate: "2026-12-01" } });
    expect(r2.status()).toBe(400);
    expect((await r2.json()).error).toBe("Bitiş başlangıçtan önce olamaz");
    const r3 = await page.request.post("/api/admin/price-rules", { data: { ...temel, appliesTo: "SPECIFIC_AGENCY", agencyId: "olmayan-acente" } });
    expect(r3.status()).toBe(400);
  });

  test("acente komisyonu %90'ı aşamaz", async ({ page }) => {
    const [a] = await sorgu<{ id: string }>(`SELECT g.id FROM agencies g JOIN users u ON u.id = g."userId" WHERE u.email = $1`, [EPOSTA.acente]);
    const r = await page.request.patch(`/api/admin/agencies/${a.id}`, { data: { commission: 95 } });
    expect([400, 422]).toContain(r.status());
    expect(JSON.stringify(await r.json())).toContain("0 ile 90");
  });

  test("örnek veri modunda içerik işi başlamaz", async ({ page }) => {
    const r = await page.request.post("/api/content/sync", { data: { adim: "oteller" } });
    expect(r.status()).toBe(409);
    expect((await r.json()).error).toContain("Örnek veri modunda");
  });

  test("arayüzü olmayan eski uçlar kaldırıldı", async ({ page }) => {
    expect((await page.request.post("/api/admin/users", { data: {} })).status()).toBe(405);
    expect((await page.request.post("/api/admin/agencies", { data: {} })).status()).toBe(405);
    expect((await page.request.post("/api/admin/agencies/x/approve", { data: {} })).status()).toBe(404);
  });
});

