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
//   npx tsx --env-file=.env.local scripts/etscore.ts icerik [enFazla]
//       Otel detayından fotoğraf, yıldız, adres, açıklama ve KONUM yazar
//       (konum fiyattan bağımsız: satışta olmayan otel de şehrine bağlanır).
//       Yalnızca fotoğrafı ya da konumu eksik oteller; kaldığı yerden devam eder.
//
//   npx tsx --env-file=.env.local scripts/etscore.ts revizyon [gün]
//       Son günlerde (varsayılan 2, en fazla 6) eklenen, değişen, silinen
//       otelleri uygular. Sunucuda her gece cron çalıştırır.
//
//   npx tsx --env-file=.env.local scripts/etscore.ts listeler
//       Pansiyon tipleri, otel olanakları ve oda özellikleri (Türkçe).
//
//   npx tsx --env-file=.env.local scripts/etscore.ts hepsi
//       Sırayla: listeler, oteller, indeks, içerik.

import { prisma } from "@/lib/prisma";
import {
  indexHotelLocations,
  syncBoardTypes,
  syncFacilities,
  syncHotelContent,
  syncHotels,
  syncRevisions,
  syncRoomAttributes,
} from "@/lib/royal-api/sync";

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

  if (komut === "listeler" || komut === "hepsi") {
    console.log("Listeler senkronlanıyor…");
    console.log("   pansiyon:", await syncBoardTypes(), "· olanak:", await syncFacilities(), "· oda özelliği:", await syncRoomAttributes(), sure());
  }
  if (komut === "oteller" || komut === "hepsi") {
    console.log("Oteller senkronlanıyor…");
    console.log("  ", await syncHotels(feedId), sure());
  }
  if (komut === "indeks" || komut === "hepsi") {
    const enFazla = komut === "indeks" && arg ? Number(arg) : undefined;
    console.log(`Konum indeksi kuruluyor${enFazla ? ` (en fazla ${enFazla} otel)` : ""}…`);
    const sonuc = await indexHotelLocations({
      feedId,
      enFazla,
      ilerleme: (satir) => console.log(`   ${satir} · ${sure()}`),
    });
    console.log("  ", sonuc, sure());
  }
  if (komut === "icerik" || komut === "hepsi") {
    const enFazla = komut === "icerik" && arg ? Number(arg) : undefined;
    console.log(`Otel içeriği senkronlanıyor${enFazla ? ` (en fazla ${enFazla} otel)` : ""}…`);
    const sonuc = await syncHotelContent({ enFazla, ilerleme: (satir) => console.log(`   ${satir} · ${sure()}`) });
    console.log("  ", { ...sonuc, hatalar: sonuc.hatalar.slice(0, 10) }, sure());
  }
  if (komut === "revizyon") {
    console.log("Revizyonlar uygulanıyor…");
    const sonuc = await syncRevisions({ gun: arg ? Number(arg) : 2, ilerleme: (satir) => console.log(`   ${satir} · ${sure()}`) });
    console.log("  ", sonuc, sure());
  }
  if (!["listeler", "oteller", "indeks", "icerik", "revizyon", "hepsi"].includes(komut ?? "")) {
    console.error("Kullanım: scripts/etscore.ts listeler | oteller | indeks [enFazla] | icerik [enFazla] | revizyon [gün] | hepsi");
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error("HATA:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
