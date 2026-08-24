import StoreHeader from "@/components/storefront/StoreHeader";
import StoreFooter from "@/components/storefront/StoreFooter";
import JsonLd from "@/components/storefront/JsonLd";
import MetaPixel from "@/components/storefront/MetaPixel";
import { organizationJsonLd, websiteJsonLd } from "@/lib/storefront/seo";

/**
 * The --font-dm-mono variable is declared on <html> by the root layout (only
 * for storefront requests) so Radix portals can resolve it too. This layout
 * just switches the theme on: [data-storefront] applies the font, ink colour
 * and white ground defined in globals.css.
 */
export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Deliberately read here and not in the root layout: the root layout is
  // shared with /admin, and this route group is exactly the storefront
  // boundary. Unset (dev, previews) renders nothing at all.
  const pixelId = process.env.FB_PIXEL_ID;

  return (
    <div data-storefront="" className="sf-body flex min-h-screen flex-col">
      {/* Identity + searchability, on every storefront page so a crawler that
          lands deep in the catalog still learns who the seller is. */}
      <JsonLd data={organizationJsonLd()} />
      <JsonLd data={websiteJsonLd()} />
      {pixelId && <MetaPixel pixelId={pixelId} />}
      <StoreHeader />
      {/* Offsets the fixed 64px nav. */}
      <main className="flex-1 pt-(--sf-nav-h)">{children}</main>
      <StoreFooter />
    </div>
  );
}
