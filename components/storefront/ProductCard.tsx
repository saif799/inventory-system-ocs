import Link from "next/link";
import ProductMedia from "./ProductMedia";
import ProductPrice from "./ProductPrice";
import { cn } from "@/lib/utils";
import type { StorefrontProduct } from "@/lib/storefront/products";

/**
 * Design system §5. No border, no shadow, no background, no radius — a square
 * image that zooms on hover, then a three-line text block:
 *
 *   1. variant — text-sm, muted, ALWAYS UPPERCASE
 *   2. title   — font-medium, steps up once at md:
 *   3. price   — font-medium, accent Pine, suffixed " DA"
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
  return (
    <Link
      href={`/product/${product.shoeId}`}
      className={cn("group flex min-w-44 flex-col gap-4 py-2", className)}
    >
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

      <div className="flex flex-col gap-2">
        <p className="sf-body text-xs font-normal uppercase tracking-[0.12em] text-(--sf-muted)">
          {product.color.toUpperCase()}
        </p>
        <h3 className="sf-heading text-base font-medium leading-snug tracking-[-0.01em] text-wrap text-(--sf-text) md:text-xl">
          {product.modelName}
        </h3>
        <ProductPrice
          price={product.minPrice}
          compareAtPrice={product.compareAtPrice}
          size="sm"
        />
      </div>
    </Link>
  );
}
