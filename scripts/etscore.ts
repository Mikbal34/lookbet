// Etscore içerik işleri — elle ya da zamanlanmış görevle çalıştırılır.
//
//   npx tsx --env-file=.env.local scripts/etscore.ts oteller
//       15.679 otelin adını senkronlar. Bizde olan içeriğe (yıldız, adres,
//       fotoğraf) dokunmaz.
//
//   npx tsx --env-file=.env.local scripts/etscore.ts indeks [enFazla]
//       "Hangi otel hangi şehirde" indeksini kurar. Yalnızca henüz konumu
//       olmayan otelleri tarar; tekrar çalıştırmak kaldığı yerden devam eder.
//
//   npx tsx --env-file=.env.local scripts/etscore.ts hepsi
//       Önce oteller, sonra indeks.

import { prisma } from "@/lib/prisma";
import { indexHotelLocations, syncHotels } from "@/lib/royal-api/sync";

const feedId = process.env.ROYAL_API_FEED_ID_B2B || process.env.ROYAL_API_FEED_ID_B2C || "";

async function main() {
  const [komut, arg] = process.argv.slice(2);
  if (process.env.ROYAL_API_MOCK === "true") {
    console.error("ROYAL_API_MOCK=true — gerçek API değil, mock çalışır. Önce kapatın.");
    process.exit(1);
  }
  if (!feedId) {
    console.error("ROYAL_API_FEED_ID_B2B / _B2C tanımlı değil.");
    process.exit(1);
  }

  const t = Date.now();
  const sure = () => `${((Date.now() - t) / 1000).toFixed(1)} sn`;

  if (komut === "oteller" || komut === "hepsi") {
    console.log("Oteller senkronlanıyor…");
    console.log("  ", await syncHotels(feedId), sure());
  }
  if (komut === "indeks" || komut === "hepsi") {
    const enFazla = arg ? Number(arg) : undefined;
    console.log(`Konum indeksi kuruluyor${enFazla ? ` (en fazla ${enFazla} otel)` : ""}…`);
    const sonuc = await indexHotelLocations({
      feedId,
      enFazla,
      ilerleme: (satir) => console.log(`   ${satir} · ${sure()}`),
    });
    console.log("  ", sonuc, sure());
  }
  if (!["oteller", "indeks", "hepsi"].includes(komut ?? "")) {
    console.error("Kullanım: scripts/etscore.ts oteller | indeks [enFazla] | hepsi");
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error("HATA:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
