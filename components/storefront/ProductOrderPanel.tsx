"use client";

import { useRef, useState } from "react";
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
  const sizeSelectorRef = useRef<HTMLDivElement>(null);

  const scrollToSizeSelector = () => {
    sizeSelectorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div className="flex flex-col gap-5">
      <div ref={sizeSelectorRef}>
        <SizeSelector
          sizes={sizes}
          selectedInventoryId={selectedSize?.inventoryId ?? null}
          onSelect={setSelectedSize}
          headlinePrice={price}
          compareAtPrice={compareAtPrice}
        />
      </div>

      <div className="border-t border-(--sf-line) pt-5">
        <OrderForm
          modelName={modelName}
          color={color}
          selectedSize={selectedSize}
          onMissingSize={scrollToSizeSelector}
        />
      </div>
    </div>
  );
}
