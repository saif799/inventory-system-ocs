"use client";

import ProductPrice from "@/components/storefront/ProductPrice";

type SizeOption = {
  inventoryId: string;
  size: string;
  quantity: number;
  resolvedPrice: number;
};

/**
 * Design system §8.1 — the size chip. A 56px square, 4px radius, white with a
 * 1px token border and explicitly NO shadow; selected drops the border and
 * fills with ink. Out of stock uses the uniform 50% disabled treatment.
 * All of that lives in the shared `.sf-chip` recipe in globals.css.
 */
export default function SizeSelector({
  sizes,
  selectedInventoryId,
  onSelect,
  headlinePrice,
  compareAtPrice = null,
}: {
  sizes: SizeOption[];
  selectedInventoryId: string | null;
  onSelect: (size: SizeOption) => void;
  /** The price already shown beside the title, so this block can stay quiet
   *  unless the chosen size actually costs something different. */
  headlinePrice?: number;
  compareAtPrice?: number | null;
}) {
  const selected = sizes.find((s) => s.inventoryId === selectedInventoryId);

  // Per-size price overrides are rare (see the 3-level resolution in
  // lib/helpers). Repeating the headline price here on every selection was a
  // third copy of the same number; show it only when it genuinely differs.
  const sizePriceDiffers =
    selected != null &&
    selected.resolvedPrice > 0 &&
    headlinePrice != null &&
    selected.resolvedPrice !== headlinePrice;

  return (
    <div className="sf-body space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-(--sf-text) md:text-xl">
          Choisir une pointure
        </h2>
        {selected && (
          <p className="text-sm">
            {selected.quantity <= 3 ? (
              <span className="font-medium text-(--sf-accent)">
                Plus que {selected.quantity} en stock
              </span>
            ) : (
              <span className="text-(--sf-muted)">{selected.quantity} en stock</span>
            )}
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2 py-1">
        {sizes.map((s) => {
          const outOfStock = s.quantity === 0;
          const isActive = s.inventoryId === selectedInventoryId;
          return (
            <button
              key={s.inventoryId}
              type="button"
              disabled={outOfStock}
              aria-pressed={isActive}
              data-active={isActive}
              onClick={() => !outOfStock && onSelect(s)}
              className="sf-chip size-[3.2rem] text-base font-medium md:size-14 md:text-xl"
            >
              {s.size}
            </button>
          );
        })}
      </div>

      {sizePriceDiffers && (
        <div className="space-y-1">
          <p className="text-xs text-(--sf-muted)">
            Prix pour la pointure {selected!.size}
          </p>
          <ProductPrice
            price={selected!.resolvedPrice}
            compareAtPrice={compareAtPrice}
            size="md"
          />
        </div>
      )}
    </div>
  );
}
