import { requireAdmin } from "@/lib/auth/guard";
import { NextResponse } from "next/server";
import { db, txClient } from "@/lib/db";
import { storefrontCollections, storefrontCollectionItems } from "@/lib/schema";
import { nextCollectionSlug } from "@/lib/storefront/collections";
import { asc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

/** GET /api/admin/collections — collections with their pick count. */
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const collections = await db
      .select({
        id: storefrontCollections.id,
        title: storefrontCollections.title,
        subtitle: storefrontCollections.subtitle,
        slug: storefrontCollections.slug,
        imageKey: storefrontCollections.imageKey,
        imageUrl: storefrontCollections.imageUrl,
        imageAlt: storefrontCollections.imageAlt,
        sortOrder: storefrontCollections.sortOrder,
        isVisible: storefrontCollections.isVisible,
        itemCount: sql<number>`count(${storefrontCollectionItems.id})`.mapWith(Number),
      })
      .from(storefrontCollections)
      .leftJoin(
        storefrontCollectionItems,
        eq(storefrontCollectionItems.collectionId, storefrontCollections.id),
      )
      .groupBy(storefrontCollections.id)
      .orderBy(asc(storefrontCollections.sortOrder));

    return NextResponse.json(collections);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

/**
 * POST /api/admin/collections — create a Collection, appended to the end.
 *
 * The slug is derived from the title here and never again: it is public API,
 * and a later title tweak must not silently 404 a link already in an Instagram
 * bio (ADR-0006). Changing it takes an explicit PATCH.
 */
export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const body = await request.json();
    const title: string = body?.title?.trim();
    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const [{ maxSortOrder }] = await db
      .select({
        maxSortOrder:
          sql<number>`coalesce(max(${storefrontCollections.sortOrder}), -1)`.mapWith(Number),
      })
      .from(storefrontCollections);

    const [created] = await db
      .insert(storefrontCollections)
      .values({
        title,
        subtitle: body?.subtitle?.trim() || null,
        slug: await nextCollectionSlug(title),
        sortOrder: maxSortOrder + 1,
      })
      .returning();

    revalidatePath("/[lng]", "layout");
    revalidatePath("/admin/collections");
    return NextResponse.json(created);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

/** PATCH /api/admin/collections — bulk reorder: [{ id, sortOrder }]. */
export async function PATCH(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const body = await request.json();
    const order: { id: string; sortOrder: number }[] = Array.isArray(body?.order) ? body.order : [];
    if (order.length === 0) {
      return NextResponse.json({ error: "order is required" }, { status: 400 });
    }

    // One transaction, not Promise.all: a partial failure would leave the grid
    // half-reordered, with two Collections claiming the same sortOrder.
    await txClient().transaction(async (tx) => {
      for (const { id, sortOrder } of order) {
        await tx
          .update(storefrontCollections)
          .set({ sortOrder, updatedAt: new Date() })
          .where(eq(storefrontCollections.id, id));
      }
    });

    revalidatePath("/[lng]", "layout");
    revalidatePath("/admin/collections");
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
