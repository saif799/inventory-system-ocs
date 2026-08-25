import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/storefront/seo";
import { LOCALES } from "@/i18n.config";

/**
 * Search crawlers and AI assistant crawlers are both welcome on the
 * storefront — being quotable by an assistant is the point. What stays out is
 * the unauthenticated admin dashboard, the API surface, and the parameterised
 * catalog URLs (every filter combination is the same page and would otherwise
 * burn crawl budget on duplicates; /products itself is still indexed).
 *
 * Storefront paths are locale-prefixed, so the receipt and filter rules have to
 * be emitted once per locale — a bare "/order/" would match nothing now that
 * the real paths are /ar/order/... and /fr/order/....
 */
export default function robots(): MetadataRoute.Robots {
  const localised = (path: string) => LOCALES.map((lng) => `/${lng}${path}`);

  const disallow = [
    "/admin",
    "/admin/",
    "/api/",
    ...localised("/order/"),
    "/print-demo",
    "/test-upload",
  ];
  const filteredCatalog = localised("/products?*");

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [...disallow, ...filteredCatalog],
      },
      // Named explicitly so the assistant crawlers do not fall back to a
      // conservative default: we want the catalog and the FAQ answers cited.
      {
        userAgent: [
          "GPTBot",
          "OAI-SearchBot",
          "ChatGPT-User",
          "ClaudeBot",
          "Claude-User",
          "Claude-SearchBot",
          "anthropic-ai",
          "PerplexityBot",
          "Perplexity-User",
          "Google-Extended",
          "Applebot-Extended",
          "Bingbot",
        ],
        allow: "/",
        disallow,
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
