// Ortak test yardımcıları.

import { expect, type Page } from "@playwright/test";

/** Bugünden n gün sonrası, YYYY-AA-GG (İstanbul günü). */
export function gunSonra(n: number): string {
  const d = new Date(Date.now() + n * 864e5);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(d);
}

/** "€1.234,50" / "€414" → 1234.5 / 414 (Türkçe biçim). */
export function euro(metin: string): number {
  const m = metin.replace(/\s/g, "").match(/€?([\d.]+(?:,\d+)?)/);
  if (!m) throw new Error(`Tutar okunamadı: ${metin}`);
  return Number(m[1].replace(/\./g, "").replace(",", "."));
}

export interface Misafir {
  ad: string;
  soyad: string;
  cins: "Kadın" | "Erkek";
  /** GG.AA.YYYY */
  dogum: string;
}

/** Otel sayfasında odayı seçip ödeme sayfasına geçer. */
export async function odaSec(page: Page, p: { otel: string; giris: string; cikis: string; yetiskin?: number; oda?: string }) {
  await page.goto(`/hotel/${p.otel}?checkIn=${p.giris}&checkOut=${p.cikis}&adults=${p.yetiskin ?? 2}`);
  const kart = page.getByRole("button").filter({ hasText: p.oda ?? "Standart Oda" }).filter({ hasText: /toplam/ }).first();
  await kart.click();
  await page.getByRole("button", { name: "Bu odayı seç" }).filter({ visible: true }).click();
  // Aynı düğme bölüm menüsünde ve mobil çubukta da var: yan paneldekine bas.
  await page.getByRole("complementary", { name: "Rezervasyon" }).getByRole("button", { name: "Rezervasyona devam et" }).click();
  await expect(page).toHaveURL(/\/booking\?/);
  await expect(page.getByText("İletişim bilgileri").first()).toBeVisible();
}

/** Ödeme sayfasındaki toplam (onay düğmesindeki tutar). */
export async function odemeTutari(page: Page): Promise<number> {
  return euro((await page.getByRole("button", { name: /^Rezervasyonu onayla/ }).textContent()) ?? "");
}

/** Ödeme sayfasında kupon uygular; sunucunun mesajını döndürür. */
export async function kuponUygula(page: Page, kod: string): Promise<string> {
  await page.getByRole("button", { name: "Kupon ekle" }).click();
  await page.getByLabel("Kupon kodu").fill(kod);
  const yanit = page.waitForResponse((r) => r.url().includes("/api/kupon"));
  await page.getByRole("button", { name: "Uygula" }).click();
  const d = await (await yanit).json().catch(() => ({}));
  return String(d.mesaj ?? d.error ?? "");
}

/**
 * Ödeme formunu doldurup rezervasyonu tamamlar (odaSec'ten sonra).
 * Dönen: onay sayfasındaki rezervasyon numarası.
 */
