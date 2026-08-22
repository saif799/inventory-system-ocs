import Link from "next/link";
import ProductMedia from "./ProductMedia";
import ProductPrice from "./ProductPrice";
import { cn } from "@/lib/utils";
import type { StorefrontProduct } from "@/lib/storefront/products";

/**
 * Design system §5. No border, no shadow, no background, no radius — a square
 * image that zooms on hover, then a three-line text block:
 *
 *   1. title   — font-medium, steps up once at md:
 *   2. variant — text-sm, muted, ALWAYS UPPERCASE
 *   3. price   — font-medium, accent purple, suffixed " DA"
 */
export default function ProductCard({
  product,
  className,
  priority = false,
}: {
  product: StorefrontProduct;
  className?: string;
  priority?: boolean;
}) {
  const onSale = product.compareAtPrice != null && product.compareAtPrice > product.minPrice;

  return (
    <Link
      href={`/product/${product.shoeId}`}
      className={cn("group flex min-w-44 flex-col gap-5 py-2", className)}
    >
      <div className="relative">
        <ProductMedia
          imageUrl={product.primaryImageUrl}
          imageAlt={
            product.primaryImageAlt ??
            // Falls back to a descriptive phrase, not just the name: alt text
            // is the only textual signal an image search has to go on.
            `${product.modelName} ${product.color} — chaussure de basketball authentique`
          }
          label={`${product.modelName} ${product.color}`}
          priority={priority}
          zoomOnHover
        />
        {onSale && (
          <span className="sf-heading absolute left-0 top-0 bg-(--sf-ink) px-2 py-1 text-[10px] font-medium tracking-wide text-(--sf-ink-fg)">
            PROMO
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <h3 className="sf-heading text-base font-medium text-wrap text-(--sf-text) md:text-xl">
          {product.modelName}
        </h3>
        <p className="sf-body text-sm text-(--sf-muted) md:text-lg">
          {product.color.toUpperCase()}
        </p>
        <ProductPrice
          price={product.minPrice}
          compareAtPrice={product.compareAtPrice}
          size="sm"
        />
      </div>
    </Link>
  );
}
