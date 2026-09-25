/**
 * Türkçe karakterleri katlar ve küçültür.
 *
 * Postgres'in büyük/küçük harf duyarsız araması (ILIKE) "istanbul"u
 * "İstanbul" ile eşleştiriyor ama "AĞRI"yı "Ağrı" ile eşleştirmiyor:
 * noktasız ı'nın büyüğü I, onun küçüğü i oluyor, ı değil. Kırşehir, Iğdır,
 * Kırklareli aynı durumda. Ayrıca mobilde çoğu kişi "cesme", "mugla" diye
 * Türkçe karakter kullanmadan yazıyor. İki taraf da aynı şekilde
 * katlanınca hepsi eşleşiyor.
 *
 * Aynı dönüşüm SQL tarafında TR_KATLA ile yapılıyor; ikisi birebir aynı
 * kalmalı.
 */
export function katla(s: string): string {
  return s
    .replace(/[İIı]/g, "i")
    .replace(/[ğĞ]/g, "g")
    .replace(/[üÜ]/g, "u")
    .replace(/[şŞ]/g, "s")
    .replace(/[öÖ]/g, "o")
    .replace(/[çÇ]/g, "c")
    .toLowerCase()
    .trim();
}
