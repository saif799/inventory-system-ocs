"use client";

import { useState } from "react";
import SizeSelector from "@/components/storefront/SizeSelector";
import OrderForm from "@/components/storefront/OrderForm";
import { formatDA } from "@/lib/format";

type SizeOption = {
  inventoryId: string;
  size: string;
  quantity: number;
  resolvedPrice: number;
};

export default function ProductOrderPanel({
  modelName,
  color,
  sizes,
  price,
  compareAtPrice,
}: {
  modelName: string;
  color: string;
  sizes: SizeOption[];
  price: number;
  compareAtPrice: number | null;
}) {
  const [selectedSize, setSelectedSize] = useState<SizeOption | null>(null);
  const effectivePrice = selectedSize?.resolvedPrice ?? price;

  return (
    <div className="flex flex-col gap-5">
      <SizeSelector
        sizes={sizes}
        selectedInventoryId={selectedSize?.inventoryId ?? null}
        onSelect={setSelectedSize}
      />

      {compareAtPrice != null && compareAtPrice > effectivePrice && (
        <p className="sf-body text-sm font-medium text-(--sf-accent)">
          Vous économisez {formatDA(compareAtPrice - effectivePrice)} !
        </p>
      )}

      <div className="border-t border-(--sf-line) pt-5">
        <OrderForm modelName={modelName} color={color} selectedSize={selectedSize} />
      </div>
    </div>
  );
}
