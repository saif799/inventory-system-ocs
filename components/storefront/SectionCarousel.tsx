"use client";

import Link from "next/link";
import { useRef, useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ProductCard from "./ProductCard";
import type { StorefrontProduct } from "@/lib/storefront/products";

/**
 * Design system §9.3 — a horizontal rail reusing the product card at a
 * basis-controlled width, so the next card peeks. Arrows are the system's one
 * flourish: floating white circles with a wide zero-offset glow (`.sf-float`).
 */
export default function SectionCarousel({
  title,
  subtitle,
  ctaHref,
  products,
}: {
  title: string;
  subtitle?: string | null;
  ctaHref?: string | null;
  products: StorefrontProduct[];
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateArrows = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateArrows();
  }, [updateArrows, products.length]);

  const scrollBy = (direction: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.9, behavior: "smooth" });
  };

  if (products.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-14 lg:px-8">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h2 className="sf-heading text-xl font-medium text-(--sf-text) md:text-2xl">
            {title}
          </h2>
          {subtitle && (
            <p className="sf-body mt-1 text-sm font-normal text-(--sf-muted)">{subtitle}</p>
          )}
        </div>
        {ctaHref && (
          <Link
            href={ctaHref}
            className="sf-body shrink-0 text-sm text-(--sf-muted) transition-colors hover:font-medium hover:text-(--sf-text)"
          >
            Tout voir
          </Link>
        )}
      </div>

      <div className="relative">
        <div
          ref={trackRef}
          onScroll={updateArrows}
          className="sf-scrollbar-hide flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth md:gap-4"
        >
          {products.map((product, i) => (
            <div
              key={product.shoeId}
              className="w-[68vw] shrink-0 snap-start sm:w-[42vw] md:w-[30vw] lg:w-[23vw]"
            >
              <ProductCard product={product} priority={i < 4} />
            </div>
          ))}
        </div>

        <button
          type="button"
          aria-label="Précédent"
          disabled={!canScrollLeft}
          onClick={() => scrollBy(-1)}
          className="sf-float absolute left-3 top-[30%] hidden h-9 w-9 items-center justify-center md:flex"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
        </button>
        <button
          type="button"
          aria-label="Suivant"
          disabled={!canScrollRight}
          onClick={() => scrollBy(1)}
          className="sf-float absolute right-3 top-[30%] hidden h-9 w-9 items-center justify-center md:flex"
        >
          <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </div>
    </section>
  );
}
