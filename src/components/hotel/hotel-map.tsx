"use client";

// Arama sonuçlarının harita görünümü — Airbnb'deki gibi fiyat hapları.
//
// Google Maps (bkz. components/harita/google-harita.tsx): soluk stil, beyaz
// fiyat hapı; üzerine gelince ya da seçilince siyah, bakılmış olan gri.
// Hapa tıklayınca fotoğraflı küçük kart açılır; haritanın boş yerine
// tıklayınca kapanır. Sonuç listesi değişince harita otellere sığdırılır.

import { fotoBoyutu } from "@/lib/foto";
import * as React from "react";
import { Map as GoogleMap, useMap } from "@vis.gl/react-google-maps";
import type { HotelSearchResult } from "@/lib/royal-api/types";
import { HARITA_STILI, HaritaSaglayici, HtmlIsaret } from "@/components/harita/google-harita";

export interface HotelMapProps {
  hotels: HotelSearchResult[];
  /** Otel sayfasına giderken korunacak arama parametreleri */
  searchParams?: string;
  className?: string;
  /** Listede üzerine gelinen otel: iğnesi öne çıkar. */
  aktifKod?: string | null;
  /** İğnedeki fiyat metni (varsayılan: gecelik en düşük fiyat). */
  fiyatYaz?: (h: HotelSearchResult) => string;
}

/** Koordinatı olmayan / 0,0 gelen kayıtlar haritayı Atlantik'e taşır. */
function koordinatliMi(h: HotelSearchResult): boolean {
  return (
    typeof h.latitude === "number" &&
    typeof h.longitude === "number" &&
    Number.isFinite(h.latitude) &&
    Number.isFinite(h.longitude) &&
    !(h.latitude === 0 && h.longitude === 0)
  );
}

function fiyatEtiketi(h: HotelSearchResult): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: h.currency || "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(h.minPrice);
}

/** Otel kümesi değişince (akışla yeni oteller gelince de) haritayı sığdırır. */
function Sigdir({ hotels }: { hotels: HotelSearchResult[] }) {
  const map = useMap();
  const anahtar = hotels.map((h) => h.hotelCode).join(",");
  React.useEffect(() => {
    if (!map || hotels.length === 0) return;
    if (hotels.length === 1) {
      map.setCenter({ lat: hotels[0].latitude, lng: hotels[0].longitude });
      map.setZoom(14);
      return;
    }
    const sinir = new google.maps.LatLngBounds();
    hotels.forEach((h) => sinir.extend({ lat: h.latitude, lng: h.longitude }));
    map.fitBounds(sinir, 56);
    // fitBounds birbirine çok yakın otellerde sokak seviyesine iner.
    const dinle = google.maps.event.addListenerOnce(map, "idle", () => {
      if ((map.getZoom() ?? 0) > 15) map.setZoom(15);
    });
    return () => google.maps.event.removeListener(dinle);
  }, [map, anahtar]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

function MiniKart({ h, href, fiyat, onKapat }: { h: HotelSearchResult; href: string; fiyat: string; onKapat: () => void }) {
  const [fotoYok, setFotoYok] = React.useState(!h.thumbnailImage);
  return (
    <div className="lb-harita-kart" role="dialog" aria-label={h.hotelName}>
      <button type="button" className="lb-harita-kart-kapat" onClick={onKapat} aria-label="Kapat">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
      </button>
      <a href={href} target={`otel_${h.hotelCode}`}>
        <div className="lb-harita-kart-foto">
          {!fotoYok && (
            // eslint-disable-next-line @next/next/no-img-element -- dış kaynaklı otel görseli
            <img src={fotoBoyutu(h.thumbnailImage, "400x300")} alt="" onError={() => setFotoYok(true)} />
          )}
        </div>
        <div className="lb-harita-kart-alt">
          <b>{h.hotelName}</b>
          <span>
            {h.stars > 0 ? `${h.stars} yıldızlı · ` : ""}
            {h.boardTypes[0] ?? ""}
          </span>
          <span>
            <b>{fiyat}</b>{h.freeCancellation ? " · Ücretsiz iptal" : ""}
          </span>
        </div>
      </a>
    </div>
  );
}

export function HotelMap({ hotels, searchParams, className, aktifKod, fiyatYaz = fiyatEtiketi }: HotelMapProps) {
  const gecerli = React.useMemo(() => hotels.filter(koordinatliMi), [hotels]);
  const [acik, setAcik] = React.useState<string | null>(null);
  const [gorulen, setGorulen] = React.useState<Set<string>>(() => new Set());
  const href = (h: HotelSearchResult) => `/hotel/${h.hotelCode}${searchParams ? `?${searchParams}` : ""}`;
  const acikOtel = gecerli.find((h) => h.hotelCode === acik);

  const bos = (mesaj: string) => (
    <div className={className} role="status" aria-live="polite">
      <div className="flex h-full items-center justify-center px-6 text-center text-[13.5px] text-muted">{mesaj}</div>
    </div>
  );
  if (gecerli.length === 0) return bos("Bu sonuçlar için konum bilgisi bulunmuyor.");

  return (
    <div className={className}>
      <HaritaSaglayici yedek={bos("Harita şu an gösterilemiyor.")}>
        <GoogleMap
          className="h-full w-full"
          defaultCenter={{ lat: gecerli[0].latitude, lng: gecerli[0].longitude }}
          defaultZoom={12}
          styles={HARITA_STILI}
          gestureHandling="greedy"
          disableDefaultUI
          zoomControl
          clickableIcons={false}
          onClick={() => setAcik(null)}
        >
          <Sigdir hotels={gecerli} />
          {gecerli.map((h) => (
            <HtmlIsaret
              key={h.hotelCode}
              position={{ lat: h.latitude, lng: h.longitude }}
              zIndex={acik === h.hotelCode ? 3 : aktifKod === h.hotelCode ? 2 : 1}
            >
              <button
                type="button"
                className="lb-fiyat-pini"
                data-acik={acik === h.hotelCode || aktifKod === h.hotelCode || undefined}
                data-gorulen={gorulen.has(h.hotelCode) || undefined}
                aria-label={`${h.hotelName}, ${fiyatYaz(h)}`}
                onClick={() => {
                  setAcik(h.hotelCode);
                  setGorulen((g) => new Set(g).add(h.hotelCode));
                }}
              >
                {fiyatYaz(h)}
              </button>
            </HtmlIsaret>
          ))}
          {acikOtel && (
            <HtmlIsaret position={{ lat: acikOtel.latitude, lng: acikOtel.longitude }} zIndex={10}>
              <MiniKart h={acikOtel} href={href(acikOtel)} fiyat={fiyatYaz(acikOtel)} onKapat={() => setAcik(null)} />
            </HtmlIsaret>
          )}
        </GoogleMap>
      </HaritaSaglayici>
    </div>
  );
}
