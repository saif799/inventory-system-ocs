import { db } from "@/lib/db";
import { shoes, shoeInventory, shoeImages, shoeModels } from "@/lib/schema";
import { eq, asc } from "drizzle-orm";
import { notFound } from "next/navigation";
import ProductEditClient from "./ProductEditClient";

type Props = { params: Promise<{ shoeId: string }> };

export default async function ProductEditPage({ params }: Props) {
  const { shoeId } = await params;

  const [shoe] = await db
    .select({
      id: shoes.id,
      color: shoes.color,
      priceOverride: shoes.priceOverride,
      compareAtPriceOverride: shoes.compareAtPriceOverride,
      modelBasePrice: shoeModels.basePrice,
      modelCompareAtPrice: shoeModels.compareAtPrice,
      modelName: shoeModels.modelName,
    })
    .from(shoes)
    .innerJoin(shoeModels, eq(shoes.modelId, shoeModels.id))
    .where(eq(shoes.id, shoeId))
    .limit(1);

  if (!shoe) notFound();

  const inventory = await db
    .select()
    .from(shoeInventory)
    .where(eq(shoeInventory.shoeId, shoeId));

  const images = await db
    .select()
    .from(shoeImages)
    .where(eq(shoeImages.shoeId, shoeId))
    .orderBy(asc(shoeImages.sortOrder));

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-2">
        Edit Product: {shoe.modelName} — {shoe.color}
      </h1>
      <p className="text-muted-foreground mb-8 text-sm">
        Manage pricing, per-size overrides, and the R2 image gallery.
      </p>
      <ProductEditClient shoe={shoe} inventory={inventory} images={images} />
    </div>
  );
}