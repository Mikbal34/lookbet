"use client";

// Usage:
// <HotelGallery images={hotel.images} />

import * as React from "react";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface GalleryImage {
  url: string;
  caption: string;
}

export interface HotelGalleryProps {
  images: GalleryImage[];
  className?: string;
}

export function HotelGallery({ images, className }: HotelGalleryProps) {
  const [activeIndex, setActiveIndex] = React.useState(0);

  const activeImage = images[activeIndex];

  const prev = () =>
    setActiveIndex((i) => (i === 0 ? images.length - 1 : i - 1));
  const next = () =>
    setActiveIndex((i) => (i === images.length - 1 ? 0 : i + 1));

  // Keyboard navigation
  React.useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  if (!images || images.length === 0) {
    return (
      <div
        className={cn(
          "w-full h-64 bg-gray-100 rounded-2xl flex items-center justify-center",
          className
        )}
        aria-label="Görsel mevcut değil"
      >
        <ImageOff className="h-10 w-10 text-gray-300" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {/* Main image */}
      <div
        className="relative w-full h-72 md:h-96 rounded-2xl overflow-hidden bg-gray-100"
        aria-label={`Galeri: ${activeImage?.caption || "Otel görseli"}`}
      >
        {activeImage ? (
          <img
            key={activeImage.url}
            src={activeImage.url}
            alt={activeImage.caption || "Otel görseli"}
            className="w-full h-full object-cover"
            loading="eager"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageOff className="h-10 w-10 text-gray-300" aria-hidden="true" />
          </div>
        )}

        {/* Caption */}
        {activeImage?.caption && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-4 py-3">
            <p className="text-white text-sm font-medium truncate">
              {activeImage.caption}
            </p>
          </div>
        )}

        {/* Counter */}
        <div className="absolute top-3 right-3 bg-black/50 text-white text-xs px-2 py-1 rounded-md">
          {activeIndex + 1} / {images.length}
        </div>

        {/* Nav arrows - only if more than one image */}
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Önceki görsel"
              className={cn(
                "absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white/80 backdrop-blur-sm",
                "flex items-center justify-center text-gray-700",
                "hover:bg-white transition-colors duration-150 shadow-sm",
                "focus:outline-none focus:ring-2 focus:ring-blue-500"
              )}
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Sonraki görsel"
              className={cn(
                "absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white/80 backdrop-blur-sm",
                "flex items-center justify-center text-gray-700",
                "hover:bg-white transition-colors duration-150 shadow-sm",
                "focus:outline-none focus:ring-2 focus:ring-blue-500"
              )}
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div
          className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-gray-200"
          role="listbox"
          aria-label="Görsel küçük resimleri"
        >
          {images.map((img, i) => (
            <button
              key={img.url}
              type="button"
              role="option"
              aria-selected={i === activeIndex}
              onClick={() => setActiveIndex(i)}
              className={cn(
                "relative shrink-0 w-20 h-14 rounded-lg overflow-hidden border-2 transition-all duration-150",
                "focus:outline-none focus:ring-2 focus:ring-blue-500",
                i === activeIndex
                  ? "border-blue-500 ring-1 ring-blue-500"
                  : "border-transparent hover:border-gray-300 opacity-70 hover:opacity-100"
              )}
            >
              <img
                src={img.url}
                alt={img.caption || `Görsel ${i + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
