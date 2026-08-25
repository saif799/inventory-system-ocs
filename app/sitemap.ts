import type { MetadataRoute } from "next";
import { getStorefrontProducts } from "@/lib/storefront/products";
import { localeUrl } from "@/lib/storefront/seo";
import { DEFAULT_LOCALE, LOCALES, LOCALE_TAGS, type Locale } from "@/i18n.config";

// The catalog changes whenever stock does, so the sitemap is rebuilt hourly
// rather than baked at build time.
export const revalidate = 3600;

/**
 * Every page is listed once per locale, each entry carrying the full hreflang
 * set via `alternates.languages`. Google wants the alternates declared on both
 * sides of the pair, so the /ar and /fr rows are mirror images of each other
 * rather than one canonical row.
 */
function withAlternates(path: string, lng: Locale) {
  return {
    url: localeUrl(lng, path),
    alternates: {
      languages: {
        ...Object.fromEntries(
          LOCALES.map((locale) => [LOCALE_TAGS[locale], localeUrl(locale, path)]),
        ),
        "x-default": localeUrl(DEFAULT_LOCALE, path),
      },
    },
  };
}

/**
 * Static pages plus every live product. `getStorefrontProducts()` already
 * filters to in-stock and priced rows — exactly the set that should be
 * indexable, since an out-of-stock or unpriced variant 404s the buyer's intent.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = LOCALES.flatMap((lng) => [
    { ...withAlternates("/", lng), changeFrequency: "daily" as const, priority: 1 },
    {
      ...withAlternates("/products", lng),
      changeFrequency: "daily" as const,
      priority: 0.9,
    },
  ]);

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
    ...products.flatMap((product) =>
      LOCALES.map((lng) => ({
        ...withAlternates(
          `/product/${encodeURIComponent(product.shoeId)}`,
          lng,
        ),
        lastModified: new Date(product.newestAt),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
    ),
  ];
}
