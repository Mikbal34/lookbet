-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CUSTOMER', 'AGENCY', 'ADMIN');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "ReservationSource" AS ENUM ('CUSTOMER', 'AGENCY');

-- CreateEnum
CREATE TYPE "PriceRuleType" AS ENUM ('PERCENTAGE_DISCOUNT', 'FIXED_DISCOUNT', 'MARKUP');

-- CreateEnum
CREATE TYPE "PriceRuleTarget" AS ENUM ('ALL_AGENCIES', 'SPECIFIC_AGENCY', 'ALL_CUSTOMERS');

-- CreateEnum
CREATE TYPE "CommissionType" AS ENUM ('PERCENTAGE', 'FIXED');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('EARLY_BOOKING', 'LAST_MINUTE', 'LONG_STAY', 'DATE_RANGE');

-- CreateEnum
CREATE TYPE "DiscountAudience" AS ENUM ('CUSTOMER', 'AGENCY', 'ALL');

-- CreateEnum
CREATE TYPE "CouponType" AS ENUM ('PERCENTAGE', 'FIXED');

-- CreateEnum
CREATE TYPE "CouponAudience" AS ENUM ('CUSTOMER', 'NEW_CUSTOMER', 'AGENCY');

-- CreateEnum
CREATE TYPE "LocationType" AS ENUM ('COUNTRY', 'CITY', 'DISTRICT', 'AREA');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "birthDate" TEXT,
    "nationality" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'CUSTOMER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_guests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "surname" TEXT NOT NULL,
    "birthDate" TEXT NOT NULL,
    "gender" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_guests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_codes" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agency_applications" (
    "id" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "companyName" TEXT NOT NULL,
    "taxId" TEXT NOT NULL,
    "taxOffice" TEXT,
    "tursabNo" TEXT,
    "website" TEXT,
    "companyPhone" TEXT,
    "address" TEXT,
    "message" TEXT,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "agencyId" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agency_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agencies" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "taxId" TEXT NOT NULL,
    "taxOffice" TEXT,
    "tursabNo" TEXT,
    "website" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "discountRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "feedId" TEXT,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "approvedById" TEXT,
    "commission" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "royal_api_tokens" (
    "id" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "royal_api_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "currencies" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "currencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "board_types" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "board_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hotel_facilities" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "hotel_facilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_attributes" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "room_attributes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "type" "LocationType" NOT NULL DEFAULT 'CITY',

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hotels" (
    "id" TEXT NOT NULL,
    "hotelCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stars" INTEGER,
    "address" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "description" TEXT,
    "images" JSONB,
    "facilities" JSONB,
    "thumbnailImage" TEXT,
    "locationId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastPricedAt" TIMESTAMP(3),
    "phone" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hotels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_rules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PriceRuleType" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "appliesTo" "PriceRuleTarget" NOT NULL,
    "agencyId" TEXT,
    "hotelCode" TEXT,
    "boardType" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "price_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commissions" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "type" "CommissionType" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "hotelCode" TEXT,
    "boardType" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservations" (
    "id" TEXT NOT NULL,
    "bookingNumber" TEXT,
    "clientReferenceId" TEXT NOT NULL,
    "hotelCode" TEXT NOT NULL,
    "hotelName" TEXT,
    "userId" TEXT NOT NULL,
    "agencyId" TEXT,
    "checkIn" TIMESTAMP(3) NOT NULL,
    "checkOut" TIMESTAMP(3) NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'PENDING',
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "discountedPrice" DOUBLE PRECISION,
    "discountAmount" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "boardType" TEXT,
    "roomType" TEXT,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "guests" JSONB,
    "cancellationPolicy" JSONB,
    "roomConfirmationCodes" JSONB,
    "hotelConfirmationNumber" TEXT,
    "cancellationFee" DOUBLE PRECISION,
    "cancellationFeeCurrency" TEXT,
    "appliedPriceRules" JSONB,
    "commissionAmount" DOUBLE PRECISION,
    "discountId" TEXT,
    "campaignDiscount" DOUBLE PRECISION,
    "couponId" TEXT,
    "couponDiscount" DOUBLE PRECISION,
    "source" "ReservationSource" NOT NULL DEFAULT 'CUSTOMER',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discounts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "DiscountType" NOT NULL,
    "percent" DOUBLE PRECISION NOT NULL,
    "minDays" INTEGER,
    "maxDays" INTEGER,
    "minNights" INTEGER,
    "stayStart" TIMESTAMP(3),
    "stayEnd" TIMESTAMP(3),
    "hotelCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "locationName" TEXT,
    "audience" "DiscountAudience" NOT NULL DEFAULT 'CUSTOMER',
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "showcase" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupons" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "CouponType" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "minAmount" DOUBLE PRECISION,
    "usageLimit" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "perUserOnce" BOOLEAN NOT NULL DEFAULT true,
    "audience" "CouponAudience" NOT NULL DEFAULT 'CUSTOMER',
    "expiresAt" TIMESTAMP(3),
    "stacks" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupon_uses" (
    "id" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reservationId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupon_uses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_histories" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "params" JSONB NOT NULL,
    "resultCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "oldData" JSONB,
    "newData" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "saved_guests_userId_idx" ON "saved_guests"("userId");

-- CreateIndex
CREATE INDEX "login_codes_email_idx" ON "login_codes"("email");

-- CreateIndex
CREATE UNIQUE INDEX "agency_applications_agencyId_key" ON "agency_applications"("agencyId");

-- CreateIndex
CREATE INDEX "agency_applications_status_idx" ON "agency_applications"("status");

-- CreateIndex
CREATE INDEX "agency_applications_email_idx" ON "agency_applications"("email");

-- CreateIndex
CREATE INDEX "agency_applications_userId_idx" ON "agency_applications"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "agencies_userId_key" ON "agencies"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "agencies_taxId_key" ON "agencies"("taxId");

-- CreateIndex
CREATE UNIQUE INDEX "currencies_code_key" ON "currencies"("code");

-- CreateIndex
CREATE UNIQUE INDEX "board_types_code_key" ON "board_types"("code");

-- CreateIndex
CREATE UNIQUE INDEX "hotel_facilities_externalId_key" ON "hotel_facilities"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "room_attributes_externalId_key" ON "room_attributes"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "locations_externalId_key" ON "locations"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "hotels_hotelCode_key" ON "hotels"("hotelCode");

-- CreateIndex
CREATE INDEX "hotels_locationId_idx" ON "hotels"("locationId");

-- CreateIndex
CREATE INDEX "price_rules_isActive_priority_idx" ON "price_rules"("isActive", "priority");

-- CreateIndex
CREATE INDEX "price_rules_agencyId_idx" ON "price_rules"("agencyId");

-- CreateIndex
CREATE INDEX "commissions_agencyId_isActive_idx" ON "commissions"("agencyId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "reservations_bookingNumber_key" ON "reservations"("bookingNumber");

-- CreateIndex
CREATE UNIQUE INDEX "reservations_clientReferenceId_key" ON "reservations"("clientReferenceId");

-- CreateIndex
CREATE INDEX "reservations_userId_idx" ON "reservations"("userId");

-- CreateIndex
CREATE INDEX "reservations_agencyId_idx" ON "reservations"("agencyId");

-- CreateIndex
CREATE INDEX "reservations_discountId_idx" ON "reservations"("discountId");

-- CreateIndex
CREATE INDEX "reservations_couponId_idx" ON "reservations"("couponId");

-- CreateIndex
CREATE INDEX "reservations_status_idx" ON "reservations"("status");

-- CreateIndex
CREATE INDEX "reservations_checkIn_checkOut_idx" ON "reservations"("checkIn", "checkOut");

-- CreateIndex
CREATE INDEX "discounts_isActive_idx" ON "discounts"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "coupons_code_key" ON "coupons"("code");

-- CreateIndex
CREATE INDEX "coupon_uses_couponId_userId_idx" ON "coupon_uses"("couponId", "userId");

-- CreateIndex
CREATE INDEX "search_histories_userId_idx" ON "search_histories"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_key_key" ON "system_settings"("key");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_entity_entityId_idx" ON "audit_logs"("entity", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_idx" ON "notifications"("userId", "isRead");

-- AddForeignKey
ALTER TABLE "saved_guests" ADD CONSTRAINT "saved_guests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_applications" ADD CONSTRAINT "agency_applications_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_applications" ADD CONSTRAINT "agency_applications_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agencies" ADD CONSTRAINT "agencies_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agencies" ADD CONSTRAINT "agencies_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotels" ADD CONSTRAINT "hotels_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_rules" ADD CONSTRAINT "price_rules_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_rules" ADD CONSTRAINT "price_rules_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_discountId_fkey" FOREIGN KEY ("discountId") REFERENCES "discounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "coupons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_uses" ADD CONSTRAINT "coupon_uses_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "coupons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "search_histories" ADD CONSTRAINT "search_histories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
