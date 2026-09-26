"use client";

// Son aramalar — cihazda saklanıyor.
//
// Neden localStorage: şemadaki SearchHistory tablosunun userId alanı boş
// bırakılabiliyor ama anonim satırı geri o cihaza bağlamanın yolu yok.
// Uygulamayı ilk açan kullanıcı çoğunlukla girişsiz olacağı için tabloya
// dayanan bir liste onlarda hiç görünmezdi. Sunucu tarafı SearchHistory'ye
// ayrıca yazıyor (analitik ve ileride kişiselleştirme için); ekrandaki liste
// buradan besleniyor.

const ANAHTAR = "lb_son_aramalar";
const LIMIT = 5;

export interface RecentSearch {
  destination: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  /** Kaydedildiği an — epoch ms. Sıralama için. */
  ts: number;
}

function oku(): RecentSearch[] {
  try {
    const ham = localStorage.getItem(ANAHTAR);
    if (!ham) return [];
    const veri = JSON.parse(ham);
    return Array.isArray(veri) ? (veri as RecentSearch[]) : [];
  } catch {
    // Bozuk kayıt, gizli sekme, kapalı site verisi — hepsinde boş liste.
    return [];
  }
}

export function getRecentSearches(): RecentSearch[] {
  return oku()
    .filter((a) => a && a.destination && a.checkIn && a.checkOut)
    .sort((a, b) => (b.ts ?? 0) - (a.ts ?? 0))
    .slice(0, LIMIT);
}

export function addRecentSearch(
  arama: Omit<RecentSearch, "ts">
): RecentSearch[] {
  if (!arama.destination?.trim()) return getRecentSearches();

  // Aynı destinasyon + tarih ikilisi tekrar aranırsa listeyi şişirmesin,
  // sadece başa taşınsın.
  const anahtar = (a: Omit<RecentSearch, "ts">) =>
    `${a.destination.toLocaleLowerCase("tr")}|${a.checkIn}|${a.checkOut}|${a.adults}`;

  const yeni: RecentSearch = { ...arama, ts: Date.now() };
  const liste = [yeni, ...oku().filter((a) => anahtar(a) !== anahtar(yeni))]
    .slice(0, LIMIT);

  try {
    localStorage.setItem(ANAHTAR, JSON.stringify(liste));
  } catch {
    // Kota dolu ya da yazma kapalı: liste kaydedilmez, akış etkilenmez.
  }
  return liste;
}

export function clearRecentSearches(): void {
  try {
    localStorage.removeItem(ANAHTAR);
  } catch {
    // yoksay
  }
}
