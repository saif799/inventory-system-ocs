"use client";

import { formatDZD } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useT } from "@/app/i18n/client";
import Ltr from "@/components/storefront/Ltr";

/**
 * The one way a price is written on the storefront: current price in the
 * accent, and — when the item is discounted — the old price struck through
 * beside it, followed by the saving as a percentage.
 *
 * It exists because the card and the product page had drifted apart: the card
 * struck out the old price, while the product page put "Vous économisez X !"
 * on a separate line below the size picker, far from the price it referred to.
 * Same information, two shapes, and the shopper had to do the arithmetic to
 * connect them.
 *
 * `size` selects the type scale rather than exposing raw classes, so a caller
 * cannot invent a fourth price treatment.
 */
export default function ProductPrice({
  price,
  compareAtPrice,
  size = "md",
  className,
}: {
  price: number;
  compareAtPrice: number | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const { t } = useT("product");
  const onSale = compareAtPrice != null && compareAtPrice > price;
  // Rounded, not floored: "-33%" off 15000→10000 is truer than "-33%" vs "-34%"
  // only when rounding, and shoppers read the badge as approximate anyway.
  const discountPct = onSale
    ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100)
    : 0;

  const scale = {
    sm: { current: "text-base md:text-lg", old: "text-xs md:text-sm" },
    md: { current: "text-lg md:text-xl", old: "text-sm" },
    lg: { current: "text-xl md:text-2xl", old: "text-sm md:text-base" },
  }[size];

  return (
    <div className={cn("flex flex-wrap items-baseline gap-x-2 gap-y-1", className)}>
      <span
        className={cn("sf-heading font-medium text-(--sf-accent)", scale.current)}
        // The accessible name spells out the currency; "12 000 DA" is read as
        // a bare number by most screen readers.
        aria-label={t("price.current", { price: formatDZD(price) })}
      >
        {/* Prices stay an LTR run: without the isolate the bidi algorithm can
            move the "DA" suffix to the wrong end of the number in Arabic. */}
        <Ltr>{formatDZD(price)}</Ltr>
      </span>

      {onSale && (
        <>
          <span
            className={cn("sf-body text-(--sf-muted) line-through", scale.old)}
            aria-label={t("price.compareAt", { price: formatDZD(compareAtPrice) })}
          >
            <Ltr>{formatDZD(compareAtPrice)}</Ltr>
          </span>
          {discountPct > 0 && (
            <span className="sf-body rounded-(--sf-radius-sm) bg-(--sf-highlight) px-1.5 py-0.5 text-[11px] font-medium text-(--sf-highlight-fg)">
              <Ltr>−{discountPct}%</Ltr>
            </span>
          )}
        </>
      )}
    </div>
  );
}
