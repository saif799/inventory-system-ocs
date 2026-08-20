import { getStorefrontProducts } from "@/lib/storefront/products";

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
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() || "";
    const modelIdParam = searchParams.get("modelId") || "";
    const sizeParam = searchParams.get("size") || "";
    const minPriceParam = searchParams.get("minPrice");
    const maxPriceParam = searchParams.get("maxPrice");

    const modelIds = modelIdParam ? modelIdParam.split(",").filter(Boolean) : [];
    const sizes = sizeParam ? sizeParam.split(",").filter(Boolean) : [];

    let products = await getStorefrontProducts();

    if (q) {
      const lower = q.toLowerCase();
      products = products.filter(
        (p) =>
          p.modelName.toLowerCase().includes(lower) || p.color.toLowerCase().includes(lower),
      );
    }

    if (modelIds.length > 0) {
      products = products.filter((p) => modelIds.includes(p.modelId));
    }

    if (sizes.length > 0) {
      products = products.filter((p) => p.sizes.some((s) => sizes.includes(s.size) && s.quantity > 0));
    }

    if (minPriceParam) {
      const min = Number(minPriceParam);
      products = products.filter((p) => p.minPrice >= min);
    }

    if (maxPriceParam) {
      const max = Number(maxPriceParam);
      products = products.filter((p) => p.minPrice <= max);
    }

    return Response.json(products);
  } catch (error) {
    console.error("Failed to fetch storefront products:", error);
    return Response.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}
