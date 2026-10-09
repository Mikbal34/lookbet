// Testlerden sonra test verisini sil. İncelemek için bırakmak: E2E_BIRAK=1.

import { kapat, temizle } from "./veri";

export default async function temizlik() {
  if (process.env.E2E_BIRAK === "1") {
    console.log("[e2e] E2E_BIRAK=1: test verisi bırakıldı");
    return;
  }
  console.log("[e2e] test verisi silindi:", JSON.stringify(await temizle()));
  await kapat();
}
