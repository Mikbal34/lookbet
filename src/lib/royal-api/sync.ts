import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { getCurrencies, getBoardTypes, getFacilities, getRoomAttributes } from "./content";
import { getLocations } from "./location";
import { getHotelList, etsOtelAra, etsOtelDetayiGetir } from "./hotel";
import { etsKonumTuru, etsOtelDetayi } from "./etscore-map";
import { EtscoreError, royalApiClient } from "./client";
import type { EtsRevizyonSayfasi, EtsSearchHotel } from "./types/etscore.types";

export async function syncCurrencies() {
  const currencies = await getCurrencies();
  for (const c of currencies) {
    await prisma.currency.upsert({
      where: { code: c.code },
      update: { name: c.name },
      create: { code: c.code, name: c.name },
    });
  }
  return currencies.length;
}

export async function syncBoardTypes() {
  const boardTypes = await getBoardTypes();
  for (const b of boardTypes) {
    await prisma.boardType.upsert({
      where: { code: b.code },
      update: { name: b.name },
      create: { code: b.code, name: b.name },
    });
  }
  return boardTypes.length;
}

export async function syncFacilities() {
  const facilities = await getFacilities();
  for (const f of facilities) {
    await prisma.hotelFacility.upsert({
      where: { externalId: String(f.id) },
      update: { category: f.categoryName, name: f.name },
      create: { externalId: String(f.id), category: f.categoryName, name: f.name },
    });
  }
  return facilities.length;
}

export async function syncRoomAttributes() {
  const attrs = await getRoomAttributes();
  for (const a of attrs) {
    await prisma.roomAttribute.upsert({
      where: { externalId: String(a.id) },
      update: { category: a.categoryName, name: a.name },
      create: { externalId: String(a.id), category: a.categoryName, name: a.name },
    });
  }
  return attrs.length;
}

export async function syncLocations() {
  const locations = await getLocations();
  for (const loc of locations) {
    await prisma.location.upsert({
      where: { externalId: String(loc.id) },
      update: {
        name: loc.name,
        parentId: loc.parentId
          ? (await prisma.location.findUnique({ where: { externalId: String(loc.parentId) } }))?.id
          : null,
        type: (loc.type?.toUpperCase() as "COUNTRY" | "CITY" | "DISTRICT" | "AREA") || "CITY",
      },
      create: {
        externalId: String(loc.id),
        name: loc.name,
        parentId: loc.parentId
          ? (await prisma.location.findUnique({ where: { externalId: String(loc.parentId) } }))?.id
          : null,
        type: (loc.type?.toUpperCase() as "COUNTRY" | "CITY" | "DISTRICT" | "AREA") || "CITY",
      },
    });
  }
  return locations.length;
}

/**
 * Otel listesini veritabanına yazar — BOŞ GELEN ALANLARA DOKUNMADAN.
 *
 * Etscore'un otel listesi yalnızca ad ve kod veriyor. Yıldız, adres,
 * fotoğraf, olanaklar bizde duruyor ve kalmalı; eski senkron her alanı
 * yanıttan yazdığı için bunları boşlukla ezerdi. Artık yalnızca dolu gelen
 * alanlar yazılıyor: mock modda her alan dolu gelir (tam güncelleme),
 * Etscore'da yalnızca ad.
 *
 * 15.679 otel tek tek upsert edilseydi dakikalar sürerdi: yeniler tek
 * createMany ile ekleniyor, mevcutlarda yalnızca adı değişenler güncelleniyor.
 */
