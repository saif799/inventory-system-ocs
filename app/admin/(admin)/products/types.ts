/**
 * The shape the server component hands the client list. Lives apart from the
 * client component so the pure filter logic in params.ts can name it without
 * pulling a "use client" module into a test.
 */

export type VariantRow = {
  shoeId: string;
  color: string;
  priceOverride: number | null;
  compareAtPriceOverride: number | null;
  effectivePrice: number;
  imageCount: number;
  totalStock: number;
  hasPrice: boolean;
  archived: boolean;
};

export type ModelRow = {
  modelId: string;
  modelName: string;
  basePrice: number;
  compareAtPrice: number | null;
  archived: boolean;
  variants: VariantRow[];
};
