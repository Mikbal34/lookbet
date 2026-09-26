// Testlerden önce: sunucu gerçekten sahte tedarikçiyle mi çalışıyor (gerçek
// Etscore'a rezervasyon gitmesin), eski test verisini sil, yöneticiyi hazırla.

import type { FullConfig } from "@playwright/test";
import { kapat, temizle, yoneticiHazirla } from "./veri";
import { gunSonra } from "./yardimci";

export default async function kurulum(config: FullConfig) {
  const taban = config.projects[0]?.use.baseURL ?? "http://localhost:3100";
  const r = await fetch(`${taban}/api/rooms/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hotelCode: "HTL001", checkIn: gunSonra(30), checkOut: gunSonra(32), nationality: "TR", currency: "EUR", rooms: [{ adult: 2 }] }),
  });
  const metin = await r.text();
  if (!r.ok || !metin.includes("mock-")) {
    throw new Error(
      `Sunucu sahte tedarikçiyle çalışmıyor (ROYAL_API_MOCK=true değil). Gerçek Etscore'a rezervasyon gitmesin diye testler durdu. Yanıt ${r.status}: ${metin.slice(0, 200)}`
    );
  }
  process.env.E2E_KOSU = Date.now().toString(36);
  console.log("[e2e] eski test verisi silindi:", JSON.stringify(await temizle()));
  await yoneticiHazirla();
  await kapat();
}
