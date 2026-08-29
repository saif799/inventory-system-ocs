import { requireAdmin } from "@/lib/auth/guard";
﻿import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { shoeImages } from "@/lib/schema";
import { buildR2PublicUrl, deleteR2Object } from "@/lib/r2";
import { eq } from "drizzle-orm";

/**
 * POST /api/admin/images
 * Registers an image that was already uploaded directly to R2 via presigned URL.
 * Body: { shoeId, cloudflareImageId, altText?, sortOrder?, isPrimary? }
 *
 * The stored `url` is always derived server-side from the R2 object key. A `url`
 * in the body is ignored — the key is the single source of truth, so changing
 * R2_PUBLIC_URL (r2.dev -> custom domain) never leaves stale hosts in the DB.
 */
export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const body = await request.json();
    const { shoeId, cloudflareImageId, altText, sortOrder, isPrimary } = body;

    if (!shoeId || !cloudflareImageId) {
      return NextResponse.json(
        { error: "shoeId and cloudflareImageId are required." },
        { status: 400 }
      );
    }

    const url = buildR2PublicUrl(cloudflareImageId);

    // If this is being set as primary, unset any existing primary for this shoe first
    if (isPrimary) {
      await db
        .update(shoeImages)
        .set({ isPrimary: false })
        .where(eq(shoeImages.shoeId, shoeId));
    }

    const [inserted] = await db
      .insert(shoeImages)
      .values({
        shoeId,
        cloudflareImageId,
        url,
        altText: altText ?? null,
        sortOrder: sortOrder ?? 0,
        isPrimary: isPrimary ?? false,
      })
      .returning();

    return NextResponse.json(inserted, { status: 201 });
  } catch (error: any) {
    console.error("Failed to register image:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/images
 * Removes the image record from the DB and physically deletes the R2 object.
 * Body: { imageId }
 */
export async function DELETE(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { imageId } = await request.json();

    if (!imageId) {
      return NextResponse.json({ error: "imageId is required." }, { status: 400 });
    }

    // Fetch the row so we have the R2 key
    const [image] = await db
      .select()
      .from(shoeImages)
      .where(eq(shoeImages.id, imageId))
      .limit(1);

    if (!image) {
      return NextResponse.json({ error: "Image not found." }, { status: 404 });
    }

    // Physical R2 deletion first — if this fails we keep the DB row
    await deleteR2Object(image.cloudflareImageId);

    // Remove the DB record
    await db.delete(shoeImages).where(eq(shoeImages.id, imageId));

    return NextResponse.json({ message: "Image deleted successfully." });
  } catch (error: any) {
    console.error("Failed to delete image:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
