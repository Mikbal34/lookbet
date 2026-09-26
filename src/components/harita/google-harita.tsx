"use client";

// Google Maps ortak parçaları: sağlayıcı, sade harita stili ve HTML işaretçi.
//
// Neden OverlayView ile kendi işaretçimiz: AdvancedMarker bir Map ID (bulut
// stili) istiyor; Map ID ile de JSON `styles` çalışmıyor. Airbnb'deki gibi
// soluk harita + fiyat hapı için ek konsol ayarı gerektirmeyen yol bu: stil
// JSON'u burada, hap React ile çiziliyor.

import * as React from "react";
import { createPortal } from "react-dom";
import { useLocale } from "next-intl";
import { APIProvider, useMap, useMapsLibrary } from "@vis.gl/react-google-maps";

export const HARITA_ANAHTARI = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

/** Soluk, sade harita: iş yeri ve toplu taşıma simgeleri kapalı, su ve kara yumuşak. */
export const HARITA_STILI: google.maps.MapTypeStyle[] = [
  { featureType: "poi", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "poi.business", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#f4f3f0" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#e2ead8" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#cde2ea" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#7e98a3" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road.highway", elementType: "geometry.fill", stylers: [{ color: "#ffffff" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#e4e1da" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#d4d0c7" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#6a6a6a" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#ffffff" }, { weight: 3 }] },
];

/**
 * Harita yazıları sayfanın dilinde. Maps betiği sayfada bir kez yüklenir:
 * dil değişince yeni dil sayfa yeniden yüklenene kadar haritaya geçmez.
 */
export function HaritaSaglayici({ children, yedek }: { children: React.ReactNode; yedek?: React.ReactNode }) {
  const dil = useLocale();
  if (!HARITA_ANAHTARI) return <>{yedek ?? null}</>;
  return (
    <APIProvider apiKey={HARITA_ANAHTARI} language={dil} region="TR">
      {children}
    </APIProvider>
  );
}

type Katman = google.maps.OverlayView & { konum: google.maps.LatLngLiteral };
let KatmanSinifi: (new (kap: HTMLElement, konum: google.maps.LatLngLiteral) => Katman) | null = null;

/** OverlayView ancak Maps yüklendikten sonra var; sınıf ilk kullanımda bir kez kurulur. */
function katmanKur(kap: HTMLElement, konum: google.maps.LatLngLiteral): Katman {
  KatmanSinifi ??= class extends google.maps.OverlayView {
    constructor(private kap: HTMLElement, public konum: google.maps.LatLngLiteral) {
      super();
      kap.style.position = "absolute";
      google.maps.OverlayView.preventMapHitsAndGesturesFrom(kap);
    }
    onAdd() {
      this.getPanes()?.overlayMouseTarget.appendChild(this.kap);
    }
    draw() {
      const p = this.getProjection()?.fromLatLngToDivPixel(new google.maps.LatLng(this.konum));
      if (p) {
        this.kap.style.left = `${p.x}px`;
        this.kap.style.top = `${p.y}px`;
      }
    }
    onRemove() {
      this.kap.remove();
    }
  };
  return new KatmanSinifi(kap, konum);
}

/**
 * Haritada bir koordinata React içeriği yerleştirir. İçerik noktanın tam
 * üstünde, sol üst köşesi noktada durur; ortalamayı içerik kendi yapar.
 * Tıklama ve sürükleme haritaya geçmez (işaretçiye tıklamak haritayı kapatmasın).
 */
export function HtmlIsaret({
  position,
  zIndex = 0,
  children,
}: {
  position: google.maps.LatLngLiteral;
  zIndex?: number;
  children: React.ReactNode;
}) {
  const map = useMap();
  const kutuphane = useMapsLibrary("maps");
  const [kap] = React.useState(() => (typeof document === "undefined" ? null : document.createElement("div")));

  const { lat, lng } = position;
  React.useEffect(() => {
    if (!map || !kutuphane || !kap) return;
    const k = katmanKur(kap, { lat, lng });
    k.setMap(map);
    return () => k.setMap(null);
  }, [map, kutuphane, kap, lat, lng]);

  // Kap konumlu ama z-index'siz: yığın bağlamı kurmuyor, sarmalayıcının
  // z-index'i diğer işaretçilerle doğrudan yarışıyor (seçili hap öne çıksın).
  return kap ? createPortal(<div style={{ position: "relative", zIndex }}>{children}</div>, kap) : null;
}
