import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/storefront/seo";

/**
 * Search crawlers and AI assistant crawlers are both welcome on the
 * storefront — being quotable by an assistant is the point. What stays out is
 * the unauthenticated admin dashboard, the API surface, and the parameterised
 * catalog URLs (every filter combination is the same page and would otherwise
 * burn crawl budget on duplicates; /products itself is still indexed).
 */
export default function robots(): MetadataRoute.Robots {
  const disallow = ["/admin", "/admin/", "/api/", "/order/", "/print-demo", "/test-upload"];

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [...disallow, "/products?*"],
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
