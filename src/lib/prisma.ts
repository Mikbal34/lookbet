import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const connectionString = process.env.DATABASE_URL!;

// Para alanları DB'de DECIMAL (kuruş hassas, toplamda kayma yok). Uygulama
// katmanı sayı bekliyor: okurken number'a çevrilir (iç içe include ve
// transaction'larda da geçerli). Yazarken number verilebilir.
// DİKKAT: aggregate/groupBy (_sum, _avg) ve ham SQL bu çeviriden geçmez;
// orada Number(x ?? 0) kullanın.
type Ondalik = { toNumber(): number };
const sayi = (d: Ondalik) => d.toNumber();
const sayiYaDaBos = (d: Ondalik | null) => (d === null ? null : d.toNumber());

function createPrismaClient() {
  const pool = new pg.Pool({
    connectionString,
    // SSL yalnızca DATABASE_SSL=true iken (ör. yönetilen RDS). Aynı sunucudaki
    // Docker Postgres SSL sunmadığından varsayılan olarak kapalı.
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter }).$extends({
    result: {
      reservation: {
        totalPrice: { needs: { totalPrice: true }, compute: (r) => sayi(r.totalPrice) },
        discountedPrice: { needs: { discountedPrice: true }, compute: (r) => sayiYaDaBos(r.discountedPrice) },
        discountAmount: { needs: { discountAmount: true }, compute: (r) => sayiYaDaBos(r.discountAmount) },
        cancellationFee: { needs: { cancellationFee: true }, compute: (r) => sayiYaDaBos(r.cancellationFee) },
        commissionAmount: { needs: { commissionAmount: true }, compute: (r) => sayiYaDaBos(r.commissionAmount) },
        campaignDiscount: { needs: { campaignDiscount: true }, compute: (r) => sayiYaDaBos(r.campaignDiscount) },
        couponDiscount: { needs: { couponDiscount: true }, compute: (r) => sayiYaDaBos(r.couponDiscount) },
      },
      agency: {
        discountRate: { needs: { discountRate: true }, compute: (a) => sayi(a.discountRate) },
        commission: { needs: { commission: true }, compute: (a) => sayi(a.commission) },
      },
      priceRule: {
        value: { needs: { value: true }, compute: (k) => sayi(k.value) },
      },
      commission: {
        value: { needs: { value: true }, compute: (k) => sayi(k.value) },
      },
      coupon: {
        value: { needs: { value: true }, compute: (k) => sayi(k.value) },
        minAmount: { needs: { minAmount: true }, compute: (k) => sayiYaDaBos(k.minAmount) },
      },
      couponUse: {
        amount: { needs: { amount: true }, compute: (k) => sayi(k.amount) },
      },
    },
  });
}

type Istemci = ReturnType<typeof createPrismaClient>;
const globalForPrisma = globalThis as unknown as { prisma: Istemci | undefined };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
