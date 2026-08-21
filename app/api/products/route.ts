import { getStorefrontProducts, type StorefrontProductFilters } from "@/lib/storefront/products";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/products
 * Thin wrapper around lib/storefront/products.ts — kept for the storefront
 * components that still fetch over HTTP. Query params:
 *   q         - text search on modelName or color
 *   modelId   - filter by one or more modelIds (comma-separated)
 *   size      - filter by available size (comma-separated)
 *   minPrice  - minimum resolved price
 *   maxPrice  - maximum resolved price
 * All filtering is resolved in SQL by getStorefrontProducts.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() || "";
    const modelIdParam = searchParams.get("modelId") || "";
    const sizeParam = searchParams.get("size") || "";
    const minPriceParam = searchParams.get("minPrice");
    const maxPriceParam = searchParams.get("maxPrice");

    const filters: StorefrontProductFilters = {
      search: q || undefined,
      modelIds: modelIdParam ? modelIdParam.split(",").filter(Boolean) : undefined,
      sizes: sizeParam ? sizeParam.split(",").filter(Boolean) : undefined,
      minPrice: minPriceParam ? Number(minPriceParam) : undefined,
      maxPrice: maxPriceParam ? Number(maxPriceParam) : undefined,
    };

    const products = await getStorefrontProducts({ filters });

    return Response.json(products);
  } catch (error) {
    console.error("Failed to fetch storefront products:", error);
    return Response.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}
