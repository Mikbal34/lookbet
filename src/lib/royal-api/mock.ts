// Royal API mock katmanı.
// ROYAL_API_MOCK=true iken royal-api fonksiyonları gerçek HTTP çağrısı yerine
// buradan gerçekçi sahte veri döner. Böylece tedarikçi kimlik bilgileri
// olmadan tüm akış (arama → oda → rezervasyon → iptal) uçtan uca test edilir.
// Flag kapatıldığında hiçbir üst katman kodu değişmeden gerçek API'ye döner.

import type {
  HotelSearchRequest,
  HotelSearchResponse,
  HotelSearchResult,
  HotelDetailResponse,
  HotelListItem,
  RoomSearchRequest,
  RoomSearchResponse,
  RoomResult,
  CreateBookingRequest,
  CreateBookingResponse,
  ReservationDetailResponse,
  CancelBookingRequest,
  CancelBookingResponse,
  CurrencyDto,
  BoardTypeDto,
  FacilityDto,
  RoomAttributeDto,
  LocationDto,
  CancellationPolicy,
  HotelReview,
  HotelReviewSummary,
  NearbyPlace,
  HotelPolicies,
} from "./types";

export const USE_MOCK = process.env.ROYAL_API_MOCK === "true";

// ---- Sabit içerik --------------------------------------------------------

const CURRENCIES: CurrencyDto[] = [
  { code: "EUR", name: "Euro" },
  { code: "USD", name: "Amerikan Doları" },
  { code: "TRY", name: "Türk Lirası" },
  { code: "GBP", name: "İngiliz Sterlini" },
];

const BOARD_TYPES: BoardTypeDto[] = [
  { code: "RO", name: "Sadece Oda" },
  { code: "BB", name: "Oda + Kahvaltı" },
  { code: "HB", name: "Yarım Pansiyon" },
  { code: "FB", name: "Tam Pansiyon" },
  { code: "AI", name: "Her Şey Dahil" },
  { code: "UAI", name: "Ultra Her Şey Dahil" },
];

const FACILITIES: FacilityDto[] = [
  { id: 1, categoryName: "Genel", name: "Açık Havuz" },
  { id: 2, categoryName: "Genel", name: "Kapalı Havuz" },
  { id: 3, categoryName: "Wellness", name: "Spa & Wellness" },
  { id: 4, categoryName: "Hizmetler", name: "Ücretsiz Wi-Fi" },
  { id: 5, categoryName: "Hizmetler", name: "Otopark" },
  { id: 6, categoryName: "Yeme İçme", name: "Restoran" },
  { id: 7, categoryName: "Yeme İçme", name: "Bar" },
  { id: 8, categoryName: "Aktiviteler", name: "Fitness Merkezi" },
  { id: 9, categoryName: "Genel", name: "Özel Plaj" },
  { id: 10, categoryName: "Aktiviteler", name: "Çocuk Kulübü" },
];

const ROOM_ATTRIBUTES: RoomAttributeDto[] = [
  { id: 1, categoryName: "Konfor", name: "Klima" },
  { id: 2, categoryName: "Konfor", name: "Minibar" },
  { id: 3, categoryName: "Manzara", name: "Deniz Manzarası" },
  { id: 4, categoryName: "Manzara", name: "Balkon" },
  { id: 5, categoryName: "Banyo", name: "Jakuzi" },
  { id: 6, categoryName: "Teknoloji", name: "Ücretsiz Wi-Fi" },
  { id: 7, categoryName: "Konfor", name: "Çay/Kahve Makinesi" },
];

// Lokasyon hiyerarşisi (externalId string olarak sync'lenir)
const LOCATIONS: LocationDto[] = [
  { id: 1, name: "Antalya", parentId: null, type: "CITY" },
  { id: 2, name: "İstanbul", parentId: null, type: "CITY" },
  { id: 3, name: "Muğla", parentId: null, type: "CITY" },
  { id: 11, name: "Lara", parentId: 1, type: "DISTRICT" },
  { id: 12, name: "Belek", parentId: 1, type: "DISTRICT" },
  { id: 31, name: "Bodrum", parentId: 3, type: "DISTRICT" },
  { id: 32, name: "Marmaris", parentId: 3, type: "DISTRICT" },
];

// ---- Otel kataloğu -------------------------------------------------------

