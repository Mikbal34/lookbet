// Basit hız sınırı: anahtar başına sabit pencerede en fazla N olay.
// Uygulama tek süreçte (standalone Docker) koştuğu için bellek yeterli; birden
// fazla kopyaya çıkılırsa sayaçlar paylaşılmaz, o zaman Redis/DB gerekir.
// nginx'te ayrıca IP başına limit_req var (nginx/nginx.conf); bu katman
// e-posta gibi IP'den bağımsız anahtarlar için.

type Kova = { sayi: number; bitis: number };

const kovalar = new Map<string, Kova>();
let sonTemizlik = 0;

function temizle(simdi: number) {
  if (simdi - sonTemizlik < 60_000) return;
  sonTemizlik = simdi;
  for (const [k, v] of kovalar) if (v.bitis <= simdi) kovalar.delete(k);
}

/** Olayı sayar; sınır aşıldıysa false ve kaç saniye beklenmesi gerektiğini döner. */
export function hizSiniri(anahtar: string, sinir: number, pencereMs: number): { izin: boolean; bekle: number } {
  const simdi = Date.now();
  temizle(simdi);
  const k = kovalar.get(anahtar);
  if (!k || k.bitis <= simdi) {
    kovalar.set(anahtar, { sayi: 1, bitis: simdi + pencereMs });
    return { izin: true, bekle: 0 };
  }
  if (k.sayi >= sinir) return { izin: false, bekle: Math.ceil((k.bitis - simdi) / 1000) };
  k.sayi++;
  return { izin: true, bekle: 0 };
}

/** Sayacı artırmadan sınırda mı diye bakar (başarısız denemeleri sayan kilitler için). */
export function sinirdaMi(anahtar: string, sinir: number): { dolu: boolean; bekle: number } {
  const simdi = Date.now();
  const k = kovalar.get(anahtar);
  if (!k || k.bitis <= simdi) return { dolu: false, bekle: 0 };
  return { dolu: k.sayi >= sinir, bekle: Math.ceil((k.bitis - simdi) / 1000) };
}

export function sifirla(anahtar: string) {
  kovalar.delete(anahtar);
}

/**
 * İstemci IP'si. Uygulama yalnızca 127.0.0.1'e bağlı, önünde nginx var ve
 * X-Real-IP'yi $remote_addr ile eziyor; istemcinin yazdığı değer geçmiyor.
 * X-Forwarded-For'un ilk öğesi istemci tarafından uydurulabilir, kullanılmıyor.
 */
export function istemciIp(basliklar: Headers | Record<string, string | string[] | undefined> | undefined): string | null {
  if (!basliklar) return null;
  const al = (ad: string) => {
    if (basliklar instanceof Headers) return basliklar.get(ad);
    const v = basliklar[ad];
    return Array.isArray(v) ? v[0] : v;
  };
  // Başlık yoksa (yerel geliştirme) IP sınırı uygulanmaz: herkesi tek bir
  // "bilinmeyen" kovada toplayıp birlikte kilitlemek yerine.
  return al("x-real-ip")?.trim() || null;
}
