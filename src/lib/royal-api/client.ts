import { prisma } from "@/lib/prisma";
import type { EtsErrorBody, EtsToken } from "./types/etscore.types";

// Etscore (Royal API v1) HTTP istemcisi.
//
// Önceki sürüm başka bir şemaya göre yazılmıştı: giriş /api/auth/login'deydi
// ve yanıtlar {isSuccess, result} zarfıyla geliyordu. Gerçek API'de yollar
// /api/v1/... altında, başarılı yanıtlar zarfsız, hatalar {errorCode,
// errorMessage} şeklinde.
//
// ERİŞİM: Etscore yalnızca beyaz listedeki sunucu IP'sini (IPv4) kabul
// ediyor, önündeki Cloudflare diğer her yeri 403 ile kesiyor.
//   • Canlıda uygulama o sunucuda Docker içinde koşar; konteyner varsayılan
//     olarak IPv4 kullanır.
//   • Geliştirmede ROYAL_API_BASE_URL=http://127.0.0.1:8787 — sunucudaki
//     nginx aracısına SSH tüneliyle gidilir (bkz. deploy.sh / .env.local).

const BASE_URL = process.env.ROYAL_API_BASE_URL || "https://test-api.etscore.com";
const USERNAME = process.env.ROYAL_API_USERNAME || "";
const PASSWORD = process.env.ROYAL_API_PASSWORD || "";

const LOGIN_PATH = "/api/v1/auth-service/auth/login";

/**
 * tr-TR: pansiyon ve yatak adları Türkçe geliyor ("Oda Kahvaltı",
 * "Geniş Çift Kişilik"). Oda adları otelin kendi verisine göre İngilizce
 * kalabiliyor.
 */
const DIL = "tr-TR";

/** Token'ın bitmesine bu kadar kala yenisini al — istek yolda düşmesin. */
const TOKEN_PAYI_MS = 5 * 60 * 1000;

/**
 * Arama sonucu yokken dönen hata kodları — boş liste yerine HTTP 400 geliyor.
 * Hepsi ölçülerek bulundu, dokümanda yok:
 *   0904077  "Aradığınız kriterlere uygun otelde müsaitlik bulunmamaktadır."
 *   0904155  "Verilen tarihlerde fiyat veren bir otel bulunamadı."
 *   0904100  "Arama sonucunda satışa açık bir otel bulunamadı."
 *   0904172  "Aranan otellerde provider ülke tanımı bulunmamaktadır."
 *            Yalnızca paketteki otellerin HİÇBİRİ satılamıyorsa geliyor;
 *            satılabilir bir otel eklenince aynı paket OK dönüyor.
 *
 * Bilinen diğer: 0904168 "Otel kodları listesi 1 ile 250 arasında olmalıdır"
 * (bkz. ETS_ARAMA_PAKETI).
 */
export const ETS_SONUC_YOK = new Set(["0904077", "0904155", "0904100", "0904172"]);

export class EtscoreError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string | null,
    message: string,
    public readonly traceId?: string
  ) {
    super(message);
    this.name = "EtscoreError";
  }

  /** "Bu kriterlere uyan müsaitlik yok" — hata değil, boş sonuç. */
  get musaitlikYok(): boolean {
    return this.code !== null && ETS_SONUC_YOK.has(this.code);
  }

  /** Saniyede 20 istek sınırı aşıldı (HTTP 429). */
  get hizSiniri(): boolean {
    return this.status === 429 || this.code === ETS_HIZ_SINIRI;
  }
}

/**
 * Belgelenmemiş bir uç çağrıldığında: ağa çıkmadan net hata.
 *
 * Eski istemcinin yollarının hiçbiri gerçek API'de yok. Onları çağırmaya
 * devam etmek her seferinde tedarikçiye 404 alacak bir istek atmak demek —
 * hem boşa bekletir hem onların loglarında kötü görünür. Fonksiyonlar ve
 * mock'ları yerinde duruyor; uç belgelenince bu çağrı gerçeğiyle değişecek.
 */
export function belgelenmemis(ne: string): never {
  throw new EtscoreError(
    501,
    "BELGELENMEMIS",
    `${ne}: Etscore dokümanında bu uç yok, belgelenince bağlanacak`
  );
}

/** "1 saniyede 20 adet request gönderebilirsiniz." — HTTP 429. */
export const ETS_HIZ_SINIRI = "0901010";

// ── Hız sınırı ───────────────────────────────────────────────────────────
//
// Etscore saniyede 20 istek kabul ediyor, fazlasını 429 ile reddediyor
// (ölçüldü: 30 eşzamanlı istekten 11'i düştü). Arama paketleri paralel
// gidiyor; geniş bir şehir aramasıyla konum indeksi aynı anda koşunca sınır
// kolayca aşılıyordu.
//
// Her isteğin BAŞLAMA zamanı sıraya konuyor: en az 1000/15 ms arayla. İstekler
// yine paralel uçuşuyor, yalnızca saniyede 15'ten fazlası başlamıyor (20'ye
// pay bırakıldı). Sınırlayıcı süreç içi: uygulama tek süreçte koşuyor.

