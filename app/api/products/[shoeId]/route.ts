import { NextResponse } from "next/server";
import { getStorefrontProductDetail } from "@/lib/storefront/products";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Params = { params: Promise<{ shoeId: string }> };

/**
 * GET /api/products/[shoeId]
 * Thin wrapper around lib/storefront/products.ts. Returns full product
 * detail: pricing, all images (primary-first), all sizes (including
 * zero-quantity ones, kept so they render struck-through).
 */
export async function GET(_req: Request, { params }: Params) {
  const { shoeId } = await params;
  try {
    const product = await getStorefrontProductDetail(shoeId);
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    return NextResponse.json(product);
  } catch (error) {
    console.error("Failed to fetch product:", error);
    return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 });
  }
}