export async function syncHotels(feedId: string) {
  const hotels = await getHotelList({ feedId });

  const mevcut = new Map(
    (await prisma.hotel.findMany({ select: { hotelCode: true, name: true } })).map((h) => [
      h.hotelCode,
      h.name,
    ])
  );

  const lokasyonId = async (id: number) =>
    id
      ? (await prisma.location.findUnique({ where: { externalId: String(id) } }))?.id
      : undefined;

  const dolu = <T>(v: T | null | undefined): v is T =>
    v !== null && v !== undefined && v !== "" && v !== 0 && !(Array.isArray(v) && v.length === 0);

  let eklenen = 0;
  let guncellenen = 0;
  const yeniler: Prisma.HotelCreateManyInput[] = [];

  for (const h of hotels) {
    if (!h.hotelCode || !h.name) continue;
    const alanlar = {
      name: h.name,
      ...(dolu(h.stars) && { stars: h.stars }),
      ...(dolu(h.address) && { address: h.address }),
      ...(dolu(h.latitude) && { latitude: h.latitude }),
      ...(dolu(h.longitude) && { longitude: h.longitude }),
      ...(dolu(h.images) && { images: h.images }),
      ...(dolu(h.facilities) && { facilities: h.facilities }),
      ...(dolu(h.thumbnailImage) && { thumbnailImage: h.thumbnailImage }),
      ...(dolu(h.phone) && { phone: h.phone }),
      ...(dolu(h.email) && { email: h.email }),
    };
    const locId = await lokasyonId(h.locationId);

    if (!mevcut.has(h.hotelCode)) {
      yeniler.push({ hotelCode: h.hotelCode, ...alanlar, ...(locId && { locationId: locId }) });
      eklenen++;
      continue;
    }
    // Yalnızca ad geldiyse ve ad aynıysa yazacak bir şey yok.
    const yalnizcaAd = Object.keys(alanlar).length === 1 && !locId;
    if (yalnizcaAd && mevcut.get(h.hotelCode) === h.name) continue;

    await prisma.hotel.update({
      where: { hotelCode: h.hotelCode },
      data: { ...alanlar, ...(locId && { locationId: locId }) },
    });
    guncellenen++;
  }

  if (yeniler.length) await prisma.hotel.createMany({ data: yeniler, skipDuplicates: true });

  return { toplam: hotels.length, eklenen, guncellenen };
}

// ── Konum indeksi ────────────────────────────────────────────────────────

/** Etscore konumları mock kimlikleriyle çakışmasın (ikisinde de id: 1 var). */
const etsKonumAnahtari = (id: number) => `ets:${id}`;

/** Konum zincirinde üstten alta sıra; zincir bu sıraya göre kurulur. */
const KONUM_SIRASI: Record<string, number> = { COUNTRY: 0, REGION: 1, CITY: 2, TOWN: 3, CUSTOMREGION: 4 };

/**
 * Etscore konum zincirini Location tablosuna yazar, en alttaki konumun
 * kimliğini döner. Her halka bir öncekinin çocuğu. `onbellek`: Etscore id →
 * Location.id; aynı taramada aynı konum tekrar yazılmasın.
 *
 * Zincir sıraya diziliyor: arama COUNTRY→…→CUSTOMREGION sırasıyla veriyor,
 * oda araması tersini; detay ise düz sırayla. Türe göre dizmek hepsinde
 * aynı ağacı kuruyor.
 */
// İçerik senkronu otelleri paralel işliyor; iki otel aynı yeni konumu aynı
// anda yazarsa upsert yarışıp benzersizlik hatası verir. Zincir yazımları
// sırayla: kısa ve çoğu önbellekten döndüğü için yavaşlatmıyor.
let konumKilidi: Promise<unknown> = Promise.resolve();

function konumZinciriniYaz(
  zincir: { id: number; name: string; type: string }[],
  onbellek: Map<number, string>,
  sayac?: { konum: number }
): Promise<string | null> {
  const is = konumKilidi.then(() => zinciriYaz(zincir, onbellek, sayac));
  konumKilidi = is.catch(() => undefined);
  return is;
}

async function zinciriYaz(
  zincir: { id: number; name: string; type: string }[],
  onbellek: Map<number, string>,
  sayac?: { konum: number }
): Promise<string | null> {
  const sirali = [...zincir].sort(
    (a, b) => (KONUM_SIRASI[a.type] ?? 9) - (KONUM_SIRASI[b.type] ?? 9)
  );
  let ustId: string | null = null;
  for (const d of sirali) {
    if (!d.id || !d.name) continue;
    let id = onbellek.get(d.id);
    if (!id) {
      const kayit: { id: string } = await prisma.location.upsert({
        where: { externalId: etsKonumAnahtari(d.id) },
        update: { name: d.name, type: etsKonumTuru(d.type), parentId: ustId },
        create: {
          externalId: etsKonumAnahtari(d.id),
          name: d.name,
          type: etsKonumTuru(d.type),
          parentId: ustId,
        },
        select: { id: true },
      });
      id = kayit.id;
      onbellek.set(d.id, id);
      if (sayac) sayac.konum++;
    }
    ustId = id;
  }
  return ustId;
}

