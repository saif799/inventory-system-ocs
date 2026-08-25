"use client";

import { CheckCircle2 } from "lucide-react";
import { formatDZD } from "@/lib/format";
import Ltr from "../Ltr";
type SizeOption = {
  inventoryId: string;
  size: string;
  quantity: number;
  resolvedPrice: number;
};

/**
 * RTL twin of SizeSelector — same chips, same step-1 framing, Arabic labels.
 * Sizes and prices come from the DB, so they are printed verbatim in an LTR
 * run.
 */
export default function SizeSelectorAr({
  sizes,
  selectedInventoryId,
  onSelect,
  headlinePrice,
}: {
  sizes: SizeOption[];
  selectedInventoryId: string | null;
  onSelect: (size: SizeOption) => void;
  headlinePrice?: number;
}) {
  const selected = sizes.find((s) => s.inventoryId === selectedInventoryId);

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
          اختر مقاسك
        </h2>
      </div>

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
            "اختر مقاسك للمتابعة"
          ) : selected.quantity <= 3 ? (
            <>
              المقاس <Ltr>{selected.size}</Ltr> — بقي {selected.quantity} فقط
            </>
          ) : (
            <>
              تم اختيار المقاس <Ltr>{selected.size}</Ltr>
            </>
          )}
        </span>
      </div>

      {sizePriceDiffers && (
        <div className="space-y-1">
          <p className="text-xs text-(--sf-muted)">
            سعر المقاس <Ltr>{selected!.size}</Ltr>
          </p>
          <Ltr className="sf-heading text-lg font-medium text-(--sf-accent)">
            {formatDZD(selected!.resolvedPrice)}
          </Ltr>
        </div>
      )}
    </div>
  );
}
