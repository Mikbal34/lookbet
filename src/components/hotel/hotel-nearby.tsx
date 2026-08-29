"use client";

// Otel çevresi: turistik noktalar, restoranlar, toplu taşıma, havaalanları.
// Koordinattan türetilir (mock / ileride Google Places / OSM).

import * as React from "react";
import {
  Landmark,
  UtensilsCrossed,
  TrainFront,
  Plane,
  Trees,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { LbKonum } from "@/components/ui/icons";
import type { NearbyPlace } from "@/lib/royal-api/types";

const CATEGORY_META: Record<
  NearbyPlace["category"],
  { label: string; icon: React.ElementType }
> = {
  Turistik: { label: "Popüler turistik noktalar", icon: Landmark },
  Restoran: { label: "Restoranlar ve kafeler", icon: UtensilsCrossed },
  "Toplu Taşıma": { label: "Toplu taşıma", icon: TrainFront },
  Havaalanı: { label: "En yakın havaalanları", icon: Plane },
  Doğa: { label: "Doğal güzellikler", icon: Trees },
};

const CATEGORY_ORDER: NearbyPlace["category"][] = [
  "Turistik",
  "Restoran",
  "Toplu Taşıma",
  "Doğa",
  "Havaalanı",
];

export interface HotelNearbyProps {
  places?: NearbyPlace[];
  className?: string;
}

export function HotelNearby({ places, className }: HotelNearbyProps) {
  const groups = React.useMemo(() => {
    const map = new Map<NearbyPlace["category"], NearbyPlace[]>();
    for (const p of places ?? []) {
      const list = map.get(p.category) ?? [];
      list.push(p);
      map.set(p.category, list);
    }
    return map;
  }, [places]);

  if (!places || places.length === 0) return null;

  return (
    <section
      aria-labelledby="nearby-heading"
      className={cn("space-y-4", className)}
    >
      <h2
        id="nearby-heading"
        className="flex items-center gap-2 text-[15px] font-extrabold text-ink"
      >
        <LbKonum size={18} className="text-navy" />
        Otel çevresi
      </h2>

      <div className="grid grid-cols-1 gap-x-8 gap-y-6 rounded-2xl bg-paper p-4 shadow-[0_1px_2px_rgb(11_13_20/0.04),0_6px_16px_-12px_rgb(11_13_20/0.18)] sm:grid-cols-2 lg:grid-cols-3">
        {CATEGORY_ORDER.filter((c) => groups.has(c)).map((category) => {
          const meta = CATEGORY_META[category];
          const Icon = meta.icon;
          return (
            <div key={category}>
              <h3 className="mb-2.5 flex items-center gap-1.5 text-sm font-semibold text-ink">
                <Icon className="h-4 w-4 text-navy" aria-hidden="true" />
                {meta.label}
              </h3>
              <ul className="space-y-1.5">
                {groups.get(category)!.map((p, i) => (
                  <li
                    key={i}
                    className="flex items-baseline justify-between gap-3 text-sm"
                  >
                    <span className="text-slate-text">{p.name}</span>
                    <span className="shrink-0 text-muted">{p.distance}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted">
        Tahmini en kısa yürüme/sürüş mesafeleri gösterilmiştir; gerçek mesafeler
        farklılık gösterebilir.
      </p>
    </section>
  );
}
