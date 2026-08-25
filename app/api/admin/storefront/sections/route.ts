import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { storefrontSections, storefrontSectionItems } from "@/lib/schema";
import { asc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

/** GET /api/admin/storefront/sections — sections with their item count. */
export async function GET() {
  try {
    const sections = await db
      .select({
        id: storefrontSections.id,
        title: storefrontSections.title,
        subtitle: storefrontSections.subtitle,
        ctaHref: storefrontSections.ctaHref,
        sortOrder: storefrontSections.sortOrder,
        isVisible: storefrontSections.isVisible,
        itemCount: sql<number>`count(${storefrontSectionItems.id})`.mapWith(Number),
      })
      .from(storefrontSections)
      .leftJoin(storefrontSectionItems, eq(storefrontSectionItems.sectionId, storefrontSections.id))
      .groupBy(storefrontSections.id)
      .orderBy(asc(storefrontSections.sortOrder));

    return NextResponse.json(sections);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

/** POST /api/admin/storefront/sections — create a section, appended to the end. */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const title: string = body?.title?.trim();
    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const [{ maxSortOrder }] = await db
      .select({ maxSortOrder: sql<number>`coalesce(max(${storefrontSections.sortOrder}), -1)`.mapWith(Number) })
      .from(storefrontSections);

    const [created] = await db
      .insert(storefrontSections)
      .values({
        title,
        subtitle: body?.subtitle?.trim() || null,
        ctaHref: body?.ctaHref?.trim() || null,
        sortOrder: maxSortOrder + 1,
      })
      .returning();

    revalidatePath("/[lng]", "layout");
    revalidatePath("/admin/storefront");
    return NextResponse.json(created);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

/** PATCH /api/admin/storefront/sections — bulk reorder: [{ id, sortOrder }]. */
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const order: { id: string; sortOrder: number }[] = Array.isArray(body?.order) ? body.order : [];
    if (order.length === 0) {
      return NextResponse.json({ error: "order is required" }, { status: 400 });
    }

    await Promise.all(
      order.map(({ id, sortOrder }) =>
        db.update(storefrontSections).set({ sortOrder, updatedAt: new Date() }).where(eq(storefrontSections.id, id)),
      ),
    );

    revalidatePath("/[lng]", "layout");
    revalidatePath("/admin/storefront");
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
