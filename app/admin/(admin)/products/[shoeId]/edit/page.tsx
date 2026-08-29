import { db } from "@/lib/db";
import { shoes, shoeInventory, shoeImages, shoeModels } from "@/lib/schema";
import { eq, asc } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import AdminPage from "@/components/admin/AdminPage";
import ProductEditClient from "./ProductEditClient";

type Props = { params: Promise<{ shoeId: string }> };

export default async function ProductEditPage({ params }: Props) {
  const { shoeId } = await params;

  const [shoe] = await db
    .select({
      id: shoes.id,
      color: shoes.color,
      archived: shoes.archived,
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
    .orderBy(asc(shoeImages.sortOrder), asc(shoeImages.createdAt));

  return (
    <AdminPage
      title={`Edit Product: ${shoe.modelName} — ${shoe.color}`}
      description="Manage pricing, per-size overrides, and the R2 image gallery."
      width="narrow"
      actions={
        /* Also half the stale-list fix: a forward Link navigation refetches
           this force-dynamic page, where browser Back replays the cached RSC
           payload. */
        <Link
          href="/admin/products"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to products
        </Link>
      }
    >
      <ProductEditClient shoe={shoe} inventory={inventory} images={images} />
    </AdminPage>
  );
}