export async function odemeyiTamamla(page: Page, p: { telefon?: string; iletisim?: { ad: string; soyad: string }; misafirler: Misafir[] }): Promise<string> {
  // Adımlar ayrı bölümler; etkin olmayan inert ve açılırken kayıyor. "Devam et"
  // her adımda var: bölüme göre bas, sonraki bölüm etkinleşince devam et.
  const adim = (ad: RegExp) => page.getByRole("region", { name: ad });
  const etkin = async (ad: RegExp) => {
    await expect(adim(ad)).toHaveAttribute("data-aktif", "true");
    await expect.poll(() => adim(ad).evaluate((e) => (e as HTMLElement).inert)).toBe(false);
    await page.waitForTimeout(400); // açılış geçişi
  };
  if (p.iletisim) {
    await page.locator("#c-ad").fill(p.iletisim.ad);
    await page.locator("#c-soyad").fill(p.iletisim.soyad);
  }
  const telefon = page.locator("#c-telefon");
  if (!(await telefon.inputValue())) await telefon.fill(p.telefon ?? "5321234567");
  await adim(/İletişim bilgileri/).getByRole("button", { name: "Devam et" }).click();

  await etkin(/Konaklayacak misafirler/);
  for (const [j, m] of p.misafirler.entries()) {
    await page.locator(`#g${j}-ad`).fill(m.ad);
    await page.locator(`#g${j}-soyad`).fill(m.soyad);
    // Görünmez radyo girdisi yazının üstünde: yazıya değil girdiye bas.
    const cins = page.locator(`#g${j}-cins input[value="${m.cins === "Kadın" ? "Female" : "Male"}"]`);
    await cins.check();
    await page.locator(`#g${j}-dogum`).fill(m.dogum);
  }
  await adim(/Konaklayacak misafirler/).getByRole("button", { name: "Devam et" }).click();
  // Ödeme yöntemi (kart seçili gelir).
  await etkin(/Ödeme yöntemi/);
  await adim(/Ödeme yöntemi/).getByRole("button", { name: "Devam et" }).click();
  await etkin(/gözden geçir/);

  await page.getByRole("checkbox", { name: /okudum/ }).check();
  const yanit = page.waitForResponse((r) => r.url().endsWith("/api/booking") && r.request().method() === "POST", { timeout: 60_000 });
  await page.getByRole("button", { name: /^Rezervasyonu onayla/ }).click();
  const r = await yanit;
  if (r.status() !== 201) throw new Error(`Rezervasyon yapılamadı: ${r.status()} ${await r.text()}`);
  await expect(page.getByText("Rezervasyonun onaylandı!")).toBeVisible({ timeout: 30_000 });
  const d = await r.json();
  return String(d.bookingConfirmation?.bookingNumber ?? "");
}

/**
 * E-posta koduyla giriş. Geliştirme modunda kod ekranda yazıyor
 * ("Geliştirme modu, kod: 123456"); e-posta gönderilmiyor.
 * Yeni hesapta "Hesabını tamamla" adımı ad/soyadla geçilir.
 */
export async function girisYap(
  page: Page,
  p: { eposta: string; /** Giriş sayfası (sorgusuyla): /login ya da /agency/login */ yol?: string; ad?: string; soyad?: string }
): Promise<void> {
  await page.goto(p.yol ?? "/login");
  const eposta = page.getByLabel("E-posta", { exact: true }).first();
  await eposta.fill(p.eposta);
  const kodYazisi = page.getByText(/Geliştirme modu, kod: \d{6}/).first();
  const bekle = page.getByText(/Yeni kod için (\d+) saniye bekle/).first();
  for (let deneme = 0; ; deneme++) {
    await eposta.press("Enter");
    await expect(kodYazisi.or(bekle)).toBeVisible();
    if (await kodYazisi.isVisible()) break;
    // Aynı adrese kısa sürede ikinci kod: sunucunun dediği kadar bekle.
    const sn = Number((await bekle.textContent())?.match(/(\d+)/)?.[1] ?? 30);
    if (deneme >= 2) throw new Error(`Kod alınamadı: ${await bekle.textContent()}`);
    await page.waitForTimeout((sn + 1) * 1000);
  }
  const kod = (await kodYazisi.textContent())!.match(/(\d{6})/)![1];
  await page.getByLabel("1. hane").first().click();
  await page.keyboard.type(kod, { delay: 30 });
  // Yeni hesap: ad/soyad adımı; var olan hesap: doğrudan giriş (sayfa değişir).
  const tamamla = page.getByText("Hesabını tamamla").first();
  const girisSayfasi = () => /\/(agency\/)?login$/.test(new URL(page.url()).pathname);
  const bitis = Date.now() + 25_000;
  while (Date.now() < bitis) {
    if (!girisSayfasi()) return;
    if (await tamamla.isVisible()) {
      await page.getByLabel("Ad", { exact: true }).fill(p.ad ?? "Test");
      await page.getByLabel("Soyad", { exact: true }).fill(p.soyad ?? "Kullanıcı");
      await page.getByRole("button", { name: "Kabul et ve devam et" }).click();
      await expect.poll(girisSayfasi, { timeout: 20_000 }).toBe(false);
      return;
    }
    await page.waitForTimeout(250);
  }
  throw new Error(`Giriş tamamlanmadı: ${p.eposta} (${page.url()})`);
}
