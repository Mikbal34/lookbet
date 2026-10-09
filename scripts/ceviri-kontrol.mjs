// Türkçe ve İngilizce metin dosyalarının aynı anahtarları taşıdığını ve ICU
// değişkenlerinin ({sayi} gibi) uyuştuğunu denetler.
// Kullanım: node scripts/ceviri-kontrol.mjs
import { readdirSync, readFileSync } from "node:fs";

const oku = (dil, dosya) => JSON.parse(readFileSync(`messages/${dil}/${dosya}`, "utf8"));
const anahtarlar = (o, on = "") =>
  Object.entries(o).flatMap(([k, v]) => (v && typeof v === "object" ? anahtarlar(v, `${on}${k}.`) : [[`${on}${k}`, String(v)]]));
// Düz {degisken} ve plural/select başlıkları ({sayi, plural, …}).
const degiskenler = (s) => [...new Set([...s.matchAll(/\{\s*(\w+)\s*(?:,|\})/g)].map((m) => m[1]))].sort().join(",");

let hata = 0;
for (const dosya of readdirSync("messages/tr").filter((f) => f.endsWith(".json"))) {
  const tr = new Map(anahtarlar(oku("tr", dosya)));
  const en = new Map(anahtarlar(oku("en", dosya)));
  for (const [k, v] of tr) {
    if (!en.has(k)) { console.log(`EKSİK en ${dosya}: ${k}`); hata++; continue; }
    if (degiskenler(v) !== degiskenler(en.get(k))) { console.log(`DEĞİŞKEN ${dosya}: ${k}  tr{${degiskenler(v)}} en{${degiskenler(en.get(k))}}`); hata++; }
  }
  for (const k of en.keys()) if (!tr.has(k)) { console.log(`FAZLA en ${dosya}: ${k}`); hata++; }
}
console.log(hata ? `${hata} sorun` : "Çeviri dosyaları uyumlu");
process.exit(hata ? 1 : 0);
