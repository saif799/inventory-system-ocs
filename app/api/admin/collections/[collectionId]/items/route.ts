import { requireAdmin } from "@/lib/auth/guard";
import { NextResponse } from "next/server";
import { txClient } from "@/lib/db";
import { storefrontCollectionItems } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

type Params = { params: Promise<{ collectionId: string }> };

/**
 * PUT /api/admin/collections/[collectionId]/items
 * Replaces the Collection's whole pick list in one transaction — idempotent,
 * covers add/remove/reorder in a single call. Body: { shoeIds: string[] }
 * (already in the desired display order).
 */
export async function PUT(request: Request, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { collectionId } = await params;
  try {
    const body = await request.json();
    const shoeIds: string[] = Array.isArray(body?.shoeIds) ? body.shoeIds : [];

    await txClient().transaction(async (tx) => {
      await tx
        .delete(storefrontCollectionItems)
        .where(eq(storefrontCollectionItems.collectionId, collectionId));
      if (shoeIds.length > 0) {
        await tx.insert(storefrontCollectionItems).values(
          shoeIds.map((shoeId, index) => ({
            collectionId,
            shoeId,
            sortOrder: index,
          })),
        );
      }
    });

    revalidatePath("/[lng]", "layout");
    revalidatePath("/admin/collections");
    return NextResponse.json({ success: true, count: shoeIds.length });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
