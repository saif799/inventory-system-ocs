"use client";

import { useState } from "react";
import SizeSelector from "@/components/storefront/SizeSelector";
import OrderForm from "@/components/storefront/OrderForm";

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

  return (
    <div className="flex flex-col gap-5">
      <SizeSelector
        sizes={sizes}
        selectedInventoryId={selectedSize?.inventoryId ?? null}
        onSelect={setSelectedSize}
        headlinePrice={price}
        compareAtPrice={compareAtPrice}
      />

      <div className="border-t border-(--sf-line) pt-5">
        <OrderForm modelName={modelName} color={color} selectedSize={selectedSize} />
      </div>
    </div>
  );
}
