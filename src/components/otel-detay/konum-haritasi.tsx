"use client";

// Otelin konumu: büyük Google haritası, ortada siyah iğne.

import { Map as GoogleMap } from "@vis.gl/react-google-maps";
import { HARITA_STILI, HaritaSaglayici, HtmlIsaret } from "@/components/harita/google-harita";

export function KonumHaritasi({ konum, className, yedek }: {
  konum: google.maps.LatLngLiteral;
  className?: string;
  yedek: React.ReactNode;
}) {
  return (
    <HaritaSaglayici yedek={yedek}>
      <GoogleMap
        className={className}
        defaultCenter={konum}
        defaultZoom={14}
        styles={HARITA_STILI}
        gestureHandling="cooperative"
        disableDefaultUI
        zoomControl
        clickableIcons={false}
      >
        <HtmlIsaret position={konum}>
          <span className="lb-konum-pini" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M12 21.5s-7-6.1-7-11.6a7 7 0 0 1 14 0c0 5.5-7 11.6-7 11.6z" /><rect x="9.5" y="7.4" width="5" height="5" rx="2" /></svg>
          </span>
        </HtmlIsaret>
      </GoogleMap>
    </HaritaSaglayici>
  );
}