interface MockHotel {
  hotelCode: string;
  name: string;
  stars: number;
  address: string;
  latitude: number;
  longitude: number;
  locationId: number;
  facilityIds: number[];
  boardTypes: string[];
  description: string;
  phone: string;
  email: string;
}

const HOTELS: MockHotel[] = [
  {
    hotelCode: "HTL001",
    name: "Lara Beach Resort & Spa",
    stars: 5,
    address: "Lara Turizm Merkezi, Muratpaşa, Antalya",
    latitude: 36.8552,
    longitude: 30.8321,
    locationId: 11,
    facilityIds: [1, 3, 4, 5, 6, 7, 8, 9, 10],
    boardTypes: ["AI", "UAI"],
    description:
      "Akdeniz kıyısında, özel plajı ve geniş spa merkeziyle Lara Beach Resort & Spa, ailelerin ve çiftlerin favorisi. Ultra her şey dahil konseptiyle unutulmaz bir tatil sunar.",
    phone: "+90 242 123 45 67",
    email: "info@larabeachresort.example.com",
  },
  {
    hotelCode: "HTL002",
    name: "Antalya City Hotel",
    stars: 4,
    address: "Muratpaşa Merkez, Antalya",
    latitude: 36.8869,
    longitude: 30.7133,
    locationId: 1,
    facilityIds: [1, 4, 5, 6, 8],
    boardTypes: ["BB", "HB"],
    description:
      "Şehir merkezinde, Kaleiçi'ne yürüme mesafesinde konforlu bir şehir oteli. İş ve gezi seyahatleri için ideal konum.",
    phone: "+90 242 234 56 78",
    email: "info@antalyacityhotel.example.com",
  },
  {
    hotelCode: "HTL003",
    name: "Bodrum Bay Resort",
    stars: 5,
    address: "Yalıkavak Marina, Bodrum, Muğla",
    latitude: 37.1081,
    longitude: 27.2897,
    locationId: 31,
    facilityIds: [1, 2, 3, 4, 6, 7, 9],
    boardTypes: ["HB", "AI"],
    description:
      "Yalıkavak Marina'ya komşu, infinity havuzu ve deniz manzaralı odalarıyla Bodrum'un en gözde tatil noktalarından biri.",
    phone: "+90 252 345 67 89",
    email: "info@bodrumbayresort.example.com",
  },
  {
    hotelCode: "HTL004",
    name: "İstanbul Bosphorus Palace",
    stars: 5,
    address: "Ortaköy, Beşiktaş, İstanbul",
    latitude: 41.0473,
    longitude: 29.0263,
    locationId: 2,
    facilityIds: [2, 3, 4, 5, 6, 7, 8],
    boardTypes: ["BB", "HB"],
    description:
      "Boğaz manzaralı, tarihi dokusuyla İstanbul Bosphorus Palace şehrin kalbinde lüks bir konaklama deneyimi sunar.",
    phone: "+90 212 456 78 90",
    email: "info@bosphoruspalace.example.com",
  },
  {
    hotelCode: "HTL005",
    name: "Sultanahmet Boutique Hotel",
    stars: 3,
    address: "Sultanahmet, Fatih, İstanbul",
    latitude: 41.0054,
    longitude: 28.9768,
    locationId: 2,
    facilityIds: [4, 5, 6],
    boardTypes: ["RO", "BB"],
    description:
      "Ayasofya ve Sultanahmet Camii'ne birkaç adım mesafede, samimi ve butik bir konaklama. Tarihi yarımadanın tam ortasında.",
    phone: "+90 212 567 89 01",
    email: "info@sultanahmetboutique.example.com",
  },
];

// ---- Yardımcılar ---------------------------------------------------------

