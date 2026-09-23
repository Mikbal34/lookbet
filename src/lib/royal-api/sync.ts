import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { getCurrencies, getBoardTypes, getFacilities, getRoomAttributes } from "./content";
import { getLocations } from "./location";
import { getHotelList, etsOtelAra } from "./hotel";
import { etsKonumTuru } from "./etscore-map";

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
}) {
  const { feedId, gunler = [30, 75, 150], enFazla, hepsi = false } = opts;

  const adaylar = await prisma.hotel.findMany({
    where: hepsi ? {} : { locationId: null },
    select: { hotelCode: true, latitude: true },
    orderBy: { hotelCode: "asc" },
    ...(enFazla ? { take: enFazla } : {}),
  });

  const bekleyen = new Set(adaylar.map((h) => h.hotelCode));
  const koordinatiVar = new Set(adaylar.filter((h) => h.latitude).map((h) => h.hotelCode));
  const istatistik = { taranan: bekleyen.size, eslesen: 0, konum: 0, turlar: [] as string[] };
  const konumCache = new Map<number, string>(); // Etscore id → Location.id

  for (const gun of gunler) {
    if (bekleyen.size === 0) break;
    const giris = new Date(Date.now() + gun * 86_400_000).toISOString().slice(0, 10);
    const cikis = new Date(Date.now() + (gun + 1) * 86_400_000).toISOString().slice(0, 10);

    const oteller = await etsOtelAra(
      {
        feedId,
        nationality: "TR",
        checkIn: giris,
        checkOut: cikis,
        currency: "EUR",
        rooms: [{ adult: 2 }],
      },
      [...bekleyen],
      false
    );

    let turda = 0;
    for (const o of oteller) {
      if (!bekleyen.has(o.hotelCode)) continue;

      // Zinciri üstten alta kur; her halka bir öncekinin çocuğu.
      let ustId: string | null = null;
      for (const d of o.destinationCodes ?? []) {
        let id = konumCache.get(d.id);
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
          konumCache.set(d.id, id);
          istatistik.konum++;
        }
        ustId = id;
      }

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
    istatistik.turlar.push(`${giris}: ${turda} otel`);
  }

  return istatistik;
}

/**
 * Tüm içeriği senkronlar. Adımlar birbirinden bağımsız: gerçek modda bazı
 * uçlar belgelenmemiş (pansiyon tipleri, olanaklar, oda özellikleri) ve
 * hata veriyor; biri düşünce diğerleri yine çalışsın.
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
