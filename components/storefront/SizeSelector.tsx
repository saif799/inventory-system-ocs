"use client";

import { CheckCircle2 } from "lucide-react";
import ProductPrice from "@/components/storefront/ProductPrice";
import Ltr from "@/components/storefront/Ltr";
import { Trans, useT } from "@/app/i18n/client";

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
 *
 * The whole block is framed as "step 1" — a bordered card with a numbered
 * badge and a status line beneath the chips — because it gates step 2
 * (the order form dims until a size is picked). See OrderForm.
 *
 * The status line uses <Trans> rather than a plain t() call because the size
 * has to sit inside an LTR isolate *within* the sentence, and Arabic puts it
 * in a different position than French ("Pointure 42 sélectionnée" vs
 * "تم اختيار المقاس 42"). Concatenating around t() would hardcode French word
 * order into the component.
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
  const { t } = useT("product");
  const selected = sizes.find((s) => s.inventoryId === selectedInventoryId);

  // Per-size price overrides are rare (see the 3-level resolution in
  // lib/helpers). Repeating the headline price here on every selection was a
  // third copy of the same number; show it only when it genuinely differs.
  const sizePriceDiffers =
    selected != null &&
    selected.resolvedPrice > 0 &&
    headlinePrice != null &&
    selected.resolvedPrice !== headlinePrice;

  const statusColor = selected ? "var(--sf-accent)" : "var(--sf-text)";

  return (
    <div
      className="sf-body space-y-4 border border-(--sf-text) bg-(--sf-surface) p-5"
      style={{ borderRadius: "var(--sf-radius)" }}
    >
      <div className="flex items-baseline gap-3">
        <span
          className="flex h-[22px] min-w-[22px] translate-y-[3px] items-center justify-center bg-(--sf-ink) text-xs font-medium text-(--sf-ink-fg)"
          style={{ borderRadius: "var(--sf-radius-sm)" }}
        >
          1
        </span>
        <h2 className="text-sm font-medium text-(--sf-text) md:text-xl">
          {t("size.heading")}
        </h2>
      </div>

      {/* Sizes are catalog data and numeric: the whole run stays LTR so the
          chips read left-to-right (39, 40, 41…) in both locales. */}
      <div className="flex flex-wrap gap-2 py-1" dir="ltr">
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

      <div className="flex items-center gap-2 border-t border-(--sf-line) pt-3">
        <CheckCircle2
          className="h-4 w-4 shrink-0"
          strokeWidth={1.8}
          style={{ color: statusColor }}
        />
        <span className="text-sm font-medium" style={{ color: statusColor }}>
          {!selected ? (
            t("size.prompt")
          ) : selected.quantity <= 3 ? (
            // `count` drives i18next's plural selection, which delegates to
            // Intl.PluralRules — Arabic gets all six CLDR categories for free.
            <Trans
              t={t}
              i18nKey="size.low"
              count={selected.quantity}
              values={{ size: selected.size, count: selected.quantity }}
              components={[<Ltr key="size" />]}
            />
          ) : (
            <Trans
              t={t}
              i18nKey="size.selected"
              values={{ size: selected.size }}
              components={[<Ltr key="size" />]}
            />
          )}
        </span>
      </div>

      {sizePriceDiffers && (
        <div className="space-y-1">
          <p className="text-xs text-(--sf-muted)">
            <Trans
              t={t}
              i18nKey="size.priceFor"
              values={{ size: selected!.size }}
              components={[<Ltr key="size" />]}
            />
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
