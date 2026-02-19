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
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { HotelDetailResponse, HotelFacilityItem } from "@/lib/royal-api/types";

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
            i < stars ? "fill-amber-400 text-amber-400" : "fill-gray-200 text-gray-200"
          )}
          aria-hidden="true"
        />
      ))}
      <span className="text-sm font-medium text-gray-600 ml-1">{stars} Yıldız</span>
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
      <h4 className="text-sm font-semibold text-gray-700 mb-2">{category}</h4>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {items.map((facility) => {
          const Icon = getFacilityIcon(facility.name);
          return (
            <li key={facility.id} className="flex items-center gap-2 text-sm text-gray-600">
              <Icon className="h-4 w-4 text-blue-500 shrink-0" aria-hidden="true" />
              {facility.name}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function HotelInfo({ hotel, className }: HotelInfoProps) {
  const { name, stars, address, description, facilities, phone, email } = hotel;

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
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{name}</h1>
        <StarRating stars={stars} />
        <div className="flex items-start gap-1.5 text-gray-500">
          <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-gray-400" aria-hidden="true" />
          <address className="text-sm not-italic leading-snug">{address}</address>
        </div>
      </div>

      {/* Description */}
      {description && (
        <section aria-labelledby="hotel-desc-heading">
          <h2 id="hotel-desc-heading" className="text-lg font-semibold text-gray-900 mb-2">
            Hakkında
          </h2>
          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
            {description}
          </p>
        </section>
      )}

      {/* Facilities */}
      {facilityGroups.size > 0 && (
        <section aria-labelledby="facilities-heading">
          <h2 id="facilities-heading" className="text-lg font-semibold text-gray-900 mb-4">
            Olanaklar
          </h2>
          <div className="space-y-5">
            {Array.from(facilityGroups.entries()).map(([category, items]) => (
              <FacilityGroup key={category} category={category} items={items} />
            ))}
          </div>
        </section>
      )}

      {/* Contact */}
      {(phone || email) && (
        <section
          aria-labelledby="contact-heading"
          className="rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-2"
        >
          <h2 id="contact-heading" className="text-sm font-semibold text-gray-700">
            İletişim
          </h2>
          {phone && (
            <a
              href={`tel:${phone}`}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors"
            >
              <Phone className="h-4 w-4 text-gray-400" aria-hidden="true" />
              {phone}
            </a>
          )}
          {email && (
            <a
              href={`mailto:${email}`}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors"
            >
              <Mail className="h-4 w-4 text-gray-400" aria-hidden="true" />
              {email}
            </a>
          )}
        </section>
      )}
    </div>
  );
}