/** İndekste bir seferde aranan otel: 3 paket, paralel ~4 sn. */
const INDEKS_DILIMI = 600;

/**
 * "Hangi otel hangi şehirde" indeksini kurar.
 *
 * Etscore şehre göre arama sunmuyor; arama yalnızca otel kodu kabul ediyor ve
 * otel listesinde konum yok. Ama arama yanıtındaki her otel kendi konum
 * zincirini taşıyor: Türkiye → Marmara → İstanbul → Anadolu Yakası →
 * Ümraniye. Oteller 200'lük paketlerle aranıp bu zincir Location tablosuna,
 * otelin en alt konumu hotel.locationId'ye yazılıyor. Arama rotası şehri
 * bu tablodan otel kodlarına çeviriyor.
 *
 * Yalnızca o tarihlerde müsaitliği olan oteller dönüyor (test ortamında
 * %9–16). Kapsamı artırmak için birkaç tarih aralığı sırayla deneniyor;
 * her turda sadece henüz eşleşmemiş oteller soruluyor.
 */
export async function indexHotelLocations(opts: {
  feedId: string;
  /** Kaç gün sonrası denensin. Her biri 1 gece, 2 yetişkin. */
  gunler?: number[];
  /** Geliştirmede sınırlamak için. */
  enFazla?: number;
  /** true: konumu olan otelleri de yeniden tara. */
  hepsi?: boolean;
  /** Her dilimden sonra çağrılır — betik ilerlemeyi yazsın diye. */
  ilerleme?: (satir: string) => void;
}) {
  const { feedId, gunler = [30, 75, 150], enFazla, hepsi = false } = opts;

  const adaylar = await prisma.hotel.findMany({
    where: hepsi ? {} : { locationId: null, isActive: true },
    select: { hotelCode: true, latitude: true },
    orderBy: { hotelCode: "asc" },
    ...(enFazla ? { take: enFazla } : {}),
  });

  const bekleyen = new Set(adaylar.map((h) => h.hotelCode));
  const koordinatiVar = new Set(adaylar.filter((h) => h.latitude).map((h) => h.hotelCode));
  const istatistik = {
    taranan: bekleyen.size,
    eslesen: 0,
    konum: 0,
    turlar: [] as string[],
    hatalar: [] as string[],
  };
  const konumCache = new Map<number, string>(); // Etscore id → Location.id

  for (const gun of gunler) {
    if (bekleyen.size === 0) break;
    const giris = new Date(Date.now() + gun * 86_400_000).toISOString().slice(0, 10);
    const cikis = new Date(Date.now() + (gun + 1) * 86_400_000).toISOString().slice(0, 10);
    const istek = {
      feedId,
      nationality: "TR",
      checkIn: giris,
      checkOut: cikis,
      currency: "EUR",
      rooms: [{ adult: 2 }],
    };

    // Kodlar dilim dilim aranıp her dilimden sonra yazılıyor. Önceden tüm
    // tur tek aramaydı: 15 bin otelde tek bir beklenmedik hata (Etscore'un
    // belgelemediği yeni bir "sonuç yok" kodu gibi) saatlerce süren taramayı
    // hiçbir şey yazmadan bitiriyordu. Şimdi o dilim atlanıyor, ilerleme
    // kalıcı, yeniden çalıştırmak kaldığı yerden devam ediyor.
    const kodlar = [...bekleyen];
    let turda = 0;
    let atlanan = 0;
    for (let i = 0; i < kodlar.length; i += INDEKS_DILIMI) {
      let oteller: EtsSearchHotel[];
      try {
        oteller = await etsOtelAra(istek, kodlar.slice(i, i + INDEKS_DILIMI), false);
      } catch (e) {
        atlanan++;
        const kod = e instanceof EtscoreError ? ` [${e.status} ${e.code}]` : "";
        istatistik.hatalar.push(`${giris} dilim ${i / INDEKS_DILIMI}${kod}: ${e instanceof Error ? e.message : e}`);
        continue;
      }

      for (const o of oteller) {
        if (!bekleyen.has(o.hotelCode)) continue;

        const ustId = await konumZinciriniYaz(o.destinationCodes ?? [], konumCache, istatistik);

        await prisma.hotel.update({
          where: { hotelCode: o.hotelCode },
          data: {
            ...(ustId && { locationId: ustId }),
            // Koordinat bizde yoksa Etscore'unkini yaz; varsa dokunma.
            ...(!koordinatiVar.has(o.hotelCode) &&
              o.geoLocation && { latitude: o.geoLocation.lat, longitude: o.geoLocation.lon }),
          },
        });
        bekleyen.delete(o.hotelCode);
        istatistik.eslesen++;
        turda++;
      }
      opts.ilerleme?.(`${giris} ${Math.min(i + INDEKS_DILIMI, kodlar.length)}/${kodlar.length} · eşleşen ${istatistik.eslesen}`);
    }
    istatistik.turlar.push(`${giris}: ${turda} otel${atlanan ? `, ${atlanan} dilim atlandı` : ""}`);
  }

  return istatistik;
}