function seedNum(str: string): number {
  let h = 0;
  for (const ch of str) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

// Fiyatlar EUR bazında üretilir, seçilen para birimine kaba çarpanla ölçeklenir.
const CURRENCY_MULTIPLIER: Record<string, number> = {
  EUR: 1,
  USD: 1.08,
  GBP: 0.85,
  TRY: 35,
};

function scale(amountEur: number, currency: string): number {
  const m = CURRENCY_MULTIPLIER[currency] ?? 1;
  return Math.round(amountEur * m);
}

function nightsBetween(checkIn: string, checkOut: string): number {
  const a = new Date(checkIn).getTime();
  const b = new Date(checkOut).getTime();
  const n = Math.round((b - a) / (1000 * 60 * 60 * 24));
  return n > 0 ? n : 1;
}

// ---- Görseller -----------------------------------------------------------
//
// Önceden picsum.photos'tan tohuma göre rastgele fotoğraf çekiliyordu; otel
// kartında ve rezervasyon detayının tepesinde otelle hiç ilgisi olmayan
// kareler çıkıyordu (bir portre, bir sokak fotoğrafı). Mock veri de olsa
// ekranda otel görünmesi gerekiyor: aşağıdaki kareler elle seçildi ve her
// otele karakterine uyanlar verildi (sahil tesisi havuz, şehir oteli cephe,
// butik otel klasik oda). Beşinin de ilk karesi — yani listede görünen
// küçük görsel — birbirinden farklı.

function unsplash(id: string): string {
  return `https://images.unsplash.com/photo-${id}?w=900&q=80&auto=format&fit=crop`;
}

const OTEL_GORSELLERI: Record<string, string[]> = {
  // Lara Beach Resort & Spa — sahil tesisi
  HTL001: [
    "1551882547-ff40c63fe5fa",
    "1571003123894-1f0594d2b5d9",
    "1540541338287-41700207dee6",
    "1564501049412-61c2a3083791",
    "1584132967334-10e028bd69f7",
    "1611892440504-42a792e24d32",
  ].map(unsplash),
  // Antalya City Hotel — şehir oteli
  HTL002: [
    "1455587734955-081b22074882",
    "1517840901100-8179e982acb7",
    "1445019980597-93fa8acb246c",
    "1631049307264-da0ec9d70304",
    "1560448204-e02f11c3d0e2",
    "1618773928121-c32242e63f39",
  ].map(unsplash),
  // Bodrum Bay Resort — koy manzarası
  HTL003: [
    "1582719508461-905c673771fd",
    "1520250497591-112f2f40a3f4",
    "1542314831-068cd1dbfeeb",
    "1584132967334-10e028bd69f7",
    "1596394516093-501ba68a0ba6",
    "1578683010236-d716f9a3f461",
  ].map(unsplash),
  // İstanbul Bosphorus Palace — lüks şehir oteli
  HTL004: [
    "1578683010236-d716f9a3f461",
    "1524231757912-21f4fe3a7200",
    "1542314831-068cd1dbfeeb",
    "1560448204-e02f11c3d0e2",
    "1590490360182-c33d57733427",
    "1631049307264-da0ec9d70304",
  ].map(unsplash),
  // Sultanahmet Boutique Hotel — butik, klasik
  HTL005: [
    "1590490360182-c33d57733427",
    "1524231757912-21f4fe3a7200",
    "1618773928121-c32242e63f39",
    "1517840901100-8179e982acb7",
    "1560448204-e02f11c3d0e2",
    "1611892440504-42a792e24d32",
  ].map(unsplash),
};

/** Listede olmayan bir kod gelirse — ekran boş kalmasın. */
const YEDEK_OTEL_GORSELLERI = [
  "1566073771259-6a8506099945",
  "1445019980597-93fa8acb246c",
  "1631049307264-da0ec9d70304",
  "1564501049412-61c2a3083791",
  "1540541338287-41700207dee6",
  "1590490360182-c33d57733427",
].map(unsplash);

/** Oda görselleri — otelden bağımsız ortak havuz. */
const ODA_GORSELLERI = [
  "1611892440504-42a792e24d32",
  "1590490360182-c33d57733427",
  "1631049307264-da0ec9d70304",
  "1618773928121-c32242e63f39",
  "1596394516093-501ba68a0ba6",
  "1578683010236-d716f9a3f461",
  "1560448204-e02f11c3d0e2",
].map(unsplash);

function imagesFor(hotelCode: string, count = 5): string[] {
  const havuz = OTEL_GORSELLERI[hotelCode] ?? YEDEK_OTEL_GORSELLERI;
  return Array.from({ length: count }, (_, i) => havuz[i % havuz.length]);
}

/**
 * Odanın görselleri. Aynı oteldeki iki oda aynı kareyle başlamasın diye
 * havuza otel koduna ve oda sırasına göre farklı yerden giriliyor.
 */
function roomImagesFor(
  hotelCode: string,
  roomIndex: number,
  count = 3
): string[] {
  const bas = (seedNum(hotelCode) + roomIndex * 2) % ODA_GORSELLERI.length;
  return Array.from(
    { length: count },
    (_, i) => ODA_GORSELLERI[(bas + i) % ODA_GORSELLERI.length]
  );
}

function findHotel(hotelCode: string): MockHotel | undefined {
  return HOTELS.find((h) => h.hotelCode === hotelCode);
}

// EUR bazlı, oda tipine göre gecelik taban fiyat.
function baseNightlyEur(hotel: MockHotel, roomIndex: number): number {
  const starFactor = 60 + hotel.stars * 30; // 3★=150, 4★=180, 5★=210
  const roomFactor = [1, 1.4, 2.1][roomIndex] ?? 1; // Standart, Deluxe, Suite
  const jitter = (seedNum(hotel.hotelCode) % 40) - 20;
  return Math.round((starFactor * roomFactor) + jitter);
}

// ---- Zenginleştirme verileri (yorum, çevre, politika) --------------------

// Yorum havuzu — deterministik olarak otele dağıtılır.
const REVIEW_POOL: Array<Omit<HotelReview, "date">> = [
  { author: "Bilgehan", country: "TR", score: 9.6, travelerType: "İş", roomType: "Deluxe Oda", positive: "Konum harikaydı, hem gezmek hem çalışmak için birebir. Personel her konuda çok yardımcı oldu.", negative: "Kahvaltı biraz kalabalıktı." },
  { author: "Elif", country: "TR", score: 9.2, travelerType: "Çift", roomType: "Suit Oda", positive: "Odalar tertemizdi ve deniz manzarası muhteşemdi. Kesinlikle tekrar geliriz.", negative: "" },
  { author: "Mert", country: "TR", score: 8.4, travelerType: "Aile", roomType: "Standart Oda", positive: "Çocuklar havuzu çok sevdi, personel ilgiliydi.", negative: "Otopark biraz dardı." },
  { author: "Ayşe", country: "TR", score: 8.9, travelerType: "Çift", roomType: "Deluxe Oda", positive: "Yatak çok konforluydu, kahvaltı zengindi.", negative: "Wi-Fi bazen yavaşladı." },
  { author: "Can", country: "TR", score: 7.8, travelerType: "İş", roomType: "Standart Oda", positive: "Merkezi konum, ulaşım çok kolay.", negative: "Oda beklediğimden küçüktü ama temizdi." },
  { author: "Zeynep", country: "TR", score: 9.4, travelerType: "Aile", roomType: "Suit Oda", positive: "Her şey dahil konsept çok başarılı, yemekler lezzetliydi.", negative: "" },
  { author: "James", country: "GB", score: 8.7, travelerType: "Çift", roomType: "Deluxe Oda", positive: "Great location and very friendly staff. Would recommend.", negative: "Breakfast could have more options." },
  { author: "Anna", country: "DE", score: 9.0, travelerType: "İş", roomType: "Standart Oda", positive: "Sehr sauber und zentral gelegen. Gerne wieder.", negative: "" },
];

const CATEGORY_NAMES = [
  "Personel",
  "Olanaklar",
  "Temizlik",
  "Konfor",
  "Fiyat/Kalite",
  "Konum",
  "Ücretsiz Wi-Fi",
];

function scoreLabel(score: number): string {
  if (score >= 9) return "Mükemmel";
  if (score >= 8) return "Çok iyi";
  if (score >= 7) return "İyi";
  return "Fena değil";
}

function reviewSummaryFor(hotel: MockHotel): HotelReviewSummary {
  const seed = seedNum(hotel.hotelCode);
  // 7.8 – 9.5 arası, yıldıza hafif bağlı
  const base = 7.6 + (hotel.stars - 3) * 0.35 + ((seed % 60) / 100);
  const score = Math.min(9.6, Math.round(base * 10) / 10);
  const count = 800 + (seed % 9000);
  const categories = CATEGORY_NAMES.map((name, i) => ({
    name,
    score: Math.min(9.8, Math.round((score + (((seed >> i) % 12) - 5) / 10) * 10) / 10),
  }));
  const highlightReview = REVIEW_POOL[seed % REVIEW_POOL.length];
  return {
    score,
    count,
    label: scoreLabel(score),
    categories,
    highlight: highlightReview.positive,
  };
}

function reviewsFor(hotel: MockHotel): HotelReview[] {
  const seed = seedNum(hotel.hotelCode);
  const count = 4 + (seed % 3); // 4–6 yorum
  const daysAgo = (n: number) =>
    new Date(Date.now() - n * 86400000).toISOString();
  return Array.from({ length: count }, (_, i) => {
    const r = REVIEW_POOL[(seed + i * 3) % REVIEW_POOL.length];
    return { ...r, date: daysAgo(7 + i * 11 + (seed % 20)) };
  });
}

// Şehir (üst lokasyon) bazlı çevre bilgisi.
const NEARBY_BY_CITY: Record<number, NearbyPlace[]> = {
  1: [
    // Antalya
    { name: "Kaleiçi Tarihi Merkez", category: "Turistik", distance: "1,2 km" },
    { name: "Konyaaltı Plajı", category: "Turistik", distance: "3,4 km" },
    { name: "Antalya Müzesi", category: "Turistik", distance: "4,1 km" },
    { name: "Lara Restaurant", category: "Restoran", distance: "150 m" },
    { name: "Muratpaşa Tramvay Durağı", category: "Toplu Taşıma", distance: "600 m" },
    { name: "Antalya Havalimanı (AYT)", category: "Havaalanı", distance: "13 km" },
  ],
  2: [
    // İstanbul
    { name: "Ayasofya", category: "Turistik", distance: "400 m" },
    { name: "Sultanahmet Camii", category: "Turistik", distance: "550 m" },
    { name: "Kapalıçarşı", category: "Turistik", distance: "1,1 km" },
    { name: "Balıkçı Sabahattin", category: "Restoran", distance: "300 m" },
    { name: "Sultanahmet Tramvay Durağı", category: "Toplu Taşıma", distance: "250 m" },
    { name: "İstanbul Havalimanı (IST)", category: "Havaalanı", distance: "45 km" },
    { name: "Sabiha Gökçen (SAW)", category: "Havaalanı", distance: "50 km" },
  ],
  3: [
    // Muğla / Bodrum
    { name: "Bodrum Kalesi", category: "Turistik", distance: "2,8 km" },
    { name: "Yalıkavak Marina", category: "Turistik", distance: "500 m" },
    { name: "Gümbet Plajı", category: "Turistik", distance: "4,2 km" },
    { name: "Marina Yacht Club", category: "Restoran", distance: "450 m" },
    { name: "Yalıkavak Otogar", category: "Toplu Taşıma", distance: "1,3 km" },
    { name: "Milas-Bodrum Havalimanı (BJV)", category: "Havaalanı", distance: "38 km" },
  ],
};

// Otelin bağlı olduğu şehri (kök lokasyonu) bul.
function cityRootOf(locationId: number): number {
  const loc = LOCATIONS.find((l) => l.id === locationId);
  if (!loc) return locationId;
  return loc.parentId ?? loc.id;
}

function nearbyFor(hotel: MockHotel): NearbyPlace[] {
  const city = cityRootOf(hotel.locationId);
  return NEARBY_BY_CITY[city] ?? [];
}

function policiesFor(hotel: MockHotel): HotelPolicies {
  const seed = seedNum(hotel.hotelCode);
  return {
    checkInFrom: ["14:00", "15:00"][seed % 2],
    checkOutUntil: ["11:00", "12:00"][seed % 2],
    cancellationText:
      "Girişten 7 gün öncesine kadar ücretsiz iptal; sonrasında ilk gece bedeli tahsil edilir.",
    childrenText:
      "Her yaştan çocuk konaklayabilir. 0–2 yaş için bebek karyolası talep üzerine ücretsizdir. 12 yaş ve üzeri yetişkin tarifesine tabidir.",
    acceptedCards: ["Visa", "Mastercard", "American Express"],
    importantInfo: [
      "Check-in sırasında fotoğraflı kimlik ve kredi kartı ibrazı gereklidir.",
      "Evcil hayvan kabul edilmemektedir.",
      hotel.stars >= 5
        ? "Spa ve wellness merkezi 09:00–21:00 arası hizmet vermektedir."
        : "Resepsiyon 24 saat açıktır.",
    ],
  };
}

// ---- İçerik fonksiyonları ------------------------------------------------

export function mockGetCurrencies(): Promise<CurrencyDto[]> {
  return Promise.resolve(CURRENCIES);
}
export function mockGetBoardTypes(): Promise<BoardTypeDto[]> {
  return Promise.resolve(BOARD_TYPES);
}
export function mockGetFacilities(): Promise<FacilityDto[]> {
  return Promise.resolve(FACILITIES);
}
export function mockGetRoomAttributes(): Promise<RoomAttributeDto[]> {
  return Promise.resolve(ROOM_ATTRIBUTES);
}
export function mockGetLocations(): Promise<LocationDto[]> {
  return Promise.resolve(LOCATIONS);
}

// ---- Otel fonksiyonları --------------------------------------------------

export function mockGetHotelList(): Promise<HotelListItem[]> {
  return Promise.resolve(
    HOTELS.map((h) => ({
      hotelCode: h.hotelCode,
      name: h.name,
      stars: h.stars,
      address: h.address,
      latitude: h.latitude,
      longitude: h.longitude,
      thumbnailImage: imagesFor(h.hotelCode, 1)[0],
      locationId: h.locationId,
      facilities: h.facilityIds,
      images: imagesFor(h.hotelCode, 5),
    }))
  );
}

export function mockSearchHotels(
  params: HotelSearchRequest
): Promise<HotelSearchResponse> {
  const currency = params.currency || "EUR";
  const requested = params.hotelCodes?.length
    ? HOTELS.filter((h) => params.hotelCodes.includes(h.hotelCode))
    : HOTELS;

  // Eşleşme yoksa (DB henüz boşsa) tüm kataloğu göster ki arama boş dönmesin.
  const source = requested.length ? requested : HOTELS;

  const hotels: HotelSearchResult[] = source.map((h) => {
    const rs = reviewSummaryFor(h);
    return {
      hotelCode: h.hotelCode,
      hotelName: h.name,
      stars: h.stars,
      address: h.address,
      latitude: h.latitude,
      longitude: h.longitude,
      thumbnailImage: imagesFor(h.hotelCode, 1)[0],
      minPrice: scale(baseNightlyEur(h, 0), currency),
      currency,
      boardTypes: h.boardTypes,
      reviewScore: rs.score,
      reviewCount: rs.count,
      reviewLabel: rs.label,
    };
  });

  return Promise.resolve({
    searchId: `mock-search-${seedNum(params.checkIn + params.checkOut)}`,
    hotels,
  });
}

export function mockGetHotelDetail(
  hotelCode: string
): Promise<HotelDetailResponse> {
  const h = findHotel(hotelCode);
  if (!h) {
    return Promise.reject(new Error(`Mock otel bulunamadı: ${hotelCode}`));
  }
  const imgs = imagesFor(hotelCode, 6);
  return Promise.resolve({
    hotelCode: h.hotelCode,
    name: h.name,
    stars: h.stars,
    address: h.address,
    description: h.description,
    latitude: h.latitude,
    longitude: h.longitude,
    images: imgs.map((url, i) => ({
      url,
      caption: `${h.name} — Görsel ${i + 1}`,
      isMain: i === 0,
    })),
    facilities: h.facilityIds
      .map((id) => FACILITIES.find((f) => f.id === id))
      .filter((f): f is FacilityDto => Boolean(f))
      .map((f) => ({ id: f.id, categoryName: f.categoryName, name: f.name })),
    phone: h.phone,
    email: h.email,
    reviewSummary: reviewSummaryFor(h),
    reviews: reviewsFor(h),
    nearby: nearbyFor(h),
    policies: policiesFor(h),
  });
}

// ---- Oda / rezervasyon fonksiyonları -------------------------------------

function cancellationPoliciesFor(
  checkIn: string,
  totalPrice: number,
  currency: string
): CancellationPolicy[] {
  const checkInDate = new Date(checkIn);
  const freeUntil = new Date(checkInDate);
  freeUntil.setDate(freeUntil.getDate() - 7); // 7 gün öncesine kadar ücretsiz
  return [
    {
      fromDate: freeUntil.toISOString(),
      toDate: checkInDate.toISOString(),
      penalty: Math.round(totalPrice * 0.5),
      penaltyCurrency: currency,
      description:
        "Girişten 7 gün öncesine kadar ücretsiz iptal; sonrasında toplam tutarın %50'si tahsil edilir.",
    },
  ];
}

export function mockSearchRooms(
  params: RoomSearchRequest
): Promise<RoomSearchResponse> {
  const h = findHotel(params.hotelCode);
  const currency = params.currency || "EUR";
  const nights = nightsBetween(params.checkIn, params.checkOut);

  if (!h) {
    return Promise.resolve({ roomSearchId: "mock-empty", expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), rooms: [] });
  }

  const roomDefs = [
    { name: "Standart Oda", attrs: [1, 2, 6, 7], board: h.boardTypes[0] },
    { name: "Deluxe Oda (Deniz Manzaralı)", attrs: [1, 2, 3, 4, 6, 7], board: h.boardTypes[0] },
    { name: "Suit Oda", attrs: [1, 2, 3, 4, 5, 6, 7], board: h.boardTypes[h.boardTypes.length - 1] },
  ];

  const rooms: RoomResult[] = roomDefs.map((def, i) => {
    const nightlyEur = baseNightlyEur(h, i);
    const nightly = scale(nightlyEur, currency);
    const total = nightly * nights;
    const board = def.board;
    const boardName = BOARD_TYPES.find((b) => b.code === board)?.name ?? board;
    return {
      roomCode: `${h.hotelCode}-R${i + 1}`,
      roomName: def.name,
      boardType: board,
      boardTypeName: boardName,
      priceCode: `${h.hotelCode}-R${i + 1}-${seedNum(params.checkIn)}${i}`,
      totalPrice: total,
      nightlyPrice: nightly,
      currency,
      cancellationPolicies: cancellationPoliciesFor(params.checkIn, total, currency),
      attributes: def.attrs
        .map((id) => ROOM_ATTRIBUTES.find((a) => a.id === id))
        .filter((a): a is RoomAttributeDto => Boolean(a))
        .map((a) => ({ id: a.id, categoryName: a.categoryName, name: a.name })),
      images: roomImagesFor(h.hotelCode, i, 3),
      allotment: [8, 3, 1][i] ?? 5,
    };
  });

  return Promise.resolve({
    roomSearchId: `mock-rs-${seedNum(params.hotelCode + params.checkIn)}`,
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    rooms,
  });
}

