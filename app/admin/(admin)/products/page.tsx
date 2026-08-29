import { db } from "@/lib/db";
import { shoeModels, shoes, shoeInventory, shoeImages } from "@/lib/schema";
import { resolveProductPrice } from "@/lib/helpers";
import ProductsAdminClient from "./ProductsAdminClient";
import type { ModelRow, VariantRow } from "./types";

export const dynamic = "force-dynamic";

export default async function ProductsAdminPage() {
  const [models, shoeRows, inventoryRows, imageRows] = await Promise.all([
    db.select().from(shoeModels),
    db.select().from(shoes),
    db
      .select({ shoeId: shoeInventory.shoeId, quantity: shoeInventory.quantity })
      .from(shoeInventory),
    db.select({ shoeId: shoeImages.shoeId }).from(shoeImages),
  ]);

  const stockByShoe = new Map<string, number>();
  for (const r of inventoryRows) {
    stockByShoe.set(r.shoeId, (stockByShoe.get(r.shoeId) ?? 0) + r.quantity);
  }
  const imagesByShoe = new Map<string, number>();
  for (const r of imageRows) {
    imagesByShoe.set(r.shoeId, (imagesByShoe.get(r.shoeId) ?? 0) + 1);
  }

  const modelsById = new Map<string, ModelRow>(
    models.map((m) => [
      m.id,
      {
        modelId: m.id,
        modelName: m.modelName,
        basePrice: m.basePrice,
        compareAtPrice: m.compareAtPrice,
        archived: m.archived,
        variants: [],
      },
    ]),
  );

  for (const s of shoeRows) {
    const model = modelsById.get(s.modelId);
    if (!model) continue;
    const effectivePrice = resolveProductPrice(model.basePrice, s.priceOverride, null);
    const variant: VariantRow = {
      shoeId: s.id,
      color: s.color,
      priceOverride: s.priceOverride,
      compareAtPriceOverride: s.compareAtPriceOverride,
      effectivePrice,
      imageCount: imagesByShoe.get(s.id) ?? 0,
      totalStock: stockByShoe.get(s.id) ?? 0,
      hasPrice: effectivePrice > 0,
      archived: s.archived,
    };
    model.variants.push(variant);
  }

  // db.select() has no order, so without this colours reshuffle between loads.
  for (const model of modelsById.values()) {
    model.variants.sort((a, b) => a.color.localeCompare(b.color));
  }

  const modelList = Array.from(modelsById.values()).sort((a, b) =>
    a.modelName.localeCompare(b.modelName),
  );
  // Archived rows are retired on purpose — they should stop nagging.
  const liveVariants = (m: ModelRow) =>
    m.archived ? [] : m.variants.filter((v) => !v.archived);
  const unpricedCount = modelList.reduce(
    (sum, m) => sum + liveVariants(m).filter((v) => !v.hasPrice).length,
    0,
  );
  const unphotographedCount = modelList.reduce(
    (sum, m) => sum + liveVariants(m).filter((v) => v.imageCount === 0).length,
    0,
  );

  return (
    <ProductsAdminClient
      models={modelList}
      unpricedCount={unpricedCount}
      unphotographedCount={unphotographedCount}
    />
  );
}
