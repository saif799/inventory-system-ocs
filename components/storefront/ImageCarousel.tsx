"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ProductMedia from "./ProductMedia";
import { cn } from "@/lib/utils";

type ImageRow = { url: string; altText: string | null };

/**
 * Design system §6 — thumbnail strip + main image.
 *
 * Layout flips from thumbs-above / image-below on mobile to thumbs-left /
 * image-right at lg:, where the block goes sticky. Both the thumbnails and the
 * main image use `object-contain`: product photography is never cropped on the
 * product page (only cards crop).
 *
 * Active thumbnail is signalled purely by border weight + the border going to
 * pure black — no scale, no opacity, no overlay, no accent colour. Hovering a
 * thumbnail scrubs the main image, matching the reference behaviour.
 */
export default function ImageCarousel({
  images,
  productName,
}: {
  images: ImageRow[];
  productName: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (images.length === 0) {
    return (
      <ProductMedia
        imageUrl={null}
        imageAlt={productName}
        label={productName}
        fit="contain"
        priority
      />
    );
  }

  const active = images[activeIndex];

  return (
    <div className="lg:sticky lg:top-24 lg:flex lg:flex-row-reverse lg:items-start lg:gap-3">
      {/* Main image */}
      <div
        className="relative w-full overflow-hidden bg-(--sf-surface)"
        style={{ aspectRatio: "var(--sf-media-ratio)", borderRadius: "var(--sf-radius-media)" }}
      >
        <Image
          src={active.url}
          alt={active.altText ?? productName}
          fill
          className="object-contain"
          sizes="(max-width: 768px) 100vw, 50vw"
          priority
        />
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => setActiveIndex((i) => (i - 1 + images.length) % images.length)}
              className="sf-float absolute left-3 top-1/2 hidden -translate-y-1/2 p-2 md:block"
              aria-label="Image précédente"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
            </button>
            <button
              type="button"
              onClick={() => setActiveIndex((i) => (i + 1) % images.length)}
              className="sf-float absolute right-3 top-1/2 hidden -translate-y-1/2 p-2 md:block"
              aria-label="Image suivante"
            >
              <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </>
        )}
      </div>

      {/* Thumbnail strip — horizontal above the image on mobile, a vertical
       * rail to the left of it at lg:. */}
      {images.length > 1 && (
        <div className="relative order-first lg:order-none lg:shrink-0">
          <div className="sf-scrollbar-hide flex gap-2 overflow-x-auto pb-1 pt-3 lg:flex-col lg:overflow-visible lg:pt-0">
            {images.map((img, idx) => {
              const isActive = idx === activeIndex;
              return (
                <button
                  key={img.url}
                  type="button"
                  aria-label={`Voir l'image ${idx + 1}`}
                  aria-pressed={isActive}
                  onClick={() => setActiveIndex(idx)}
                  onMouseOver={() => setActiveIndex(idx)}
                  onFocus={() => setActiveIndex(idx)}
                  className={cn(
                    "aspect-square w-16 shrink-0 overflow-hidden border border-(--sf-line) bg-(--sf-surface) lg:w-20",
                    isActive && "border-[1.5px] border-(--sf-text) lg:border-2",
                  )}
                  style={{ borderRadius: "var(--sf-radius-sm)" }}
                >
                  <Image
                    src={img.url}
                    alt=""
                    width={80}
                    height={80}
                    className="h-full w-full object-contain"
                  />
                </button>
              );
            })}
          </div>
          {/* Affordance for the horizontally scrollable strip on mobile. */}
          <div className="pointer-events-none absolute bottom-0 right-0 top-0 w-10 bg-gradient-to-l from-(--sf-bg) to-transparent lg:hidden" />
        </div>
      )}
    </div>
  );
}
