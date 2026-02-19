import { prisma } from "@/lib/prisma";
import { getCurrencies, getBoardTypes, getFacilities, getRoomAttributes } from "./content";
import { getLocations } from "./location";
import { getHotelList } from "./hotel";

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

export async function syncHotels(feedId: string) {
  const hotels = await getHotelList({ feedId });
  for (const h of hotels) {
    const location = h.locationId
      ? await prisma.location.findUnique({ where: { externalId: String(h.locationId) } })
      : null;

    await prisma.hotel.upsert({
      where: { hotelCode: h.hotelCode },
      update: {
        name: h.name,
        stars: h.stars,
        address: h.address,
        latitude: h.latitude,
        longitude: h.longitude,
        images: h.images,
        facilities: h.facilities,
        locationId: location?.id,
      },
      create: {
        hotelCode: h.hotelCode,
        name: h.name,
        stars: h.stars,
        address: h.address,
        latitude: h.latitude,
        longitude: h.longitude,
        images: h.images,
        facilities: h.facilities,
        locationId: location?.id,
      },
    });
  }
  return hotels.length;
}

export async function syncAll(feedId: string) {
  const results = {
    currencies: await syncCurrencies(),
    boardTypes: await syncBoardTypes(),
    facilities: await syncFacilities(),
    roomAttributes: await syncRoomAttributes(),
    locations: await syncLocations(),
    hotels: await syncHotels(feedId),
  };
  return results;
}
