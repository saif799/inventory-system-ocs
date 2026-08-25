"use client";

import Link from "next/link";
import { useRef, useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ProductCard from "./ProductCard";
import type { StorefrontProduct } from "@/lib/storefront/products";
import { useLocale, useLocalePath, useT } from "@/app/i18n/client";

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
  const { t } = useT("home");
  const localeHref = useLocalePath();
  const rtl = useLocale() === "ar";

  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollStart, setCanScrollStart] = useState(false);
  const [canScrollEnd, setCanScrollEnd] = useState(false);

  // Direction-agnostic. In RTL browsers report scrollLeft as 0 at the start and
  // increasingly *negative* toward the end, so the raw value cannot be compared
  // against 0/scrollWidth the way an LTR-only version does — the arrows would
  // come up permanently disabled in Arabic.
  const updateArrows = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const pos = Math.abs(el.scrollLeft);
    setCanScrollStart(pos > 4);
    setCanScrollEnd(pos < max - 4);
  }, []);

  useEffect(() => {
    updateArrows();
  }, [updateArrows, products.length]);

  /** `direction` is 1 for "further along the rail", -1 for "back". */
  const scrollBy = (direction: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    const sign = rtl ? -1 : 1;
    el.scrollBy({
      left: sign * direction * el.clientWidth * 0.9,
      behavior: "smooth",
    });
  };

  if (products.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-14 lg:px-8">
      <div className="mb-6 flex items-end justify-between gap-4 border-b border-(--sf-line) pb-4">
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
            href={localeHref(ctaHref)}
            className="sf-body shrink-0 text-xs font-medium uppercase tracking-[0.12em] text-(--sf-accent) transition-opacity hover:opacity-75"
          >
            {t("carousel.seeAll")}
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
          aria-label={t("carousel.previous")}
          disabled={!canScrollStart}
          onClick={() => scrollBy(-1)}
          className="sf-float absolute start-3 top-[30%] hidden h-9 w-9 items-center justify-center md:flex"
        >
          {/* Chevrons are directional glyphs, not layout — mirror them. */}
          <ChevronLeft className="h-4 w-4 rtl:-scale-x-100" strokeWidth={1.5} />
        </button>
        <button
          type="button"
          aria-label={t("carousel.next")}
          disabled={!canScrollEnd}
          onClick={() => scrollBy(1)}
          className="sf-float absolute end-3 top-[30%] hidden h-9 w-9 items-center justify-center md:flex"
        >
          <ChevronRight className="h-4 w-4 rtl:-scale-x-100" strokeWidth={1.5} />
        </button>
      </div>
    </section>
  );
}
