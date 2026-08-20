/**
 * Resolves the final display price for a specific shoe size variant.
 *
 * Priority: size-specific priceOverride -> shoe (colour) priceOverride -> model basePrice
 */
export function resolveProductPrice(
  modelBasePrice: number,
  shoePriceOverride: number | null | undefined,
  sizePriceOverride: number | null | undefined,
): number {
  if (sizePriceOverride != null) return sizePriceOverride;
  if (shoePriceOverride != null) return shoePriceOverride;
  return modelBasePrice;
}

/**
 * Resolves the compare-at ("original") price used for strikethrough display.
 *
 * Priority: shoe (colour) compareAtPriceOverride -> model compareAtPrice.
 * Null means no strikethrough should be shown.
 */
export function resolveCompareAtPrice(
  modelCompareAt: number | null,
  shoeCompareAtOverride: number | null | undefined,
): number | null {
  if (shoeCompareAtOverride != null) return shoeCompareAtOverride;
  return modelCompareAt;
}
