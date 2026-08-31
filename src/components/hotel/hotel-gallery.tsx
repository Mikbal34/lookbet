"use client";

// İki galeri, tek kırılım (lg = 1024px):
//
//  • lg altı: tam genişlik yatay kaydırmalı şerit + "n / toplam" sayacı.
//    Eskiden burada mozaiğin yalnızca ana görseli görünüyordu (yan görseller
//    hidden md:block, alt şerit hidden sm:flex, "+N fotoğraf" rozeti de
//    gizli olanın içindeydi) — kullanıcı başka fotoğraf olduğunu hiç
//    anlamıyordu.
//  • lg üstü: sol büyük görsel + sağda 2x2 mozaik.
//
// Herhangi bir görsele dokununca tam ekran lightbox açılır.

import * as React from "react";
import { ChevronLeft, ChevronRight, ImageOff, X, Images } from "lucide-react";
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
  const [lightbox, setLightbox] = React.useState<number | null>(null);
  const [aktif, setAktif] = React.useState(0);
  const seritRef = React.useRef<HTMLDivElement | null>(null);

  // Şerit kaydırıldıkça sayacı güncelle. Kartlar tam genişlik olduğu için
  // sıradaki görselin sırası scrollLeft / genişlik.
  const seritKaydi = () => {
    const el = seritRef.current;
    if (!el || el.clientWidth === 0) return;
    setAktif(Math.round(el.scrollLeft / el.clientWidth));
  };

  const open = (i: number) => setLightbox(i);
  const close = React.useCallback(() => setLightbox(null), []);
  const prev = React.useCallback(
    () => setLightbox((i) => (i === null ? i : i === 0 ? images.length - 1 : i - 1)),
    [images.length]
  );
  const next = React.useCallback(
    () => setLightbox((i) => (i === null ? i : i === images.length - 1 ? 0 : i + 1)),
    [images.length]
  );

  React.useEffect(() => {
    if (lightbox === null) return;
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightbox, close, prev, next]);

  if (!images || images.length === 0) {
    return (
      <div
        className={cn(
          "flex h-56 w-full items-center justify-center rounded-xl bg-gray-100",
          className
        )}
        aria-label="Görsel mevcut değil"
      >
        <ImageOff className="h-9 w-9 text-gray-300" aria-hidden="true" />
      </div>
    );
  }

  const main = images[0];
  const side = images.slice(1, 5); // sağdaki 2x2 grid için en çok 4 görsel
  const extra = images.length - 5;
  const strip = images.slice(0, 6); // alt küçük görsel şeridi

  return (
    <div className={cn("space-y-2", className)}>
      {/* Mozaik grid */}
      {/* lg altı: tam genişlik kaydırmalı şerit */}
      <div className="relative lg:hidden">
        <div
          ref={seritRef}
          onScroll={seritKaydi}
          className="no-scrollbar flex h-64 snap-x snap-mandatory overflow-x-auto rounded-xl"
        >
          {images.map((img, i) => (
            <button
              key={img.url}
              type="button"
              onClick={() => open(i)}
              className="relative h-full w-full shrink-0 snap-center bg-gray-100"
              aria-label={`Görsel ${i + 1} — büyütmek için dokun`}
            >
              <img
                src={img.url}
                alt={img.caption || `Otel görseli ${i + 1}`}
                className="h-full w-full object-cover"
                loading={i === 0 ? "eager" : "lazy"}
              />
            </button>
          ))}
        </div>

        {images.length > 1 && (
          <span
            className="pointer-events-none absolute right-3 bottom-3 rounded-full bg-ink/70 px-2.5 py-1 text-xs font-semibold text-white tabular-nums"
            aria-live="polite"
          >
            {Math.min(aktif + 1, images.length)} / {images.length}
          </span>
        )}
      </div>

      {/* lg üstü: mozaik */}
      <div className="hidden h-[380px] grid-cols-4 grid-rows-2 gap-1.5 overflow-hidden rounded-xl lg:grid">
        {/* Ana görsel */}
        <button
          type="button"
          onClick={() => open(0)}
          className="group relative col-span-2 row-span-2 overflow-hidden bg-gray-100"
          aria-label="Görselleri büyüt"
        >
          <img
            src={main.url}
            alt={main.caption || "Otel görseli"}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            loading="eager"
          />
        </button>

        {/* Yan görseller (yalnızca md+ ekranda) */}
        {side.map((img, i) => {
          const isLast = i === side.length - 1;
          return (
            <button
              key={img.url}
              type="button"
              onClick={() => open(i + 1)}
              className="group relative overflow-hidden bg-gray-100"
              aria-label={`Görsel ${i + 2}`}
            >
              <img
                src={img.url}
                alt={img.caption || `Görsel ${i + 2}`}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                loading="lazy"
              />
              {isLast && extra > 0 && (
                <span className="absolute inset-0 flex items-center justify-center gap-1.5 bg-black/55 text-sm font-semibold text-white backdrop-blur-[1px]">
                  <Images className="h-4 w-4" aria-hidden="true" />
                  +{extra} fotoğraf
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Alt küçük görsel şeridi (Booking tarzı) */}
      {images.length > 1 && (
        <div className="hidden gap-2 lg:flex">
          {strip.map((img, i) => (
            <button
              key={img.url}
              type="button"
              onClick={() => open(i)}
              className="relative h-20 flex-1 overflow-hidden rounded-lg bg-gray-100"
              aria-label={`Görsel ${i + 1}`}
            >
              <img
                src={img.url}
                alt={img.caption || `Görsel ${i + 1}`}
                className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                loading="lazy"
              />
              {i === strip.length - 1 && images.length > strip.length && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-xs font-semibold text-white">
                  +{images.length - strip.length}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox !== null && (
        <div
          className="fixed inset-0 z-[100] flex flex-col bg-black/90"
          role="dialog"
          aria-modal="true"
          aria-label="Görsel galerisi"
        >
          {/* Üst bar */}
          <div className="flex items-center justify-between px-4 py-3 text-white">
            <span className="text-sm font-medium">
              {lightbox + 1} / {images.length}
            </span>
            <button
              type="button"
              onClick={close}
              aria-label="Kapat"
              className="flex size-11 items-center justify-center rounded-full hover:bg-white/10 active:bg-white/10"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          {/* Görsel */}
          <div className="relative flex flex-1 items-center justify-center px-4 pb-4">
            <img
              key={images[lightbox].url}
              src={images[lightbox].url}
              alt={images[lightbox].caption || "Otel görseli"}
              className="max-h-full max-w-full rounded-lg object-contain"
            />

            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={prev}
                  aria-label="Önceki görsel"
                  className="absolute left-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
                >
                  <ChevronLeft className="h-6 w-6" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={next}
                  aria-label="Sonraki görsel"
                  className="absolute right-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
                >
                  <ChevronRight className="h-6 w-6" aria-hidden="true" />
                </button>
              </>
            )}

            {images[lightbox].caption && (
              <p className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-4 py-1.5 text-sm text-white">
                {images[lightbox].caption}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