const SANIYEDE_EN_FAZLA = 15;
const ARALIK_MS = Math.ceil(1000 / SANIYEDE_EN_FAZLA);
let sonrakiBaslangic = 0;

async function siraBekle(): Promise<void> {
  const simdi = Date.now();
  const baslangic = Math.max(simdi, sonrakiBaslangic);
  sonrakiBaslangic = baslangic + ARALIK_MS;
  if (baslangic > simdi) await new Promise((r) => setTimeout(r, baslangic - simdi));
}

/** 429 gelirse en fazla bu kadar yeniden dene (her seferinde ~1 sn bekle). */
const HIZ_TEKRAR = 3;

let tokenPromise: Promise<string> | null = null;

async function getStoredToken(): Promise<string | null> {
  const token = await prisma.royalApiToken.findFirst({
    orderBy: { createdAt: "desc" },
  });

  if (token && token.expiresAt.getTime() - TOKEN_PAYI_MS > Date.now()) {
    return token.accessToken;
  }
  return null;
}

async function login(): Promise<string> {
  await siraBekle();
  const res = await fetch(`${BASE_URL}${LOGIN_PATH}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept-Language": DIL },
    body: JSON.stringify({ username: USERNAME, password: PASSWORD }),
  });

  if (!res.ok) {
    // 403 + HTML = Cloudflare IP engeli; gövdeyi mesaja koymak yerine
    // ne olduğunu söyle.
    const ipEngeli =
      res.status === 403 && (res.headers.get("content-type") ?? "").includes("text/html");
    throw new EtscoreError(
      res.status,
      null,
      ipEngeli
        ? "Etscore erişimi engellendi (IP beyaz listede değil ya da IPv6 ile çıkıldı)"
        : `Etscore girişi başarısız: HTTP ${res.status}`
    );
  }

  const data = (await res.json()) as EtsToken;

  // Süre yanıttan: doküman iki yerde iki farklı süre söylüyor (4 sa, 5 sa),
  // gerçek yanıt 12 saat. Sabit yazmak ilk değişiklikte bozulurdu.
  await prisma.royalApiToken.create({
    data: {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    },
  });

  return data.access_token;
}

async function getAccessToken(): Promise<string> {
  const stored = await getStoredToken();
  if (stored) return stored;

  // Aynı anda gelen istekler tek bir girişi paylaşsın.
  if (!tokenPromise) {
    tokenPromise = login().finally(() => {
      tokenPromise = null;
    });
  }
  return tokenPromise;
}

export interface EtsRequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  /** X-Currency başlığı — arama bunu istiyor. */
  currency?: string;
  retry?: boolean;
  /** 429 sonrası kaçıncı deneme (içeride kullanılıyor). */
  hizDenemesi?: number;
}

async function request<T>(path: string, options: EtsRequestOptions = {}): Promise<T> {
  const { method = "GET", body, currency, retry = true, hizDenemesi = 0 } = options;
  const token = await getAccessToken();

  await siraBekle();
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "Accept-Language": DIL,
      Authorization: `Bearer ${token}`,
      ...(currency ? { "X-Currency": currency } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // Token süresi dolmuş ya da iptal edilmiş: bir kez taze token ile dene.
  if (res.status === 401 && retry) {
    await prisma.royalApiToken.deleteMany({});
    return request<T>(path, { ...options, retry: false });
  }

  const text = await res.text();

  if (!res.ok) {
    let code: string | null = null;
    let message = `Etscore HTTP ${res.status}`;
    let traceId: string | undefined;
    try {
      const err = JSON.parse(text) as EtsErrorBody;
      code = err.errorCode ?? null;
      message = err.errorMessage ?? message;
      traceId = err.traceId;
    } catch {
      message = `${message}: ${text.slice(0, 200)}`;
    }
    const hata = new EtscoreError(res.status, code, message, traceId);

    // Sıraya rağmen sınır aşıldıysa (ör. aynı hesabı kullanan başka bir
    // süreç) biraz bekleyip yeniden dene.
    if (hata.hizSiniri && hizDenemesi < HIZ_TEKRAR) {
      await new Promise((r) => setTimeout(r, 1100 * (hizDenemesi + 1)));
      return request<T>(path, { ...options, hizDenemesi: hizDenemesi + 1 });
    }
    throw hata;
  }

  return (text ? JSON.parse(text) : null) as T;
}

export const royalApiClient = {
  get: <T>(path: string, opts?: Omit<EtsRequestOptions, "method" | "body">) =>
    request<T>(path, { ...opts, method: "GET" }),
  post: <T>(path: string, body: unknown, opts?: Omit<EtsRequestOptions, "method" | "body">) =>
    request<T>(path, { ...opts, method: "POST", body }),
  put: <T>(path: string, body: unknown) => request<T>(path, { method: "PUT", body }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
