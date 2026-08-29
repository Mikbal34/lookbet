"use client";

// Usage:
// <HotelInfo hotel={hotelDetailResponse} />

import * as React from "react";
import {
  Star,
  MapPin,
  Phone,
  Mail,
  Wifi,
  Waves,
  UtensilsCrossed,
  Car,
  Dumbbell,
  Sparkles,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import {
  LbBilgi,
  LbKonum,
  LbTelefon,
  LbZil,
} from "@/components/ui/icons";
import type {
  HotelDetailResponse,
  HotelFacilityItem,
} from "@/lib/royal-api/types";

export interface HotelInfoProps {
  hotel: HotelDetailResponse;
  className?: string;
}

const FACILITY_ICON_MAP: Record<string, React.ElementType> = {
  wifi: Wifi,
  internet: Wifi,
  pool: Waves,
  havuz: Waves,
  restaurant: UtensilsCrossed,
  restoran: UtensilsCrossed,
  parking: Car,
  otopark: Car,
  gym: Dumbbell,
  spor: Dumbbell,
  spa: Sparkles,
};

function getFacilityIcon(name: string): React.ElementType {
  const lower = name.toLowerCase();
  for (const [key, Icon] of Object.entries(FACILITY_ICON_MAP)) {
    if (lower.includes(key)) return Icon;
  }
  return CheckCircle2;
}

function StarRating({ stars }: { stars: number }) {
  return (
    <div className="flex items-center gap-1" aria-label={`${stars} yıldız`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={cn(
            "h-4 w-4",
            i < stars
              ? "fill-gold text-gold"
              : "fill-line-strong text-line-strong",
          )}
          aria-hidden="true"
        />
      ))}
      <span className="text-sm font-medium text-slate-text ml-1">
        {stars} Yıldız
      </span>
    </div>
  );
}

function FacilityGroup({
  category,
  items,
}: {
  category: string;
  items: HotelFacilityItem[];
}) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-slate-text mb-2">{category}</h4>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {items.map((facility) => {
          const Icon = getFacilityIcon(facility.name);
          return (
            <li
              key={facility.id}
              className="flex items-center gap-2 text-sm text-slate-text"
            >
              <Icon className="h-4 w-4 shrink-0 text-navy" aria-hidden="true" />
              {facility.name}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function HotelMap({
  latitude,
  longitude,
  name,
}: {
  latitude: number;
  longitude: number;
  name: string;
}) {
  const bbox = [
    longitude - 0.012,
    latitude - 0.007,
    longitude + 0.012,
    latitude + 0.007,
  ].join(",");
  const osmSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude},${longitude}`;
  const gmapsHref = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;

  return (
    <section
      aria-labelledby="location-heading"
      className="rounded-2xl bg-paper p-4 shadow-[0_1px_2px_rgb(11_13_20/0.04),0_6px_16px_-12px_rgb(11_13_20/0.18)]"
    >
      <div className="flex items-center justify-between mb-3">
        <h2
          id="location-heading"
          className="flex items-center gap-2 text-[15px] font-extrabold text-ink"
        >
          <LbKonum size={18} className="text-navy" />
          Konum
        </h2>
        <a
          href={gmapsHref}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-11 items-center gap-1 text-xs font-medium text-navy hover:text-navy-dark transition-colors"
        >
          Google Maps&apos;te aç
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </a>
      </div>
      <iframe
        src={osmSrc}
        title={`${name} harita konumu`}
        className="w-full h-64 rounded-2xl border border-line/60"
        loading="lazy"
      />
    </section>
  );
}

export function HotelInfo({ hotel, className }: HotelInfoProps) {
  const {
    name,
    stars,
    address,
    description,
    facilities,
    phone,
    email,
    latitude,
    longitude,
  } = hotel;

  // Group facilities by category
  const facilityGroups = React.useMemo(() => {
    const groups = new Map<string, HotelFacilityItem[]>();
    for (const f of facilities ?? []) {
      const list = groups.get(f.categoryName) ?? [];
      list.push(f);
      groups.set(f.categoryName, list);
    }
    return groups;
  }, [facilities]);

  return (
    <div className={cn("space-y-5", className)}>
      {/* Header */}
      <div className="space-y-1.5">
        <h1 className="text-xl md:text-2xl font-bold text-ink">{name}</h1>
        <StarRating stars={stars} />
        <div className="flex items-start gap-1.5 text-muted">
          <MapPin
            className="h-4 w-4 mt-0.5 shrink-0 text-muted"
            aria-hidden="true"
          />
          <address className="text-sm not-italic leading-snug">
            {address}
          </address>
        </div>
      </div>

      {/* Description */}
      {description && (
        <section
          aria-labelledby="hotel-desc-heading"
          className="rounded-2xl bg-paper p-4 shadow-[0_1px_2px_rgb(11_13_20/0.04),0_6px_16px_-12px_rgb(11_13_20/0.18)]"
        >
          <h2
            id="hotel-desc-heading"
            className="mb-2 flex items-center gap-2 text-[15px] font-extrabold text-ink"
          >
            <LbBilgi size={18} className="text-navy" />
            Hakkında
          </h2>
          <p className="text-sm text-slate-text leading-relaxed whitespace-pre-line">
            {description}
          </p>
        </section>
      )}

      {/* Facilities */}
      {facilityGroups.size > 0 && (
        <section
          aria-labelledby="facilities-heading"
          className="rounded-2xl bg-paper p-4 shadow-[0_1px_2px_rgb(11_13_20/0.04),0_6px_16px_-12px_rgb(11_13_20/0.18)]"
        >
          <h2
            id="facilities-heading"
            className="mb-4 flex items-center gap-2 text-[15px] font-extrabold text-ink"
          >
            <LbZil size={18} className="text-navy" />
            Olanaklar
          </h2>
          <div className="space-y-5">
            {Array.from(facilityGroups.entries()).map(([category, items]) => (
              <FacilityGroup key={category} category={category} items={items} />
            ))}
          </div>
        </section>
      )}

      {/* Map */}
      {typeof latitude === "number" &&
        typeof longitude === "number" &&
        latitude !== 0 &&
        longitude !== 0 && (
          <HotelMap latitude={latitude} longitude={longitude} name={name} />
        )}

      {/* Contact */}
      {(phone || email) && (
        <section
          aria-labelledby="contact-heading"
          className="rounded-2xl bg-paper p-4 shadow-[0_1px_2px_rgb(11_13_20/0.04),0_6px_16px_-12px_rgb(11_13_20/0.18)]"
        >
          <h2
            id="contact-heading"
            className="mb-3 flex items-center gap-2 text-[15px] font-extrabold text-ink"
          >
            <LbTelefon size={18} className="text-navy" />
            İletişim
          </h2>
          {phone && (
            <a
              href={`tel:${phone}`}
              className="flex min-h-11 items-center gap-2 text-sm text-slate-text hover:text-navy-text transition-colors"
            >
              <Phone className="h-4 w-4 text-muted" aria-hidden="true" />
              {phone}
            </a>
          )}
          {email && (
            <a
              href={`mailto:${email}`}
              className="flex min-h-11 items-center gap-2 text-sm text-slate-text hover:text-navy-text transition-colors"
            >
              <Mail className="h-4 w-4 text-muted" aria-hidden="true" />
              {email}
            </a>
          )}
        </section>
      )}
    </div>
  );
}
