"use client";

// Arama sonuçlarının harita görünümü — Booking'deki gibi fiyat baloncukları.
//
// Neden Leaflet: otel detayındaki OpenStreetMap iframe'i tek işaretçi
// destekliyor, burada N otelin hepsi aynı anda lazım. Leaflet'in divIcon'u
// sayesinde varsayılan işaretçi görselleri hiç kullanılmıyor — o görsellerin
// paketleyicilerde bozulma sorunu da böylece hiç doğmuyor.
//
// SSR yok: react-leaflet doğrudan window/document'a dokunuyor. Sayfa bu
// bileşeni next/dynamic ile ssr:false olarak yüklüyor.

import * as React from "react";
import { useRouter } from "next/navigation";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { HotelSearchResult } from "@/lib/royal-api/types";

export interface HotelMapProps {
  hotels: HotelSearchResult[];
  /** Otel kartına giderken korunacak arama parametreleri */
  searchParams?: string;
  className?: string;
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

/** Tüm oteller görünene kadar haritayı sığdırır. */
function SinirlaraSigdir({ hotels }: { hotels: HotelSearchResult[] }) {
  const map = useMap();
  React.useEffect(() => {
    if (hotels.length === 0) return;
    const sinir = L.latLngBounds(
      hotels.map((h) => [h.latitude, h.longitude] as [number, number])
    );
    map.fitBounds(sinir, { padding: [48, 48], maxZoom: 15 });
  }, [hotels, map]);
  return null;
}

export function HotelMap({ hotels, searchParams, className }: HotelMapProps) {
  const router = useRouter();
  const gecerli = React.useMemo(() => hotels.filter(koordinatliMi), [hotels]);

  const ikonlar = React.useMemo(
    () =>
      gecerli.map((h) =>
        L.divIcon({
          className: "lookbet-fiyat-pini",
          html: `<span>${fiyatEtiketi(h)}</span>`,
          // Baloncuk genişliği içeriğe göre; sabit boyut verirsek uzun
          // fiyatlar kırpılır. Leaflet konumlandırmayı CSS'e bırakıyor.
          iconSize: undefined,
        })
      ),
    [gecerli]
  );

  if (gecerli.length === 0) {
    return (
      <div
        className={className}
        role="status"
        aria-live="polite"
      >
        <div className="flex h-full items-center justify-center px-6 text-center text-[13.5px] text-muted">
          Bu sonuçlar için konum bilgisi bulunmuyor.
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <MapContainer
        center={[gecerli[0].latitude, gecerli[0].longitude]}
        zoom={12}
        scrollWheelZoom
        className="h-full w-full"
        // Klavye gezinmesi Leaflet'te varsayılan açık; WebView'de sorun çıkarmıyor.
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <SinirlaraSigdir hotels={gecerli} />
        {gecerli.map((h, i) => (
          <Marker
            key={h.hotelCode}
            position={[h.latitude, h.longitude]}
            icon={ikonlar[i]}
            alt={`${h.hotelName} — ${fiyatEtiketi(h)}`}
            eventHandlers={{
              click: () =>
                router.push(
                  `/hotel/${h.hotelCode}${searchParams ? `?${searchParams}` : ""}`
                ),
            }}
          />
        ))}
      </MapContainer>
    </div>
  );
}