/**
 * Otel içeriğini (fotoğraf, yıldız, adres, açıklama, olanaklar) ve konumunu
 * Etscore'un otel detayından veritabanına yazar.
 *
 * Arama sonucu kartları içeriği bizim veritabanımızdan alıyor (arama ucu
 * fotoğraf ve yıldız vermiyor). Detay konum zincirini de veriyor ve —
 * aramadan farklı olarak — fiyattan bağımsız: satışta olmayan otel de
 * şehrine bağlanıyor. Aramaya dayalı indeks yalnızca o tarihlerde fiyat
 * veren otelleri bağlayabiliyordu (%8).
 *
 * Varsayılan: fotoğrafı ya da konumu eksik oteller. Boş gelen alan mevcut
 * değeri ezmez; konumu olan otelin konumuna dokunulmaz.
 */
type IcerikIstatistigi = {
  yazilan: number;
  fotografli: number;
  konumlanan: number;
  konum: number;
  pasif: number;
  hatalar: string[];
};

const yeniIstatistik = (): IcerikIstatistigi => ({
  yazilan: 0,
  fotografli: 0,
  konumlanan: 0,
  konum: 0,
  pasif: 0,
  hatalar: [],
});

/**
 * Tek otelin detayını alıp veritabanına yazar. Otel satırı yoksa oluşturur
 * (revizyonda yeni eklenen otel).
 *
 * `taze`: önbelleği atla — revizyon "bu otel değişti" dediğinde.
 * Pasif otel işaretlenir; hata istatistiğe yazılır, fırlatılmaz.
 */
async function oteliDetaydanYaz(
  hotelCode: string,
  konumCache: Map<number, string>,
  ist: IcerikIstatistigi,
  taze = false
): Promise<void> {
  try {
    const ham = await etsOtelDetayiGetir(hotelCode, taze);
    const d = etsOtelDetayi(ham);
    const urller = d.images.map((g) => g.url);
    const mevcut = await prisma.hotel.findUnique({
      where: { hotelCode },
      select: { latitude: true, locationId: true },
    });

    const konumId = mevcut?.locationId
      ? null
      : await konumZinciriniYaz(
          (ham.locationStructure ?? []).map((l) => ({ id: l.id, name: l.name, type: l.locationType })),
          konumCache,
          ist
        );
    if (konumId) ist.konumlanan++;

    const alanlar = {
      ...(d.name && { name: d.name }),
      ...(d.stars && { stars: d.stars }),
      ...(d.address && { address: d.address }),
      ...(d.description && { description: d.description }),
      ...(urller.length && { images: urller, thumbnailImage: urller[0] }),
      ...(d.facilities.length && { facilities: d.facilities.map((f) => f.id) }),
      ...(d.phone && { phone: d.phone }),
      ...(d.email && { email: d.email }),
      ...(!mevcut?.latitude && d.latitude && { latitude: d.latitude, longitude: d.longitude }),
      ...(konumId && { locationId: konumId }),
      isActive: true,
    };
    await prisma.hotel.upsert({
      where: { hotelCode },
      update: alanlar,
      create: { hotelCode, name: d.name || hotelCode, ...alanlar },
    });
    ist.yazilan++;
    if (urller.length) ist.fotografli++;
  } catch (e) {
    // Pasif otel: işaretle, bir daha taranmasın ve aramada çıkmasın.
    if (e instanceof EtscoreError && e.otelAktifDegil) {
      await prisma.hotel.updateMany({ where: { hotelCode }, data: { isActive: false } });
      ist.pasif++;
      return;
    }
    const kod = e instanceof EtscoreError ? ` [${e.status} ${e.code}]` : "";
    ist.hatalar.push(`${hotelCode}${kod}: ${e instanceof Error ? e.message : e}`);
  }
}

