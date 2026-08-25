import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { storefrontSections } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

type Params = { params: Promise<{ sectionId: string }> };

/** PATCH /api/admin/storefront/sections/[sectionId] — rename / re-describe / show-hide. */
export async function PATCH(request: Request, { params }: Params) {
  const { sectionId } = await params;
  try {
    const body = await request.json();
    const { title, subtitle, ctaHref, isVisible } = body;

    const [updated] = await db
      .update(storefrontSections)
      .set({
        ...(title !== undefined ? { title: String(title).trim() } : {}),
        ...(subtitle !== undefined ? { subtitle: subtitle ? String(subtitle).trim() : null } : {}),
        ...(ctaHref !== undefined ? { ctaHref: ctaHref ? String(ctaHref).trim() : null } : {}),
        ...(isVisible !== undefined ? { isVisible: Boolean(isVisible) } : {}),
        updatedAt: new Date(),
      })
      .where(eq(storefrontSections.id, sectionId))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Section not found" }, { status: 404 });
    }

    revalidatePath("/[lng]", "layout");
    revalidatePath("/admin/storefront");
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

/** DELETE /api/admin/storefront/sections/[sectionId] — cascades to its items. */
export async function DELETE(_request: Request, { params }: Params) {
  const { sectionId } = await params;
  try {
    const [deleted] = await db
      .delete(storefrontSections)
      .where(eq(storefrontSections.id, sectionId))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: "Section not found" }, { status: 404 });
    }

    revalidatePath("/[lng]", "layout");
    revalidatePath("/admin/storefront");
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
