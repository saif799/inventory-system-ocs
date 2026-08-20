import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { shoeModels } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

type Params = { params: Promise<{ modelId: string }> };

/**
 * PATCH /api/admin/models/[modelId]
 * Updates the model-level base price and compare-at price — the root of the
 * 3-level price resolution chain (model -> colour override -> size override).
 */
export async function PATCH(request: Request, { params }: Params) {
  const { modelId } = await params;
  try {
    const body = await request.json();
    const { basePrice, compareAtPrice } = body;

    if (basePrice === undefined && compareAtPrice === undefined) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const [updated] = await db
      .update(shoeModels)
      .set({
        ...(basePrice !== undefined ? { basePrice: Number(basePrice) } : {}),
        ...(compareAtPrice !== undefined
          ? { compareAtPrice: compareAtPrice === null ? null : Number(compareAtPrice) }
          : {}),
      })
      .where(eq(shoeModels.id, modelId))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    revalidatePath("/admin/products");
    revalidatePath("/");

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
