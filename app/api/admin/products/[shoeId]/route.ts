import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { shoes, shoeInventory, shoeImages } from "@/lib/schema";
import { and, asc, eq, ilike, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";

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
      .orderBy(asc(shoeImages.sortOrder), asc(shoeImages.createdAt));

    return NextResponse.json({ ...shoe, inventory, images });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/products/[shoeId]
 * Updates the colour name, the archived flag, pricing, size-level price
 * overrides, and image sort/primary flags.
 */
export async function PATCH(request: Request, { params }: Params) {
  const { shoeId } = await params;
  try {
    const body = await request.json();
    const { priceOverride, compareAtPriceOverride, priceOverrides, imageSortOrders, color, archived } =
      body;

    let nextColor: string | undefined;
    if (color !== undefined) {
      nextColor = String(color).trim();
      if (!nextColor) {
        return NextResponse.json({ error: "Colour cannot be empty" }, { status: 400 });
      }

      const [current] = await db
        .select({ modelId: shoes.modelId })
        .from(shoes)
        .where(eq(shoes.id, shoeId))
        .limit(1);

      if (!current) {
        return NextResponse.json({ error: "Shoe not found" }, { status: 404 });
      }

      // Colours only have to be unique within their own model — "Black" under
      // two different models is normal, "Black" twice under one is a duplicate.
      const [clash] = await db
        .select({ color: shoes.color })
        .from(shoes)
        .where(
          and(
            eq(shoes.modelId, current.modelId),
            ilike(shoes.color, nextColor),
            ne(shoes.id, shoeId),
          ),
        )
        .limit(1);

      if (clash) {
        return NextResponse.json(
          { error: `This model already has a "${clash.color}" colour` },
          { status: 409 },
        );
      }
    }

    if (
      priceOverride !== undefined ||
      compareAtPriceOverride !== undefined ||
      nextColor !== undefined ||
      archived !== undefined
    ) {
      await db
        .update(shoes)
        .set({
          ...(priceOverride !== undefined
            ? { priceOverride: priceOverride === null ? null : Number(priceOverride) }
            : {}),
          ...(compareAtPriceOverride !== undefined
            ? { compareAtPriceOverride: compareAtPriceOverride === null ? null : Number(compareAtPriceOverride) }
            : {}),
          ...(nextColor !== undefined ? { color: nextColor } : {}),
          ...(archived !== undefined ? { archived: Boolean(archived) } : {}),
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

    revalidatePath("/admin/products");
    revalidatePath("/admin");
    revalidatePath("/");

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}