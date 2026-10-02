-- Otel sayfalarının okunur adresi (lookbeds.com/club-hotel-sera). Değerleri
-- uygulama verir: lib/otel-adresi.ts ("adresler" işi ve eşitleme sonrası).
-- AlterTable
ALTER TABLE "hotels" ADD COLUMN     "slug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "hotels_slug_key" ON "hotels"("slug");
