import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { shoes, shoeInventory, shoeImages } from "@/lib/schema";
import { eq, asc } from "drizzle-orm";

type Params = { params: Promise<{ shoeId: string }> };

/**
 * GET /api/admin/products/[shoeId]
 * Returns the shoe with its images and inventory for the admin edit page.
 */
export async function GET(_req: Request, { params }: Params) {
  const { shoeId } = await params;
  try {
    const [shoe] = await db.select().from(shoes).where(eq(shoes.id, shoeId)).limit(1);
    if (!shoe) return NextResponse.json({ error: "Shoe not found" }, { status: 404 });

    const inventory = await db
      .select()
      .from(shoeInventory)
      .where(eq(shoeInventory.shoeId, shoeId));

    const images = await db
      .select()
      .from(shoeImages)
      .where(eq(shoeImages.shoeId, shoeId))
      .orderBy(asc(shoeImages.sortOrder));

    return NextResponse.json({ ...shoe, inventory, images });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/products/[shoeId]
 * Updates pricing, size-level price overrides, and image sort/primary flags.
 */
export async function PATCH(request: Request, { params }: Params) {
  const { shoeId } = await params;
  try {
    const body = await request.json();
    const { priceOverride, compareAtPriceOverride, priceOverrides, imageSortOrders } = body;

    if (priceOverride !== undefined || compareAtPriceOverride !== undefined) {
      await db
        .update(shoes)
        .set({
          ...(priceOverride !== undefined
            ? { priceOverride: priceOverride === null ? null : Number(priceOverride) }
            : {}),
          ...(compareAtPriceOverride !== undefined
            ? { compareAtPriceOverride: compareAtPriceOverride === null ? null : Number(compareAtPriceOverride) }
            : {}),
        })
        .where(eq(shoes.id, shoeId));
    }

    if (Array.isArray(priceOverrides)) {
      await Promise.all(
        priceOverrides.map(({ inventoryId, priceOverride }: { inventoryId: string; priceOverride: number | null }) =>
          db
            .update(shoeInventory)
            .set({ priceOverride })
            .where(eq(shoeInventory.id, inventoryId))
        )
      );
    }

    if (Array.isArray(imageSortOrders)) {
      await Promise.all(
        imageSortOrders.map(
          ({ imageId, sortOrder, isPrimary }: { imageId: string; sortOrder: number; isPrimary: boolean }) =>
            db
              .update(shoeImages)
              .set({ sortOrder, isPrimary })
              .where(eq(shoeImages.id, imageId))
        )
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}