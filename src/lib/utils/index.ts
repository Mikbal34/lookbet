export { cn } from "./cn";

export function formatCurrency(amount: number, currency: string = "EUR"): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date));
}

export function formatShortDate(date: Date | string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date));
}

/**
 * Tarih aralığını mobil çubuklara sığacak kısalıkta yazar:
 *   aynı ay   → "10–13 Eyl"
 *   farklı ay → "28 Ağu – 3 Eyl"
 *   farklı yıl → "28 Ara 2026 – 3 Oca 2027"
 * Yıl, içinde bulunulan yıldan farklıysa sona eklenir.
 * Geçersiz girdide boş string döner (çağıran yerlerde koşullu render var).
 */
export function formatDateRange(
  checkIn: Date | string,
  checkOut: Date | string
): string {
  const a = new Date(checkIn);
  const b = new Date(checkOut);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return "";

  const gunAy = new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
  });
  const gunAyYil = new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  // Yıllar farklıysa iki tarafa da yıl yazmak tek doğru okunuş.
  if (a.getFullYear() !== b.getFullYear()) {
    return `${gunAyYil.format(a)} – ${gunAyYil.format(b)}`;
  }

  const yil =
    a.getFullYear() !== new Date().getFullYear() ? ` ${a.getFullYear()}` : "";

  return a.getMonth() === b.getMonth()
    ? `${a.getDate()}–${gunAy.format(b)}${yil}`
    : `${gunAy.format(a)} – ${gunAy.format(b)}${yil}`;
}

export function generateClientReferenceId(): string {
  return `LB-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

export function getNightCount(checkIn: Date | string, checkOut: Date | string): number {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}