export function mockCreateBooking(
  params: CreateBookingRequest
): Promise<CreateBookingResponse> {
  const bookingNumber = `LB${Date.now().toString().slice(-8)}`;
  const roomCount = params.rooms?.length || 1;
  return Promise.resolve({
    bookingNumber,
    status: "CONFIRMED",
    hotelConfirmationNumber: `HC-${seedNum(bookingNumber) % 1000000}`,
    roomConfirmationCodes: Array.from(
      { length: roomCount },
      (_, i) => `RC-${seedNum(bookingNumber + i) % 1000000}`
    ),
    totalPrice: 0, // Gerçek tutar üst katmanda pricing motorundan gelir
    currency: "EUR",
  });
}

export function mockGetReservationDetail(
  bookingNumber: string
): Promise<ReservationDetailResponse> {
  // Mock modda tedarikçi kaydı yerel kayıtla aynı kalır: durum CONFIRMED döner,
  // böylece detay senkronu yerel kaydı bozmadan çalışır.
  return Promise.resolve({
    bookingNumber,
    clientReferenceId: `ref-${bookingNumber}`,
    status: "CONFIRMED",
    hotelCode: "HTL001",
    hotelName: "Lara Beach Resort & Spa",
    checkIn: new Date().toISOString(),
    checkOut: new Date(Date.now() + 3 * 86400000).toISOString(),
    boardType: "AI",
    roomType: "Standart Oda",
    totalPrice: 0,
    currency: "EUR",
    contact: { name: "", surname: "", email: "", phone: "" },
    guests: [],
    cancellationPolicies: [],
    roomConfirmationCodes: [],
    createdAt: new Date().toISOString(),
  });
}

export function mockCancelReservation(
  params: CancelBookingRequest
): Promise<CancelBookingResponse> {
  return Promise.resolve({
    bookingNumber: params.bookingNumber,
    status: "CANCELLED",
    cancellationFee: 0, // 7 günden önce iptal varsayımı: ücretsiz
    currency: "EUR",
  });
}