/** Kodları 5'erli paralel işler; ilerlemeyi 100 otelde bir bildirir. */
async function detaylariYaz(
  kodlar: string[],
  ist: IcerikIstatistigi,
  opts: { taze?: boolean; ilerleme?: (satir: string) => void } = {}
) {
  const PARALEL = 5;
  const konumCache = new Map<number, string>();
  for (let i = 0; i < kodlar.length; i += PARALEL) {
    await Promise.all(
      kodlar.slice(i, i + PARALEL).map((k) => oteliDetaydanYaz(k, konumCache, ist, opts.taze))
    );
    if ((i / PARALEL) % 20 === 19 || i + PARALEL >= kodlar.length) {
      opts.ilerleme?.(
        `${Math.min(i + PARALEL, kodlar.length)}/${kodlar.length} · fotoğraflı ${ist.fotografli} · konumlanan ${ist.konumlanan} · pasif ${ist.pasif}`
      );
    }
  }
}

export async function syncHotelContent(opts: {
  enFazla?: number;
  /** true: fotoğrafı ve konumu olanları, pasifleri de tara. */
  hepsi?: boolean;
  ilerleme?: (satir: string) => void;
} = {}) {
  const { enFazla, hepsi = false } = opts;
  const oteller = await prisma.hotel.findMany({
    where: hepsi ? {} : { isActive: true, OR: [{ locationId: null }, { thumbnailImage: null }] },
    select: { hotelCode: true },
    orderBy: { hotelCode: "asc" },
    ...(enFazla ? { take: enFazla } : {}),
  });
  const ist = yeniIstatistik();
  await detaylariYaz(
    oteller.map((h) => h.hotelCode),
    ist,
    { ilerleme: opts.ilerleme }
  );
  return { taranan: oteller.length, ...ist };
}

// ── Fiyat verenler (gece taraması) ───────────────────────────────────────

/**
 * Tüm aktif otelleri birkaç tarihte aratıp fiyat verenlerin
 * `lastPricedAt`'ini günceller. Geniş şehir aramaları 600 kodu buna göre
 * seçiyor. Konumu olmayan fiyatlı otel aramanın konum zinciriyle bağlanır.
 *
 * ~14 bin otel = 70 paket × tarih sayısı; 15 istek/sn sınırıyla ~5–10 dk.
 */
export async function syncPricedHotels(opts: {
  feedId: string;
  gunler?: number[];
  ilerleme?: (satir: string) => void;
}) {
  const { feedId, gunler = [14, 45, 90] } = opts;
  const oteller = await prisma.hotel.findMany({
    where: { isActive: true },
    select: { hotelCode: true, locationId: true },
    orderBy: { hotelCode: "asc" },
  });
  const konumsuz = new Set(oteller.filter((h) => !h.locationId).map((h) => h.hotelCode));
  const kodlar = oteller.map((h) => h.hotelCode);
  const goruldu = new Set<string>();
  const konumCache = new Map<number, string>();
  const ist = { taranan: kodlar.length, fiyatli: 0, konumlanan: 0, konum: 0, hatalar: [] as string[] };

  for (const gun of gunler) {
    const giris = new Date(Date.now() + gun * 86_400_000).toISOString().slice(0, 10);
    const cikis = new Date(Date.now() + (gun + 1) * 86_400_000).toISOString().slice(0, 10);
    const istek = { feedId, nationality: "TR", checkIn: giris, checkOut: cikis, currency: "EUR", rooms: [{ adult: 2 }] };

    for (let i = 0; i < kodlar.length; i += INDEKS_DILIMI) {
      let bulunan: EtsSearchHotel[];
      try {
        bulunan = await etsOtelAra(istek, kodlar.slice(i, i + INDEKS_DILIMI), false);
      } catch (e) {
        const kod = e instanceof EtscoreError ? ` [${e.status} ${e.code}]` : "";
        ist.hatalar.push(`${giris} dilim ${i / INDEKS_DILIMI}${kod}: ${e instanceof Error ? e.message : e}`);
        continue;
      }
      const yeni = bulunan.map((o) => o.hotelCode).filter((k) => !goruldu.has(k));
      if (yeni.length) {
        await prisma.hotel.updateMany({ where: { hotelCode: { in: yeni } }, data: { lastPricedAt: new Date() } });
        yeni.forEach((k) => goruldu.add(k));
      }
      for (const o of bulunan) {
        if (!konumsuz.has(o.hotelCode)) continue;
        const konumId = await konumZinciriniYaz(o.destinationCodes ?? [], konumCache, ist);
        if (konumId) {
          await prisma.hotel.update({ where: { hotelCode: o.hotelCode }, data: { locationId: konumId } });
          konumsuz.delete(o.hotelCode);
          ist.konumlanan++;
        }
      }
    }
    ist.fiyatli = goruldu.size;
    opts.ilerleme?.(`${giris}: toplam fiyat veren ${goruldu.size}`);
  }
  return ist;
}

