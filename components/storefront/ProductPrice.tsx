import { formatDZD } from "@/lib/format";
import { cn } from "@/lib/utils";

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
        aria-label={`Prix : ${formatDZD(price)}`}
      >
        {formatDZD(price)}
      </span>

      {onSale && (
        <>
          <span
            className={cn("sf-body text-(--sf-muted) line-through", scale.old)}
            aria-label={`Ancien prix : ${formatDZD(compareAtPrice)}`}
          >
            {formatDZD(compareAtPrice)}
          </span>
          {discountPct > 0 && (
            <span className="sf-heading rounded-(--sf-radius-sm) bg-(--sf-accent) px-1.5 py-0.5 text-[11px] font-medium text-(--sf-accent-fg)">
              −{discountPct}%
            </span>
          )}
        </>
      )}
    </div>
  );
}
