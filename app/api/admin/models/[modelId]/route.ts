import { requireAdmin } from "@/lib/auth/guard";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { shoeModels } from "@/lib/schema";
import { and, eq, ilike, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";

type Params = { params: Promise<{ modelId: string }> };

/**
 * PATCH /api/admin/models/[modelId]
 * Updates the model's name, its archived flag, and the model-level base price
 * and compare-at price — the root of the 3-level price resolution chain
 * (model -> colour override -> size override).
 *
 * Renames are retroactive: nothing denormalises the model name, so correcting
 * a typo rewrites how every past order and arrival reads. That is the point.
 */
export async function PATCH(request: Request, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { modelId } = await params;
  try {
    const body = await request.json();
    const { basePrice, compareAtPrice, modelName, archived } = body;

    if (
      basePrice === undefined &&
      compareAtPrice === undefined &&
      modelName === undefined &&
      archived === undefined
    ) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    let nextName: string | undefined;
    if (modelName !== undefined) {
      nextName = String(modelName).trim();
      if (!nextName) {
        return NextResponse.json(
          { error: "Model name cannot be empty" },
          { status: 400 },
        );
      }

      // Guarded here rather than with a unique index: existing rows may already
      // hold duplicates, and `pnpm push` would fail building the index.
      const [clash] = await db
        .select({ id: shoeModels.id, modelName: shoeModels.modelName })
        .from(shoeModels)
        .where(and(ilike(shoeModels.modelName, nextName), ne(shoeModels.id, modelId)))
        .limit(1);

      if (clash) {
        return NextResponse.json(
          { error: `A model named "${clash.modelName}" already exists` },
          { status: 409 },
        );
      }
    }

    const [updated] = await db
      .update(shoeModels)
      .set({
        ...(basePrice !== undefined ? { basePrice: Number(basePrice) } : {}),
        ...(compareAtPrice !== undefined
          ? { compareAtPrice: compareAtPrice === null ? null : Number(compareAtPrice) }
          : {}),
        ...(nextName !== undefined ? { modelName: nextName } : {}),
        ...(archived !== undefined ? { archived: Boolean(archived) } : {}),
      })
      .where(eq(shoeModels.id, modelId))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    revalidatePath("/admin/products");
    revalidatePath("/admin");
    revalidatePath("/[lng]", "layout");

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
