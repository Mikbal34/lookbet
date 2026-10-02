-- Sağlamlaştırma (2026-09-26): para alanları DECIMAL, konaklama tarihleri DATE,
-- finansal kayıtlarda silme kısıtı (RESTRICT), rezervasyonda fiyat kodu kilidi
-- ve "kontrol gerekli" işareti, kupon kullanımında kişi başı tekil anahtar,
-- eksik yabancı anahtarlar ve sorgu indeksleri. Veri silmez.

-- DropForeignKey
ALTER TABLE "agencies" DROP CONSTRAINT "agencies_userId_fkey";

-- DropForeignKey
ALTER TABLE "coupon_uses" DROP CONSTRAINT "coupon_uses_couponId_fkey";

-- DropForeignKey
ALTER TABLE "reservations" DROP CONSTRAINT "reservations_agencyId_fkey";

-- DropForeignKey
ALTER TABLE "reservations" DROP CONSTRAINT "reservations_couponId_fkey";

-- DropForeignKey
ALTER TABLE "reservations" DROP CONSTRAINT "reservations_discountId_fkey";

-- DropIndex
DROP INDEX "hotels_locationId_idx";

-- DropIndex
DROP INDEX "login_codes_email_idx";

-- DropIndex
DROP INDEX "reservations_agencyId_idx";

-- DropIndex
DROP INDEX "reservations_status_idx";

-- DropIndex
DROP INDEX "reservations_userId_idx";

-- AlterTable
ALTER TABLE "agencies" ALTER COLUMN "discountRate" SET DATA TYPE DECIMAL(5,2),
ALTER COLUMN "commission" SET DATA TYPE DECIMAL(5,2);

-- AlterTable
ALTER TABLE "commissions" ALTER COLUMN "value" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "coupon_uses" ADD COLUMN     "perUserKey" TEXT,
ALTER COLUMN "amount" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "coupons" ALTER COLUMN "value" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "minAmount" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "discounts" ALTER COLUMN "stayStart" SET DATA TYPE DATE,
ALTER COLUMN "stayEnd" SET DATA TYPE DATE;

-- AlterTable
ALTER TABLE "price_rules" ALTER COLUMN "value" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "reservations" ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "needsReview" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "priceCode" TEXT,
ADD COLUMN     "statusNote" TEXT,
ALTER COLUMN "checkIn" SET DATA TYPE DATE,
ALTER COLUMN "checkOut" SET DATA TYPE DATE,
ALTER COLUMN "totalPrice" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "discountedPrice" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "discountAmount" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "cancellationFee" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "commissionAmount" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "campaignDiscount" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "couponDiscount" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "passwordHash" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "agency_applications_taxId_status_idx" ON "agency_applications"("taxId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "coupon_uses_reservationId_key" ON "coupon_uses"("reservationId");

-- CreateIndex
CREATE UNIQUE INDEX "coupon_uses_perUserKey_key" ON "coupon_uses"("perUserKey");

-- CreateIndex
CREATE INDEX "hotels_locationId_isActive_lastPricedAt_idx" ON "hotels"("locationId", "isActive", "lastPricedAt");

-- CreateIndex
CREATE INDEX "locations_parentId_idx" ON "locations"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "login_codes_email_key" ON "login_codes"("email");

-- CreateIndex
CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "reservations_priceCode_key" ON "reservations"("priceCode");

-- CreateIndex
CREATE INDEX "reservations_userId_createdAt_idx" ON "reservations"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "reservations_agencyId_status_createdAt_idx" ON "reservations"("agencyId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "reservations_status_createdAt_idx" ON "reservations"("status", "createdAt");

-- CreateIndex
CREATE INDEX "reservations_createdAt_idx" ON "reservations"("createdAt");

-- CreateIndex
CREATE INDEX "reservations_hotelCode_idx" ON "reservations"("hotelCode");

-- CreateIndex
CREATE INDEX "search_histories_createdAt_idx" ON "search_histories"("createdAt");

-- AddForeignKey
ALTER TABLE "agency_applications" ADD CONSTRAINT "agency_applications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agencies" ADD CONSTRAINT "agencies_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_discountId_fkey" FOREIGN KEY ("discountId") REFERENCES "discounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "coupons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discounts" ADD CONSTRAINT "discounts_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_uses" ADD CONSTRAINT "coupon_uses_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "coupons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_uses" ADD CONSTRAINT "coupon_uses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_uses" ADD CONSTRAINT "coupon_uses_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "reservations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
