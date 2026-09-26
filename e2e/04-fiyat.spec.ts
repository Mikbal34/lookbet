// Yönetici fiyatı değiştiren her şeyi açar, müşteri etkisini görür:
// kâr payı kuralı → kupon (ödemede, kullanım sayılır, iptalde geri) →
// erken rezervasyon kampanyası (fiyatta ve vitrinde) → hepsini siler.

import { expect, test, type APIRequestContext } from "@playwright/test";
import { EPOSTA, ONEK, rezervasyonlar, sorgu } from "./veri";
import { gunSonra, kuponUygula, odaSec, odemeTutari, odemeyiTamamla } from "./yardimci";

test.describe.configure({ mode: "serial" });

const YONETICI = "e2e/.auth/yonetici.json";
const MUSTERI = "e2e/.auth/musteri.json";
const OTEL = "HTL003"; // Bodrum Bay Resort; diğer testler başka otel ve tarih kullanır
const GIRIS = gunSonra(40);
const CIKIS = gunSonra(42);
const KOSU = (process.env.E2E_KOSU ?? "yerel").toUpperCase().replace(/[^A-Z0-9]/g, "");
const KURAL = `${ONEK} Kâr payı ${KOSU}`;
const KUPON = `${ONEK}${KOSU}`.slice(0, 20);
const KAMPANYA = `${ONEK} Erken rezervasyon ${KOSU}`;

let taban = 0;

async function odaFiyati(request: APIRequestContext) {
  const r = await request.post("/api/rooms/search", {
    data: { hotelCode: OTEL, checkIn: GIRIS, checkOut: CIKIS, nationality: "TR", currency: "EUR", rooms: [{ adult: 2 }] },
  });
  expect(r.ok(), await r.text()).toBeTruthy();
  type Oda = { roomName: string; totalPrice: number; pricing?: { finalPrice?: number; oncekiFiyat?: number; kampanya?: unknown } };
  const oda = ((await r.json()).rooms as Oda[]).find((o) => o.roomName === "Standart Oda")!;
  // Arayüzle aynı alanlar (oda-penceresi.tsx: odaToplami, odaOncekiFiyati).
  const toplam = oda.pricing?.finalPrice ?? oda.totalPrice;
  return { toplam, onceki: oda.pricing?.kampanya ? (oda.pricing.oncekiFiyat ?? toplam) : toplam };
}

const yakin = (a: number, b: number, pay = 1) => expect(Math.abs(a - b), `${a} ≈ ${b}`).toBeLessThanOrEqual(pay);

test.describe("başlangıç", () => {
  test.use({ storageState: MUSTERI });
  test("müşterinin gördüğü taban fiyat", async ({ request }) => {
    taban = (await odaFiyati(request)).toplam;
    expect(taban).toBeGreaterThan(0);
  });
});

test.describe("kâr payı kuralı", () => {
  test.describe("yönetici", () => {
    test.use({ storageState: YONETICI });
    test("tüm müşterilere %20 kâr payı kuralı açar", async ({ page }) => {
      await page.goto("/admin/price-rules");
      await page.getByRole("button", { name: "Yeni kural" }).click();
      const d = page.getByRole("dialog", { name: "Yeni fiyat kuralı" });
      await d.locator("#f-ad").fill(KURAL);
      await d.locator("#f-tur").selectOption("MARKUP");
      await d.locator("#f-deger").fill("20");
      await d.locator("#f-hedef").selectOption("ALL_CUSTOMERS");
      await d.getByRole("button", { name: "Kuralı oluştur" }).click();
      await expect(page.getByText("Kural oluşturuldu")).toBeVisible();
      const k = await sorgu<{ isActive: boolean; value: number }>(`SELECT "isActive", value FROM price_rules WHERE name = $1`, [KURAL]);
      expect(k[0]?.isActive).toBe(true);
      expect(Number(k[0]?.value)).toBe(20);
    });
  });
  test.describe("müşteri", () => {
    test.use({ storageState: MUSTERI });
    test("kural müşteri fiyatına yansır (+%20)", async ({ request }) => {
      yakin((await odaFiyati(request)).toplam, taban * 1.2);
    });
  });
});