// ── Revizyonlar (günlük artımlı güncelleme) ──────────────────────────────

const REVIZYON = "/api/v1/generic-api-service/content/hotel/revision";

/** Bir türdeki tüm revizyonlar (sayfalı). */
async function revizyonlar(
  sinceDate: string,
  revisionType: "INSERT" | "UPDATE" | "DELETE"
): Promise<string[]> {
  const kodlar: string[] = [];
  for (let sayfa = 0; sayfa < 200; sayfa++) {
    const d = await royalApiClient.post<EtsRevizyonSayfasi>(`${REVIZYON}?page=${sayfa}&size=300`, {
      sinceDate,
      revisionType,
    });
    kodlar.push(...(d?.hotels ?? []).map((h) => h.hotelId));
    if (!d?.hotels?.length || sayfa + 1 >= (d.numberOfPages ?? 1)) break;
  }
  return [...new Set(kodlar)];
}

/**
 * Son günlerde Etscore'da eklenen, değişen ve silinen otelleri uygular.
 *
 * Revizyon ucu en fazla son 6 günü veriyor; günlük çalıştırılmalı (bkz.
 * /api/internal/sync). Türsüz sorgu yalnızca UPDATE döndürüyor (ölçüldü:
 * türsüz 2, DELETE filtresiyle 6) — her tür ayrı soruluyor.
 */
export async function syncRevisions(opts: { gun?: number; ilerleme?: (satir: string) => void } = {}) {
  // Doküman "son 7 gün" diyor; 7 gün geri 0905028 ("Otel bulunamadi, rapor
  // kriterlerini…") veriyor, 6 gün çalışıyor (ölçüldü).
  const gun = Math.min(Math.max(opts.gun ?? 2, 1), 6);
  const sinceDate = new Date(Date.now() - gun * 86_400_000).toISOString().slice(0, 10);

  const [eklenen, degisen, silinen] = await Promise.all([
    revizyonlar(sinceDate, "INSERT"),
    revizyonlar(sinceDate, "UPDATE"),
    revizyonlar(sinceDate, "DELETE"),
  ]);

  if (silinen.length) {
    await prisma.hotel.updateMany({ where: { hotelCode: { in: silinen } }, data: { isActive: false } });
  }
  const silinmeyen = new Set(silinen);
  const yazilacak = [...new Set([...eklenen, ...degisen])].filter((k) => !silinmeyen.has(k));
  const ist = yeniIstatistik();
  await detaylariYaz(yazilacak, ist, { taze: true, ilerleme: opts.ilerleme });

  return {
    sinceDate,
    eklenen: eklenen.length,
    degisen: degisen.length,
    silinen: silinen.length,
    ...ist,
  };
}

/**
 * Tüm içeriği senkronlar. Adımlar birbirinden bağımsız: biri düşünce
 * (ör. gerçek modda boş dönen konum listesi) diğerleri yine çalışsın.
 *
 * Konum indeksi burada yok — dakikalar sürebilir, ayrı çalıştırılır
 * (indexHotelLocations).
 */
export async function syncAll(feedId: string) {
  const adim = async <T>(fn: () => Promise<T>): Promise<T | string> => {
    try {
      return await fn();
    } catch (e) {
      return `atlandı: ${e instanceof Error ? e.message : String(e)}`;
    }
  };

  return {
    currencies: await adim(syncCurrencies),
    boardTypes: await adim(syncBoardTypes),
    facilities: await adim(syncFacilities),
    roomAttributes: await adim(syncRoomAttributes),
    locations: await adim(syncLocations),
    hotels: await adim(() => syncHotels(feedId)),
  };
}
