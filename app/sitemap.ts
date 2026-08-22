import type { MetadataRoute } from "next";
import { getStorefrontProducts } from "@/lib/storefront/products";
import { absoluteUrl } from "@/lib/storefront/seo";

// The catalog changes whenever stock does, so the sitemap is rebuilt hourly
// rather than baked at build time.
export const revalidate = 3600;

/**
 * Static pages plus every live product. `getStorefrontProducts()` already
 * filters to in-stock and priced rows — exactly the set that should be
 * indexable, since an out-of-stock or unpriced variant 404s the buyer's intent.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/products"), changeFrequency: "daily", priority: 0.9 },
  ];

  let products: Awaited<ReturnType<typeof getStorefrontProducts>> = [];
  try {
    products = await getStorefrontProducts();
  } catch {
    // A DB blip should degrade the sitemap to the static pages, not 500 it —
    // a failing sitemap.xml is worse for crawling than a short one.
    return staticEntries;
  }

  return [
    ...staticEntries,
    ...products.map((product) => ({
      url: absoluteUrl(`/product/${encodeURIComponent(product.shoeId)}`),
      lastModified: new Date(product.newestAt),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