test.describe("kupon", () => {
  test.describe("yönetici", () => {
    test.use({ storageState: YONETICI });
    test("%10 kupon açar", async ({ page }) => {
      await page.goto("/admin/campaigns");
      await page.getByRole("tab", { name: "Kuponlar" }).or(page.getByRole("button", { name: "Kuponlar" })).first().click();
      await page.getByRole("button", { name: "Yeni kupon" }).click();
      const d = page.getByRole("dialog", { name: "Yeni kupon" });
      await d.locator("#c-kod").fill(KUPON);
      await d.locator("#c-tur").selectOption("PERCENTAGE");
      await d.locator("#c-deger").fill("10");
      await d.getByRole("button", { name: "Kuponu oluştur" }).click();
      await expect(page.getByText(`${KUPON} oluşturuldu`)).toBeVisible();
    });
  });
  test.describe("müşteri", () => {
    test.use({ storageState: MUSTERI });
    test("ödemede kuponu kullanır, fiyat %10 düşer, rezervasyon kuponla yazılır", async ({ page }) => {
      await odaSec(page, { otel: OTEL, giris: GIRIS, cikis: CIKIS });
      const once = await odemeTutari(page);
      yakin(once, taban * 1.2);
      const mesaj = await kuponUygula(page, KUPON);
      expect(mesaj).toContain("uygulandı");
      await expect.poll(() => odemeTutari(page)).toBeLessThan(once);
      yakin(await odemeTutari(page), once * 0.9);
      await odemeyiTamamla(page, {
        misafirler: [
          { ad: "Ayşe", soyad: "Test", cins: "Kadın", dogum: "15.04.1990" },
          { ad: "Mehmet", soyad: "Test", cins: "Erkek", dogum: "02.11.1988" },
        ],
      });
      const [r] = await rezervasyonlar(EPOSTA.musteri);
      expect(r.couponId).not.toBeNull();
      const [k] = await sorgu<{ usedCount: number }>(`SELECT "usedCount" FROM coupons WHERE code = $1`, [KUPON]);
      expect(k.usedCount).toBe(1);
    });

    test("iptal edince kupon hakkı geri verilir", async ({ request }) => {
      const [r] = await rezervasyonlar(EPOSTA.musteri);
      const y = await request.post(`/api/reservations/${r.id}/cancel`, { data: {} });
      expect(y.status(), await y.text()).toBe(200);
      const [k] = await sorgu<{ usedCount: number }>(`SELECT "usedCount" FROM coupons WHERE code = $1`, [KUPON]);
      expect(k.usedCount).toBe(0);
      expect((await sorgu(`SELECT 1 FROM coupon_uses u JOIN coupons c ON c.id = u."couponId" WHERE c.code = $1`, [KUPON])).length).toBe(0);
    });

    test("aynı kupon bir daha kullanılabilir (kişi başı hak iade edildi)", async ({ page }) => {
      await odaSec(page, { otel: OTEL, giris: GIRIS, cikis: CIKIS });
      expect(await kuponUygula(page, KUPON)).toContain("uygulandı");
    });
  });
});

test.describe("kampanya", () => {
  test.describe("yönetici", () => {
    test.use({ storageState: YONETICI });
    test("30 gün önceden %15 erken rezervasyon indirimi açar", async ({ page }) => {
      await page.goto("/admin/campaigns");
      await page.getByRole("button", { name: "Yeni indirim" }).click();
      const d = page.getByRole("dialog", { name: "Yeni indirim" });
      await d.locator("#d-oran").fill("15");
      await d.locator("#d-gun").fill("30");
      await d.locator("#d-ad").fill(KAMPANYA);
      await d.getByRole("button", { name: "Kaydet ve yayına al" }).click();
      await expect(page.getByText(/İndirim kaydedildi/)).toBeVisible();
    });
  });
  test.describe("müşteri", () => {
    test.use({ storageState: MUSTERI });
    test("indirim fiyata ve vitrine yansır", async ({ page, request }) => {
      const f = await odaFiyati(request);
      yakin(f.onceki, taban * 1.2);
      yakin(f.toplam, taban * 1.2 * 0.85);
      await page.goto("/kampanyalar");
      await expect(page.getByText(KAMPANYA).first()).toBeVisible();
    });
  });
});

test.describe("temizlik (arayüzden)", () => {
  test.describe("yönetici", () => {
    test.use({ storageState: YONETICI });

    test("kampanyayı siler", async ({ page }) => {
      await page.goto("/admin/campaigns");
      const kart = page.locator("article, li, section, div").filter({ hasText: KAMPANYA }).filter({ has: page.getByRole("button", { name: "Sil" }) }).last();
      await kart.getByRole("button", { name: "Sil" }).click();
      await kart.getByRole("button", { name: "Evet, sil" }).click();
      await expect.poll(async () => (await sorgu(`SELECT 1 FROM discounts WHERE name = $1`, [KAMPANYA])).length).toBe(0);
    });

    test("rezervasyonda kullanılmış kupon silinmez, durdurulur", async ({ page }) => {
      const [k] = await sorgu<{ id: string }>(`SELECT id FROM coupons WHERE code = $1`, [KUPON]);
      // Rezervasyon iptal edilse de kupona bağlı: silme 409, arayüzde "Sil" yok.
      const y = await page.request.delete(`/api/admin/coupons/${k.id}`);
      expect(y.status(), await y.text()).toBe(409);
      await page.goto("/admin/campaigns");
      await page.getByRole("tab", { name: "Kuponlar" }).or(page.getByRole("button", { name: "Kuponlar" })).first().click();
      const satir = page.getByRole("row").filter({ hasText: KUPON });
      await expect(satir).toBeVisible();
      await expect(satir.getByRole("button", { name: "Sil" })).toHaveCount(0);
      await satir.getByRole("switch", { name: `${KUPON} etkin` }).or(satir.getByRole("checkbox", { name: `${KUPON} etkin` })).first().click();
      await expect.poll(async () => (await sorgu<{ isActive: boolean }>(`SELECT "isActive" FROM coupons WHERE code = $1`, [KUPON]))[0]?.isActive).toBe(false);
    });

    test("kâr payı kuralını siler, fiyat eski hâline döner", async ({ page }) => {
      await page.goto("/admin/price-rules");
      const satir = page.getByRole("row").filter({ hasText: KURAL });
      await satir.getByRole("button", { name: "Sil" }).click();
      await satir.getByRole("button", { name: "Evet, sil" }).click();
      await expect(page.getByText("Kural silindi")).toBeVisible();
      expect((await sorgu(`SELECT 1 FROM price_rules WHERE name = $1`, [KURAL])).length).toBe(0);
    });
  });
  test.describe("müşteri", () => {
    test.use({ storageState: MUSTERI });
    test("fiyat tabana döndü", async ({ request }) => {
      yakin((await odaFiyati(request)).toplam, taban);
    });
  });
});
