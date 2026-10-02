// Uçtan uca testlerin veritabanı yardımcıları (yerel DB, düz SQL).
//
// Prisma istemcisi burada kullanılmıyor: üretilen istemci üst düzeyde
// import.meta kullanıyor, Playwright'ın CommonJS yükleyicisinde açılmıyor.
//
// Test verisi iki işaretle ayrılır ve yalnız o silinir:
//   • kullanıcılar: e-postası @lookbeds.test
//   • yöneticinin açtığı kupon/kampanya/fiyat kuralı: adı ya da kodu E2E ile başlar

import pg from "pg";

export const ALAN = "@lookbeds.test";
export const ONEK = "E2E";

// Her koşuda yeni adresler: kod isteme sınırı (e-posta başına bekleme,
// saatlik üst sınır) sunucu belleğinde; aynı adresle art arda koşu takılır.
// E2E_KOSU kurulumda atanır, işçilere ortam değişkeniyle geçer.
const kosu = () => process.env.E2E_KOSU ?? "yerel";
export const EPOSTA = {
  get yonetici() { return `e2e-yonetici-${kosu()}${ALAN}`; },
  get musteri() { return `e2e-musteri-${kosu()}${ALAN}`; },
  get acente() { return `e2e-acente-${kosu()}${ALAN}`; },
  get aday() { return `e2e-aday-${kosu()}${ALAN}`; },
};

let havuz: pg.Pool | null = null;
function db(): pg.Pool {
  if (!havuz) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL yok (.env.local yüklenmedi mi?)");
    const host = new URL(url).hostname;
    // Güvenlik: yalnız yerel veritabanı. Canlıya ya da uzak DB'ye test verisi yazılmasın.
    if (!["localhost", "127.0.0.1", "::1"].includes(host)) throw new Error(`E2E yalnız yerel veritabanında çalışır (şu an: ${host})`);
    havuz = new pg.Pool({ connectionString: url, max: 2 });
  }
  return havuz;
}

export async function sorgu<T extends pg.QueryResultRow = pg.QueryResultRow>(sql: string, degerler: unknown[] = []): Promise<T[]> {
  return (await db().query<T>(sql, degerler)).rows;
}

export async function kapat() {
  await havuz?.end();
  havuz = null;
}

/** Yönetici hesabı: canlıdaki gibi önce kullanıcı, sonra rol ADMIN (SQL ile). */
export async function yoneticiHazirla(): Promise<void> {
  await sorgu(
    `INSERT INTO users (id, email, name, role, "isActive", "createdAt", "updatedAt")
     VALUES ($2, $1, 'E2E Yönetici', 'ADMIN', true, now(), now())
     ON CONFLICT (email) DO UPDATE SET role = 'ADMIN', "isActive" = true`,
    [EPOSTA.yonetici, `e2e-yonetici-${kosu()}`]
  );
}

/** Bir test kullanıcısının son rezervasyonları (en yeni önce). */
export async function rezervasyonlar(eposta: string) {
  return sorgu<{ id: string; status: string; bookingNumber: string | null; agencyId: string | null; couponId: string | null; totalPrice: number; discountedPrice: number | null; commissionAmount: number | null }>(
    `SELECT r.id, r.status, r."bookingNumber", r."agencyId", r."couponId", r."totalPrice", r."discountedPrice", r."commissionAmount"
       FROM reservations r JOIN users u ON u.id = r."userId"
      WHERE u.email = $1 ORDER BY r."createdAt" DESC`,
    [eposta]
  );
}

export async function kullanici(eposta: string) {
  return (await sorgu<{ id: string; role: string; name: string; isActive: boolean }>(`SELECT id, role, name, "isActive" FROM users WHERE email = $1`, [eposta]))[0] ?? null;
}

/**
 * Test verisini siler (kurulumda eski koşudan kalanı, bitişte bu koşunun
 * açtığını). Sıra kısıtlara göre: RESTRICT ilişkiler önce.
 */
export async function temizle(): Promise<Record<string, number>> {
  const c = await db().connect();
  const sayi: Record<string, number> = {};
  const sil = async (ad: string, sql: string, degerler: unknown[] = []) => {
    sayi[ad] = (await c.query(sql, degerler)).rowCount ?? 0;
  };
  try {
    await c.query("BEGIN");
    const kullanicilar = `SELECT id FROM users WHERE email LIKE '%' || $1`;
    const acenteler = `SELECT id FROM agencies WHERE "userId" IN (${kullanicilar})`;
    const kuponlar = `SELECT id FROM coupons WHERE code LIKE $2 || '%'`;
    const kampanyalar = `SELECT id FROM discounts WHERE name LIKE $2 || '%'`;
    const rez = `SELECT id FROM reservations WHERE "userId" IN (${kullanicilar}) OR "agencyId" IN (${acenteler})
                    OR "couponId" IN (${kuponlar}) OR "discountId" IN (${kampanyalar})`;
    const p = [ALAN, ONEK];
    // Test rezervasyonlarının yöneticiye düşen bildirimleri (rezervasyon numarası ya da referansı geçen).
    await sil(
      "bildirim(rezervasyon)",
      `DELETE FROM notifications n USING reservations r
        WHERE r.id IN (${rez})
          AND (n.message LIKE '%' || r."clientReferenceId" || '%' OR (r."bookingNumber" IS NOT NULL AND n.message LIKE '%' || r."bookingNumber" || '%'))`,
      p
    );
    await sil("kuponKullanimi", `DELETE FROM coupon_uses WHERE "userId" IN (${kullanicilar}) OR "couponId" IN (${kuponlar}) OR "reservationId" IN (${rez})`, p);
    await sil("rezervasyon", `DELETE FROM reservations WHERE id IN (${rez})`, p);
    await sil("fiyatKurali", `DELETE FROM price_rules WHERE name LIKE $2 || '%' OR "agencyId" IN (${acenteler}) OR "createdById" IN (${kullanicilar})`, p);
    await sil("kupon", `DELETE FROM coupons WHERE code LIKE $2 || '%' OR "createdById" IN (${kullanicilar})`, p);
    await sil("kampanya", `DELETE FROM discounts WHERE name LIKE $2 || '%' OR "createdById" IN (${kullanicilar})`, p);
    await sil("basvuru", `DELETE FROM agency_applications WHERE "userId" IN (${kullanicilar}) OR email LIKE '%' || $1`, [ALAN]);
    await sil("acente", `DELETE FROM agencies WHERE "userId" IN (${kullanicilar})`, [ALAN]); // komisyonlar cascade
    await sil("bildirim", `DELETE FROM notifications WHERE "userId" IN (${kullanicilar})`, [ALAN]);
    await sil("denetim", `DELETE FROM audit_logs WHERE "userId" IN (${kullanicilar})`, [ALAN]);
    await sil("aramaGecmisi", `DELETE FROM search_histories WHERE "userId" IN (${kullanicilar})`, [ALAN]);
    await sil("girisKodu", `DELETE FROM login_codes WHERE email LIKE '%' || $1`, [ALAN]);
    await sil("kullanici", `DELETE FROM users WHERE email LIKE '%' || $1`, [ALAN]); // misafir, favori cascade
    await c.query("COMMIT");
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    c.release();
  }
  return sayi;
}
